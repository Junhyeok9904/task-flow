import type { MediaFile } from '../types/index.ts';

/**
 * Inserts a file into the queue right after the currently playing song.
 * Handles removing duplicates of the file from other positions in the queue
 * and shifts the active index if needed.
 * 
 * @param queue Current list of tracks in the queue
 * @param currentFile The currently playing MediaFile
 * @param queueIndex The index of the currently playing track in the queue
 * @param fileToInsert The MediaFile to be queued next
 */
export function insertAfterCurrent(
  queue: MediaFile[],
  currentFile: MediaFile | null,
  queueIndex: number,
  fileToInsert: MediaFile
): { newQueue: MediaFile[]; newQueueIndex: number } {
  // If queue is empty, return it as the only element
  if (queue.length === 0) {
    return { newQueue: [fileToInsert], newQueueIndex: 0 };
  }

  // Remove existing occurrences of fileToInsert to prevent duplicates
  const filtered = queue.filter(f => f.path !== fileToInsert.path);

  // If there's no current file, insert at current queueIndex
  if (!currentFile) {
    const newQueue = [...filtered];
    const insertPos = Math.min(Math.max(0, queueIndex), newQueue.length);
    newQueue.splice(insertPos, 0, fileToInsert);
    return { newQueue, newQueueIndex: insertPos };
  }

  // Find index of current playing file in the filtered list
  let newCurrentIndex = filtered.findIndex(f => f.path === currentFile.path);
  if (newCurrentIndex === -1) {
    // Fallback: If current file is not found, default to queueIndex (within bounds)
    newCurrentIndex = Math.min(Math.max(0, queueIndex), filtered.length);
  }

  const newQueue = [...filtered];
  const insertPos = newCurrentIndex + 1;
  newQueue.splice(insertPos, 0, fileToInsert);

  return {
    newQueue,
    newQueueIndex: newCurrentIndex
  };
}
