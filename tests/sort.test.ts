import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sortSongs } from '../src/lib/sortHelper.ts';
import type { MediaFile } from '../src/types';

describe('Song List Sorting Utility Tests', () => {
  const mockSongs: MediaFile[] = [
    { id: '1', name: 'Zedd - Clarity.mp3', type: 'audio', path: '/media/Zedd - Clarity.mp3', size: 1024 * 1024 * 8, addedAt: '2026-05-01T10:00:00Z' },
    { id: '2', name: 'Avicii - Levels.mp3', type: 'audio', path: '/media/Avicii - Levels.mp3', size: 1024 * 1024 * 5, addedAt: '2026-05-10T12:00:00Z' },
    { id: '3', name: 'Kygo - Firestone.mp3', type: 'audio', path: '/media/Kygo - Firestone.mp3', size: 1024 * 1024 * 12, addedAt: '2026-05-05T09:00:00Z' }
  ];

  test('1. Sort by name in asc and desc directions (Normal Case)', () => {
    // Ascending
    const sortedAsc = sortSongs(mockSongs, 'name', 'asc');
    assert.strictEqual(sortedAsc[0].name, 'Avicii - Levels.mp3');
    assert.strictEqual(sortedAsc[1].name, 'Kygo - Firestone.mp3');
    assert.strictEqual(sortedAsc[2].name, 'Zedd - Clarity.mp3');

    // Descending
    const sortedDesc = sortSongs(mockSongs, 'name', 'desc');
    assert.strictEqual(sortedDesc[0].name, 'Zedd - Clarity.mp3');
    assert.strictEqual(sortedDesc[1].name, 'Kygo - Firestone.mp3');
    assert.strictEqual(sortedDesc[2].name, 'Avicii - Levels.mp3');
  });

  test('2. Sort by size in asc and desc directions (Normal Case)', () => {
    // Ascending
    const sortedAsc = sortSongs(mockSongs, 'size', 'asc');
    assert.strictEqual(sortedAsc[0].name, 'Avicii - Levels.mp3'); // 5MB
    assert.strictEqual(sortedAsc[1].name, 'Zedd - Clarity.mp3');  // 8MB
    assert.strictEqual(sortedAsc[2].name, 'Kygo - Firestone.mp3'); // 12MB

    // Descending
    const sortedDesc = sortSongs(mockSongs, 'size', 'desc');
    assert.strictEqual(sortedDesc[0].name, 'Kygo - Firestone.mp3');
    assert.strictEqual(sortedDesc[1].name, 'Zedd - Clarity.mp3');
    assert.strictEqual(sortedDesc[2].name, 'Avicii - Levels.mp3');
  });

  test('3. Sort by addedAt date in asc and desc directions (Normal Case)', () => {
    // Ascending (Oldest first)
    const sortedAsc = sortSongs(mockSongs, 'added', 'asc');
    assert.strictEqual(sortedAsc[0].name, 'Zedd - Clarity.mp3'); // May 1
    assert.strictEqual(sortedAsc[1].name, 'Kygo - Firestone.mp3'); // May 5
    assert.strictEqual(sortedAsc[2].name, 'Avicii - Levels.mp3'); // May 10

    // Descending (Newest first)
    const sortedDesc = sortSongs(mockSongs, 'added', 'desc');
    assert.strictEqual(sortedDesc[0].name, 'Avicii - Levels.mp3');
    assert.strictEqual(sortedDesc[1].name, 'Kygo - Firestone.mp3');
    assert.strictEqual(sortedDesc[2].name, 'Zedd - Clarity.mp3');
  });

  test('4. Handle missing size or addedAt property (Boundary Case)', () => {
    const boundarySongs: MediaFile[] = [
      { id: '1', name: 'Song A.mp3', type: 'audio', path: '/media/Song A.mp3', size: 5000, addedAt: '' }, // missing addedAt
      { id: '2', name: 'Song B.mp3', type: 'audio', path: '/media/Song B.mp3', size: 0, addedAt: '2026-05-15T00:00:00Z' }, // size is 0
      { id: '3', name: 'Song C.mp3', type: 'audio', path: '/media/Song C.mp3', size: (undefined as any), addedAt: '2026-05-20T00:00:00Z' } // size is undefined
    ];

    // Sort by size ascending: Song C (undefined -> 0) or Song B (0) should be at the bottom/top.
    // Our sort: size ?? 0. So Song B and Song C both resolve to 0. Song A is 5000.
    const sortedSizeAsc = sortSongs(boundarySongs, 'size', 'asc');
    assert.strictEqual(sortedSizeAsc[2].name, 'Song A.mp3'); // 5000 is largest, so it should be last in asc

    // Sort by added date ascending: Song A has empty string (invalid date -> getTime() = 0), B (May 15), C (May 20)
    const sortedAddedAsc = sortSongs(boundarySongs, 'added', 'asc');
    assert.strictEqual(sortedAddedAsc[0].name, 'Song A.mp3'); // 0 timestamp is oldest
    assert.strictEqual(sortedAddedAsc[1].name, 'Song B.mp3');
    assert.strictEqual(sortedAddedAsc[2].name, 'Song C.mp3');
  });

  test('5. Multilingual and special character names sorting (Exception Case)', () => {
    const multilingualSongs: MediaFile[] = [
      { id: '1', name: '홍길동 - 활빈당.mp3', type: 'audio', path: '/media/hong.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' },
      { id: '2', name: '아이유 - 밤편지.mp3', type: 'audio', path: '/media/iu.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' },
      { id: '3', name: 'Zedd - Clarity.mp3', type: 'audio', path: '/media/zedd.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' },
      { id: '4', name: 'Avicii - Wake Me Up.mp3', type: 'audio', path: '/media/avicii.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' },
      { id: '5', name: '20ct.mp3', type: 'audio', path: '/media/20ct.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' },
      { id: '6', name: '10cm.mp3', type: 'audio', path: '/media/10cm.mp3', size: 1000, addedAt: '2026-05-01T00:00:00Z' }
    ];

    const sortedAsc = sortSongs(multilingualSongs, 'name', 'asc');

    // 1. Check numbers group order
    assert.strictEqual(sortedAsc[0].name, '10cm.mp3');
    assert.strictEqual(sortedAsc[1].name, '20ct.mp3');

    // 2. Check English group order
    const englishSongs = sortedAsc.filter(s => /^[a-zA-Z]/.test(s.name));
    assert.strictEqual(englishSongs[0].name, 'Avicii - Wake Me Up.mp3');
    assert.strictEqual(englishSongs[1].name, 'Zedd - Clarity.mp3');

    // 3. Check Korean group order
    const koreanSongs = sortedAsc.filter(s => /^[가-힣]/.test(s.name));
    assert.strictEqual(koreanSongs[0].name, '아이유 - 밤편지.mp3');
    assert.strictEqual(koreanSongs[1].name, '홍길동 - 활빈당.mp3');
  });
});
