import { NextResponse } from 'next/server';
import { getMediaFiles } from '../../../lib/store';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const filename = file.name;
    const targetPath = path.join(process.cwd(), 'public', 'media', filename);
    fs.writeFileSync(targetPath, Buffer.from(bytes));
    // Scan public/media folder again to update media.json
    const mediaDir = path.join(process.cwd(), 'public', 'media');
    if (fs.existsSync(mediaDir)) {
      const files = fs.readdirSync(mediaDir).filter(f => f.endsWith('.mp3') || f.endsWith('.mp4') || f.endsWith('.wav') || f.endsWith('.webm') || f.endsWith('.ogg') || f.endsWith('.m4a'));
      const scanned = files.map((f, i) => {
        const fullPath = path.join(mediaDir, f);
        const stat = fs.statSync(fullPath);
        return {
          id: `media_${i}_${Date.now()}`,
          name: f,
          type: f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg') || f.endsWith('.m4a') ? 'audio' : 'video',
          path: `/media/${f}`,
          size: stat.size,
          addedAt: new Date(stat.mtime).toISOString(),
        };
      });
      return NextResponse.json({ success: true, files: scanned });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  const mediaFiles = getMediaFiles();
  
  // Also scan public/media folder
  const mediaDir = path.join(process.cwd(), 'public', 'media');
  if (fs.existsSync(mediaDir)) {
    const files = fs.readdirSync(mediaDir);
    const scanned = files.map(f => {
      const fullPath = path.join(mediaDir, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f,
        type: f.endsWith('.mp3') || f.endsWith('.wav') ? 'audio' : 'video',
        path: `/media/${f}`,
        size: stat.size,
        addedAt: stat.birthtime.toISOString(),
      };
    });
    return NextResponse.json([...mediaFiles, ...scanned]);
  }
  
  return NextResponse.json(mediaFiles);
}