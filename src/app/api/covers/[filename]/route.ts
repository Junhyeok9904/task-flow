import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/covers/[filename] - 커버아트 이미지 서빙
 * 
 * Next.js standalone 모드에서는 빌드 후 추가된 public/ 파일이
 * 정적으로 서빙되지 않으므로, 런타임에 저장된 커버아트 이미지를
 * 이 API를 통해 서빙합니다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const coversDir = path.join(process.cwd(), 'public', 'covers');
    const filePath = path.join(coversDir, filename);

    // Path traversal 방지
    if (!filePath.startsWith(coversDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
