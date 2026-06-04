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

/**
 * Removes a track from the queue at a specific index.
 * Adjusts the active queue index and returns control flags for playing next or stopping.
 * 
 * @param queue Current list of tracks in the queue
 * @param queueIndex The index of the currently playing track
 * @param indexToRemove The index of the track to remove from the queue
 * @param repeatMode The active repeat mode ('none', 'all', 'one')
 */
export function removeTrackFromQueue(
  queue: MediaFile[],
  queueIndex: number,
  indexToRemove: number,
  repeatMode: 'none' | 'all' | 'one' = 'none'
): {
  newQueue: MediaFile[];
  newQueueIndex: number;
  shouldStop: boolean;
  shouldPlayNext: boolean;
} {
  if (indexToRemove < 0 || indexToRemove >= queue.length) {
    return {
      newQueue: queue,
      newQueueIndex: queueIndex,
      shouldStop: false,
      shouldPlayNext: false
    };
  }

  if (queue.length === 1) {
    return {
      newQueue: [],
      newQueueIndex: 0,
      shouldStop: true,
      shouldPlayNext: false
    };
  }

  const newQueue = queue.filter((_, idx) => idx !== indexToRemove);
  let newQueueIndex = queueIndex;
  let shouldStop = false;
  let shouldPlayNext = false;

  if (indexToRemove === queueIndex) {
    // Removing the currently playing track
    if (indexToRemove === queue.length - 1) {
      // Removing the last track in the queue
      if (repeatMode === 'all') {
        newQueueIndex = 0;
        shouldPlayNext = true;
      } else {
        newQueueIndex = 0;
        shouldStop = true;
      }
    } else {
      // Removing a track in the middle of the queue
      // The next track takes the same index
      newQueueIndex = indexToRemove;
      shouldPlayNext = true;
    }
  } else if (indexToRemove < queueIndex) {
    // Removing a track before the currently playing track
    newQueueIndex = queueIndex - 1;
  } else {
    // Removing a track after the currently playing track
    newQueueIndex = queueIndex;
  }

  return {
    newQueue,
    newQueueIndex,
    shouldStop,
    shouldPlayNext
  };
}

/**
 * Inserts a file at the end of the queue.
 * Handles removing duplicates of the file from other positions in the queue
 * and shifts the active index if needed.
 * 
 * @param queue Current list of tracks in the queue
 * @param currentFile The currently playing MediaFile
 * @param queueIndex The index of the currently playing track in the queue
 * @param fileToInsert The MediaFile to be queued at the end
 */
export function insertAtQueueEnd(
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

  // Index of currently playing file in filtered list
  let newCurrentIndex = queueIndex;
  if (currentFile) {
    newCurrentIndex = filtered.findIndex(f => f.path === currentFile.path);
    if (newCurrentIndex === -1) {
      newCurrentIndex = Math.min(Math.max(0, queueIndex), filtered.length);
    }
  } else {
    newCurrentIndex = Math.min(Math.max(0, queueIndex), filtered.length);
  }

  const newQueue = [...filtered, fileToInsert];

  return {
    newQueue,
    newQueueIndex: newCurrentIndex
  };
}

