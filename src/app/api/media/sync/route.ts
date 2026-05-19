import { NextResponse } from 'next/server';
import { getMediaFilesAsync, addMediaFileAsync } from '../../../../lib/store';
import { scanMediaDirectory, extractMetadata, getMediaType } from '../../../../lib/storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/media/sync - 파일시스템 동기화
 * 
 * 목적:
 * 기존 GET /api/media 에서 매 요청마다 수행하던 파일시스템 스캔과
 * 메타데이터 파싱을 분리하여, 읽기 경로(GET)의 I/O 병목을 제거합니다.
 * 
 * 동작:
 * 1. public/media 디렉토리를 비동기적으로 스캔
 * 2. media.json에 없는 파일만 필터링
 * 3. 해당 파일들의 메타데이터를 추출하여 media.json에 추가
 * 
 * 호출 시점:
 * - 서버 시작 시 (선택적)
 * - 관리자 수동 호출
 * - 프론트엔드에서 "새로고침" 버튼 클릭 시
 */
export async function POST() {
  try {
    const scannedFiles = await scanMediaDirectory();
    const existingMedia = await getMediaFilesAsync();
    const existingNames = new Set(existingMedia.map(m => m.name));

    // media.json에 없는 새 파일만 필터링
    const newFiles = scannedFiles.filter(f => !existingNames.has(f.name));

    if (newFiles.length === 0) {
      return NextResponse.json({
        synced: 0,
        total: existingMedia.length,
        message: '모든 파일이 이미 동기화되어 있습니다.',
      });
    }

    // 각 새 파일에 대해 메타데이터 추출 후 저장
    const results = [];
    for (const file of newFiles) {
      const mediaId = `media_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullPath = `${process.cwd()}/public${file.path}`;

      let artist: string | undefined;
      let coverArt: string | undefined;

      if (file.type === 'audio') {
        const metadata = await extractMetadata(fullPath, mediaId);
        artist = metadata.artist;
        coverArt = metadata.coverArt?.coverPath;
      }

      const newMedia = {
        id: mediaId,
        name: file.name,
        type: file.type as 'audio' | 'video',
        path: file.path,
        size: file.size,
        addedAt: file.addedAt,
        artist,
        coverArt,
      };

      await addMediaFileAsync(newMedia);
      results.push(newMedia);
    }

    return NextResponse.json({
      synced: results.length,
      total: existingMedia.length + results.length,
      message: `${results.length}개의 새 파일이 동기화되었습니다.`,
      files: results,
    });
  } catch (e: any) {
    console.error('Sync error:', e);
    return NextResponse.json(
      { error: e.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
