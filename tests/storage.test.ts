import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { deleteMediaFile } from '../src/lib/storage.ts';

describe('Storage Security Tests (Path Traversal Prevention)', () => {
  const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');
  const dummyFile = 'temp-test-file.mp3';
  const dummyPath = path.join(MEDIA_DIR, dummyFile);

  before(() => {
    // Create a temporary media file for normal/boundary testing
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
    fs.writeFileSync(dummyPath, 'dummy data');
  });

  after(() => {
    // Clean up
    if (fs.existsSync(dummyPath)) {
      try {
        fs.unlinkSync(dummyPath);
      } catch {}
    }
  });

  test('1. deleteMediaFile deletes a normal file inside MEDIA_DIR (Normal Case)', async () => {
    // Make sure it exists
    assert.strictEqual(fs.existsSync(dummyPath), true);
    
    // Delete normal file
    const result = await deleteMediaFile(dummyFile);
    assert.strictEqual(result, true);
    assert.strictEqual(fs.existsSync(dummyPath), false);
  });

  test('2. deleteMediaFile allows subfolder files residing inside MEDIA_DIR (Boundary Case)', async () => {
    const subfolder = 'testsub';
    const subfolderDir = path.join(MEDIA_DIR, subfolder);
    if (!fs.existsSync(subfolderDir)) {
      fs.mkdirSync(subfolderDir, { recursive: true });
    }
    const subfilePath = path.join(subfolderDir, 'subfile.mp3');
    fs.writeFileSync(subfilePath, 'subfile dummy');

    // Run delete on subfolder file
    const relativeSubPath = 'testsub/subfile.mp3';
    const result = await deleteMediaFile(relativeSubPath);
    
    assert.strictEqual(result, true);
    assert.strictEqual(fs.existsSync(subfilePath), false);
  });

  test('3. deleteMediaFile throws error when target resides outside MEDIA_DIR (Exception Case - Path Traversal)', async () => {
    const maliciousFilename = '../malicious.txt';
    
    // It should throw path traversal error
    await assert.rejects(
      async () => {
        await deleteMediaFile(maliciousFilename);
      },
      (err: Error) => {
        return err.message.includes('path traversal detected');
      }
    );
  });
});
