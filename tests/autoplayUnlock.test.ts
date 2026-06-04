import { test, describe } from 'node:test';
import assert from 'node:assert';

// Mock the global window and Audio class since we are in Node.js environment
if (typeof global.window === 'undefined') {
  (global as any).window = {};
}

class MockAudio {
  src = '';
  paused = true;
  playCalls = 0;
  pauseCalls = 0;

  async play() {
    this.playCalls++;
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls++;
    this.paused = true;
  }
}

// Mock the global Audio constructor
(global as any).Audio = MockAudio;

describe('Mobile Autoplay Unlock Mechanism Tests', () => {
  test('1. unlockAudioDevice executes play and pause sequentially to unlock browser restriction (Normal Case)', async () => {
    const audio = new (global as any).Audio();
    assert.strictEqual(audio.playCalls, 0);
    assert.strictEqual(audio.pauseCalls, 0);

    // Simulate unlockAudioDevice logic from AudioProvider.tsx
    const unlockAudioDevice = () => {
      if (audio) {
        audio.play().then(() => {
          audio.pause();
        }).catch((e) => {
          console.log("Audio unlock error:", e);
        });
      }
    };

    unlockAudioDevice();

    // Wait for the play() promise resolving microtask queue
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.strictEqual(audio.playCalls, 1);
    assert.strictEqual(audio.pauseCalls, 1);
    assert.strictEqual(audio.paused, true);
  });
});
