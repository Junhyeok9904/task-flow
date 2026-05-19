import { NextResponse } from 'next/server';
import { getMediaFilesAsync } from '../../../../lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/music/search - 미디어 파일 검색
 * 
 * 개선사항:
 * 1. 파일시스템 스캔(readdirSync + statSync) 완전 제거
 *    - 기존: 매 검색마다 전체 public/media/ 디렉토리 스캔
 *    - 개선: media.json의 인덱싱된 데이터만 사용
 * 2. 비동기 데이터 읽기로 이벤트 루프 블로킹 방지
 * 3. 검색 로직은 기존과 동일하게 유지 (하위 호환)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const typeFilter = searchParams.get('type'); // 'audio' | 'video'

    // ─── 데이터 소스: media.json만 사용 ────────────────────────
    // 기존: getMediaFiles() + fs.readdirSync() 이중 소스 병합
    // 개선: media.json 단일 소스 (파일시스템 스캔은 /api/media/sync로 분리)
    let allTracks = await getMediaFilesAsync();

    // Filter by type if provided
    if (typeFilter) {
      allTracks = allTracks.filter(t => t.type === typeFilter);
    }

    // If query is empty, return all sorted by date
    if (!query) {
      allTracks.sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
      return NextResponse.json(allTracks);
    }

    // Smart scoring search
    const queryWords = query.split(/\s+/).filter(Boolean);
    const scoredTracks = allTracks.map(track => {
      const name = (track.name || '').toLowerCase();
      const trackPath = (track.path || '').toLowerCase();
      const artist = (track.artist || '').toLowerCase();
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
        // Artist match
        if (artist.includes(word)) score += 40;
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
    console.error('Search error:', e);
    return NextResponse.json({ error: e.message || 'Search failed' }, { status: 500 });
  }
}
