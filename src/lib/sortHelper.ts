import type { MediaFile } from '../types';

export function sortSongs(
  songs: MediaFile[],
  sortBy: 'name' | 'size' | 'added',
  sortOrder: 'asc' | 'desc'
): MediaFile[] {
  return [...songs].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'name') {
      const nameA = a.name || '';
      const nameB = b.name || '';
      comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
    } else if (sortBy === 'size') {
      const sizeA = a.size ?? 0;
      const sizeB = b.size ?? 0;
      comparison = sizeA - sizeB;
    } else if (sortBy === 'added') {
      const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      comparison = timeA - timeB;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}
