import { test, describe } from 'node:test';
import assert from 'node:assert';
import { insertAfterCurrent } from '../src/lib/queueHelper.ts';
import type { MediaFile } from '../src/types/index.ts';

// Helper to create mock MediaFile
function makeMockFile(id: string, name: string, path: string): MediaFile {
  return {
    id,
    name,
    type: 'audio',
    path,
    size: 1024,
    addedAt: new Date().toISOString()
  };
}

describe('Queue Insertion Helper Tests', () => {
  const fileA = makeMockFile('1', 'Song A', '/media/songA.mp3');
  const fileB = makeMockFile('2', 'Song B', '/media/songB.mp3');
  const fileC = makeMockFile('3', 'Song C', '/media/songC.mp3');
  const fileD = makeMockFile('4', 'Song D', '/media/songD.mp3');
  const fileE = makeMockFile('5', 'Song E', '/media/songE.mp3');

  test('1. Normal Case: Add a new track next to the currently playing track', () => {
    // Current queue: A, B, C, D. B is playing (index 1). Adding E.
    const queue = [fileA, fileB, fileC, fileD];
    const current = fileB;
    const index = 1;

    const result = insertAfterCurrent(queue, current, index, fileE);

    // Expected: E inserted at index 2 -> [A, B, E, C, D]
    // queueIndex should remain 1 (pointing to B)
    assert.strictEqual(result.newQueue.length, 5);
    assert.strictEqual(result.newQueue[0].path, fileA.path);
    assert.strictEqual(result.newQueue[1].path, fileB.path);
    assert.strictEqual(result.newQueue[2].path, fileE.path);
    assert.strictEqual(result.newQueue[3].path, fileC.path);
    assert.strictEqual(result.newQueue[4].path, fileD.path);
    assert.strictEqual(result.newQueueIndex, 1);
  });

  test('2. Boundary Case: Add a track that already exists in the queue (Duplicate handling)', () => {
    // Current queue: A, B, C, D. B is playing (index 1). Adding D next.
    // D should be removed from end and placed after B.
    const queue = [fileA, fileB, fileC, fileD];
    const current = fileB;
    const index = 1;

    const result = insertAfterCurrent(queue, current, index, fileD);

    // Expected: [A, B, D, C]
    // queueIndex should remain 1 (pointing to B)
    assert.strictEqual(result.newQueue.length, 4);
    assert.strictEqual(result.newQueue[0].path, fileA.path);
    assert.strictEqual(result.newQueue[1].path, fileB.path);
    assert.strictEqual(result.newQueue[2].path, fileD.path);
    assert.strictEqual(result.newQueue[3].path, fileC.path);
    assert.strictEqual(result.newQueueIndex, 1);
  });

  test('3. Boundary Case: Add a track that is already in queue before current playing track', () => {
    // Current queue: A, B, C, D. B is playing (index 1). Adding A next.
    // A should be removed from start and placed after B.
    const queue = [fileA, fileB, fileC, fileD];
    const current = fileB;
    const index = 1;

    const result = insertAfterCurrent(queue, current, index, fileA);

    // Expected: [B, A, C, D]
    // Since A was removed from index 0, B shifted from index 1 to index 0.
    // newQueueIndex must be 0 to match B's new position!
    assert.strictEqual(result.newQueue.length, 4);
    assert.strictEqual(result.newQueue[0].path, fileB.path);
    assert.strictEqual(result.newQueue[1].path, fileA.path);
    assert.strictEqual(result.newQueue[2].path, fileC.path);
    assert.strictEqual(result.newQueue[3].path, fileD.path);
    assert.strictEqual(result.newQueueIndex, 0);
  });

  test('4. Exception Case: Add a track to an empty queue', () => {
    const queue: MediaFile[] = [];
    const current = null;
    const index = 0;

    const result = insertAfterCurrent(queue, current, index, fileE);

    // Expected: [E] with index 0
    assert.strictEqual(result.newQueue.length, 1);
    assert.strictEqual(result.newQueue[0].path, fileE.path);
    assert.strictEqual(result.newQueueIndex, 0);
  });

  test('5. Exception Case: Add a track when currentFile is null but queue is not empty', () => {
    const queue = [fileA, fileB, fileC];
    const current = null;
    const index = 1;

    const result = insertAfterCurrent(queue, current, index, fileE);

    // Expected: [A, E, B, C]
    // Since currentFile is null, falls back to queueIndex (1)
    assert.strictEqual(result.newQueue.length, 4);
    assert.strictEqual(result.newQueue[0].path, fileA.path);
    assert.strictEqual(result.newQueue[1].path, fileE.path);
    assert.strictEqual(result.newQueue[2].path, fileB.path);
    assert.strictEqual(result.newQueue[3].path, fileC.path);
    assert.strictEqual(result.newQueueIndex, 1);
  });
});
