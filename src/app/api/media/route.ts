import { NextResponse } from 'next/server';
import { getMediaFiles, addMediaFile, saveMediaFiles } from '../../../lib/store';
import * as fs from 'fs';
import * as path from 'path';
import { parseBuffer, parseFile } from 'music-metadata';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    
    // Server-side validation
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 });
    }
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit.' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name;
    const targetPath = path.join(process.cwd(), 'public', 'media', filename);
    fs.writeFileSync(targetPath, buffer);

    // Parse metadata
    let artist = undefined;
    let coverArt = undefined;
    try {
      if (file.type.startsWith('audio/')) {
        const metadata = await parseBuffer(buffer, { mimeType: file.type });
        if (metadata.common.artist) {
          artist = metadata.common.artist;
        }
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          coverArt = `data:${pic.format};base64,${pic.data.toString('base64')}`;
        }
      }
    } catch (err) {
      console.error('Metadata parsing failed:', err);
    }

    const stat = fs.statSync(targetPath);
    const newMedia = {
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: filename,
      type: file.type.startsWith('audio') ? 'audio' : 'video' as 'audio' | 'video',
      path: `/media/${filename}`,
      size: stat.size,
      addedAt: new Date(stat.mtime).toISOString(),
      artist,
      coverArt
    };

    // Check if it already exists in store, if so update it, else add it.
    const allMedia = getMediaFiles();
    const existingIndex = allMedia.findIndex(m => m.name === filename);
    if (existingIndex >= 0) {
      allMedia[existingIndex] = { ...allMedia[existingIndex], ...newMedia };
      saveMediaFiles(allMedia);
    } else {
      addMediaFile(newMedia);
    }

    // Return the updated list from store plus any raw files not in store
    return NextResponse.json({ success: true, files: [newMedia] }); // Returning just success and the new file is enough for the client to reload
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
    const newFiles = files.filter(f => !mediaFiles.some(m => m.name === f) && (f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.mp4')));
    
    if (newFiles.length > 0) {
      const scanned = await Promise.all(newFiles.map(async f => {
        const fullPath = path.join(mediaDir, f);
        const stat = fs.statSync(fullPath);
        
        let artist = undefined;
        let coverArt = undefined;
        try {
          if (f.endsWith('.mp3') || f.endsWith('.wav')) {
            const metadata = await parseFile(fullPath);
            if (metadata.common.artist) {
              artist = metadata.common.artist;
            }
            if (metadata.common.picture && metadata.common.picture.length > 0) {
              const pic = metadata.common.picture[0];
              coverArt = `data:${pic.format};base64,${pic.data.toString('base64')}`;
            }
          }
        } catch (e) {
          console.error(`Metadata parsing failed for ${f}:`, e);
        }

        const newMedia = {
          id: `media_scanned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: f,
          type: f.endsWith('.mp3') || f.endsWith('.wav') ? 'audio' : 'video' as 'audio' | 'video',
          path: `/media/${f}`,
          size: stat.size,
          addedAt: stat.birthtime.toISOString(),
          artist,
          coverArt
        };
        
        addMediaFile(newMedia);
        return newMedia;
      }));
      
      return NextResponse.json([...mediaFiles, ...scanned]);
    }
  }
  
  return NextResponse.json(mediaFiles);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    if (!filename) return NextResponse.json({ error: 'No filename provided' }, { status: 400 });

    const targetPath = path.join(process.cwd(), 'public', 'media', filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return NextResponse.json({ success: true, message: 'File deleted successfully' });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Deletion failed' }, { status: 500 });
  }
}