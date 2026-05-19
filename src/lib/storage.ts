/**
 * Storage Abstraction Layer
 * 
 * 파일 저장/삭제/커버아트 추출을 추상화하여
 * 향후 R2/S3/GCS 등 외부 오브젝트 스토리지로의 전환을 용이하게 합니다.
 * 
 * 현재 구현: LocalStorageAdapter (로컬 파일시스템)
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { parseFile } from 'music-metadata';

// ─── Configuration ───────────────────────────────────────────────
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
const COVERS_DIR = path.join(process.cwd(), 'public', 'covers');

// Ensure directories exist at module load time
for (const dir of [MEDIA_DIR, COVERS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Types ───────────────────────────────────────────────────────
export interface StorageResult {
  filePath: string;        // 저장된 파일의 서빙 경로 (예: /media/track.mp3)
  absolutePath: string;    // 절대 경로
  size: number;
}

export interface CoverArtResult {
  coverPath: string;       // 커버아트 서빙 경로 (예: /covers/id.jpeg)
  format: string;          // MIME format
}

export interface MediaMetadata {
  artist?: string;
  album?: string;
  title?: string;
  duration?: number;
  coverArt?: CoverArtResult;
}

export interface UploadResult {
  storage: StorageResult;
  metadata: MediaMetadata;
}

// ─── File Size Limit ─────────────────────────────────────────────
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// ─── MIME Type Validation ────────────────────────────────────────
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma']);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.avi', '.mov']);
const ALLOWED_EXTENSIONS = new Set([...ALLOWED_AUDIO_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS]);

export function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export function getMediaType(filename: string): 'audio' | 'video' {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_AUDIO_EXTENSIONS.has(ext) ? 'audio' : 'video';
}

// ─── Stream-Based File Upload ────────────────────────────────────
/**
 * 스트림 기반으로 파일을 디스크에 저장합니다.
 * 
 * 기존 Buffer.from(await file.arrayBuffer()) 방식은 파일 전체를 
 * V8 heap에 적재하여 50MB 파일 시 ~100MB 메모리를 소비합니다.
 * 
 * 이 함수는 Web API File → Node.js Readable → fs.createWriteStream
 * pipeline을 구성하여 청크(64KB) 단위로 디스크에 직접 기록합니다.
 * 메모리 사용량: ~2MB (버퍼 크기 고정)
 * 
 * 실패 시 부분 저장된 파일을 자동 정리합니다.
 */
export async function saveFileStream(file: File, filename: string): Promise<StorageResult> {
  // Validate
  if (!isAllowedExtension(filename)) {
    throw new Error(`허용되지 않는 파일 확장자입니다: ${path.extname(filename)}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 제한(${MAX_FILE_SIZE / 1024 / 1024}MB)을 초과합니다.`);
  }

  const targetPath = path.join(MEDIA_DIR, filename);
  const writeStream = fs.createWriteStream(targetPath);

  try {
    // Web API File.stream() → ReadableStream → Node.js Readable
    const webStream = file.stream();
    const nodeReadable = Readable.fromWeb(webStream as any);
    
    // pipeline은 에러 시 자동으로 스트림을 destroy합니다
    await pipeline(nodeReadable, writeStream);

    const stat = await fsp.stat(targetPath);
    return {
      filePath: `/media/${filename}`,
      absolutePath: targetPath,
      size: stat.size,
    };
  } catch (err) {
    // 실패 시 부분 저장 파일 정리
    await cleanupFile(targetPath);
    throw err;
  }
}

// ─── Cover Art Extraction & Storage ──────────────────────────────
/**
 * 오디오 파일에서 앨범 아트를 추출하고 별도 이미지 파일로 저장합니다.
 * 
 * 기존 방식: base64 문자열을 media.json에 직접 삽입
 * - 500KB 이미지 × 100트랙 = 50MB JSON → API 응답 5초+ 지연
 * 
 * 개선 방식: public/covers/{mediaId}.{ext} 로 이미지 파일 분리 저장
 * - media.json에는 URL 경로만 저장 → JSON 크기 99.97% 감소
 * - 브라우저가 이미지를 별도 요청으로 캐싱 → 네트워크 효율 극대화
 */
export async function extractAndSaveCoverArt(
  absoluteFilePath: string,
  mediaId: string
): Promise<CoverArtResult | null> {
  try {
    const metadata = await parseFile(absoluteFilePath);
    const pictures = metadata.common.picture;

    if (!pictures || pictures.length === 0) {
      return null;
    }

    const pic = pictures[0];
    // MIME에서 확장자 추출 (예: image/jpeg → jpeg)
    const ext = pic.format.replace('image/', '').replace('jpg', 'jpeg');
    const coverFilename = `${mediaId}.${ext}`;
    const coverPath = path.join(COVERS_DIR, coverFilename);

    await fsp.writeFile(coverPath, pic.data);

    return {
      coverPath: `/api/covers/${coverFilename}`,
      format: pic.format,
    };
  } catch (err) {
    console.error(`Cover art extraction failed for ${absoluteFilePath}:`, err);
    return null;
  }
}

/**
 * 오디오 파일에서 메타데이터(아티스트, 앨범, 제목, 재생시간)를 추출합니다.
 * 커버아트 추출도 함께 수행합니다.
 */
export async function extractMetadata(
  absoluteFilePath: string,
  mediaId: string
): Promise<MediaMetadata> {
  const result: MediaMetadata = {};

  try {
    const metadata = await parseFile(absoluteFilePath);

    if (metadata.common.artist) result.artist = metadata.common.artist;
    if (metadata.common.album) result.album = metadata.common.album;
    if (metadata.common.title) result.title = metadata.common.title;
    if (metadata.format.duration) result.duration = metadata.format.duration;

    // 커버아트 추출 (별도 파일로 저장)
    const coverResult = await extractAndSaveCoverArt(absoluteFilePath, mediaId);
    if (coverResult) {
      result.coverArt = coverResult;
    }
  } catch (err) {
    console.error(`Metadata extraction failed for ${absoluteFilePath}:`, err);
  }

  return result;
}

// ─── File Deletion ───────────────────────────────────────────────
/**
 * 미디어 파일과 연관된 커버아트를 함께 삭제합니다.
 */
export async function deleteMediaFile(filename: string, mediaId?: string): Promise<boolean> {
  const targetPath = path.join(MEDIA_DIR, filename);

  try {
    await fsp.access(targetPath);
    await fsp.unlink(targetPath);
  } catch {
    return false;
  }

  // 커버아트도 정리 (있으면)
  if (mediaId) {
    await cleanupCoverArt(mediaId);
  }

  return true;
}

/**
 * 특정 mediaId에 해당하는 커버아트 파일을 삭제합니다.
 */
async function cleanupCoverArt(mediaId: string): Promise<void> {
  try {
    const files = await fsp.readdir(COVERS_DIR);
    for (const file of files) {
      if (file.startsWith(mediaId)) {
        await fsp.unlink(path.join(COVERS_DIR, file)).catch(() => {});
      }
    }
  } catch {
    // covers 디렉토리가 없으면 무시
  }
}

/**
 * 부분 저장된 파일을 정리합니다.
 */
async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fsp.access(filePath);
    await fsp.unlink(filePath);
  } catch {
    // 파일이 없으면 무시
  }
}

// ─── File System Scan (동기화용) ─────────────────────────────────
/**
 * public/media 디렉토리를 비동기적으로 스캔하여 파일 목록을 반환합니다.
 * 
 * 주의: 이 함수는 GET /api/media 핫 경로가 아닌
 * POST /api/media/sync 백그라운드 동기화 루틴에서만 호출해야 합니다.
 */
export async function scanMediaDirectory(): Promise<Array<{
  name: string;
  type: 'audio' | 'video';
  path: string;
  size: number;
  addedAt: string;
}>> {
  try {
    const files = await fsp.readdir(MEDIA_DIR);
    const results = [];

    for (const filename of files) {
      if (!isAllowedExtension(filename)) continue;

      const fullPath = path.join(MEDIA_DIR, filename);
      const stat = await fsp.stat(fullPath);

      results.push({
        name: filename,
        type: getMediaType(filename),
        path: `/media/${filename}`,
        size: stat.size,
        addedAt: stat.birthtime.toISOString(),
      });
    }

    return results;
  } catch {
    return [];
  }
}
