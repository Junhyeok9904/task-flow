import { NextResponse } from 'next/server';
import { getMediaFiles } from '../../../../lib/store';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const typeFilter = searchParams.get('type'); // 'audio' | 'video'

    // Gather all media files
    const mediaFiles = getMediaFiles() || [];
    let scanned: any[] = [];

    const mediaDir = path.join(process.cwd(), 'public', 'media');
    if (fs.existsSync(mediaDir)) {
      const files = fs.readdirSync(mediaDir);
      scanned = files.map(f => {
        const fullPath = path.join(mediaDir, f);
        const stat = fs.statSync(fullPath);
        return {
          name: f,
          type: f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg') || f.endsWith('.m4a') ? 'audio' : 'video',
          path: `/media/${f}`,
          size: stat.size,
          addedAt: stat.birthtime.toISOString(),
        };
      });
    }

    // Merge lists by unique path
    const pathMap = new Map<string, any>();
    [...mediaFiles, ...scanned].forEach(item => {
      pathMap.set(item.path, item);
    });
    let allTracks = Array.from(pathMap.values());

    // Filter by type if provided
    if (typeFilter) {
      allTracks = allTracks.filter(t => t.type === typeFilter);
    }

    // If query is empty, return all (or top 100) sorted by date
    if (!query) {
      allTracks.sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
      return NextResponse.json(allTracks);
    }

    // Smart scoring search
    const queryWords = query.split(/\s+/).filter(Boolean);
    const scoredTracks = allTracks.map(track => {
      const name = (track.name || '').toLowerCase();
      const trackPath = (track.path || '').toLowerCase();
      let score = 0;

      queryWords.forEach(word => {
        // Exact name match bonus
        if (name === word) score += 100;
        // Exact substring match
        else if (name.includes(word)) {
          score += 50;
          // Prefix bonus
          if (name.startsWith(word)) score += 20;
        }
        // Extension/type match
        if (trackPath.includes(word)) score += 10;
      });

      return { ...track, score };
    }).filter(t => t.score > 0);

    // Sort by matching score descending
    scoredTracks.sort((a, b) => b.score - a.score);

    // Remove score field before returning
    const results = scoredTracks.map(({ score, ...track }) => track);

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Search failed' }, { status: 500 });
  }
}
