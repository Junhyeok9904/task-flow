import { test, mock, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { startTunnel, stopTunnel, getTunnelStatus, resetTunnelState, setSpawnFn } from '../src/lib/tunnel.ts';

describe('Tunnel Helper Tests', () => {
  let spawnCalls: any[] = [];
  let mockProcess: any;

  beforeEach(() => {
    resetTunnelState();
    spawnCalls = [];
  });

  before(() => {
    // Inject the mock spawn function
    setSpawnFn((cmd: string, args: string[], options?: any) => {
      spawnCalls.push({ cmd, args, options });
      
      mockProcess = {
        kill: mock.fn(() => {}),
        on: mock.fn((event: string, callback: Function) => {
          if (event === 'close') {
            mockProcess.closeCallback = callback;
          }
          if (event === 'error') {
            mockProcess.errorCallback = callback;
          }
        }),
        stderr: {
          on: mock.fn((event: string, callback: Function) => {
            if (event === 'data') {
              mockProcess.dataCallback = callback;
            }
          })
        }
      };
      return mockProcess;
    });
  });

  after(() => {
    // Restore the default spawn function
    setSpawnFn(spawn);
  });

  test('1. startTunnel spawns cloudflared and parses trycloudflare URL (Normal Case)', async () => {
    const promise = startTunnel('3000');

    // Wait a brief moment for the process to spawn and event listeners to attach
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate cloudflared outputting trycloudflare URL on stderr
    assert.ok(mockProcess.dataCallback, 'dataCallback should be registered');
    mockProcess.dataCallback(Buffer.from('https://test-tunnel-subdomain.trycloudflare.com\n'));

    const res = await promise;

    assert.strictEqual(res.status, 'started');
    assert.strictEqual(res.url, 'https://test-tunnel-subdomain.trycloudflare.com');
    assert.strictEqual(spawnCalls.length, 1);
    assert.ok(spawnCalls[0].cmd.includes('cloudflared'), 'Should run cloudflared binary');
    assert.strictEqual(spawnCalls[0].options, undefined, 'Should not use shell: true');
  });

  test('2. getTunnelStatus returns current status (Boundary Case)', async () => {
    // Manually start and simulate success first
    const promise = startTunnel('3000');
    await new Promise(resolve => setTimeout(resolve, 50));
    mockProcess.dataCallback(Buffer.from('https://test-tunnel-subdomain.trycloudflare.com\n'));
    await promise;

    // Check status
    const status = getTunnelStatus();
    assert.strictEqual(status.status, 'running');
    assert.strictEqual(status.url, 'https://test-tunnel-subdomain.trycloudflare.com');
  });

  test('3. stopTunnel kills the process and resets status (Boundary Case)', async () => {
    // Start it first
    const promise = startTunnel('3000');
    await new Promise(resolve => setTimeout(resolve, 50));
    mockProcess.dataCallback(Buffer.from('https://test-tunnel-subdomain.trycloudflare.com\n'));
    await promise;

    // Stop it
    const res = stopTunnel();
    assert.strictEqual(res.status, 'stopped');
    assert.strictEqual(mockProcess.kill.mock.callCount(), 1);

    // Verify it is stopped
    const status = getTunnelStatus();
    assert.strictEqual(status.status, 'stopped');
    assert.strictEqual(status.url, null);
  });

  test('4. startTunnel handles spawn error gracefully (Exception Case)', async () => {
    // Inject an error-producing spawn function
    setSpawnFn(() => {
      mockProcess = {
        kill: mock.fn(() => {}),
        on: mock.fn((event: string, callback: Function) => {
          if (event === 'error') {
            mockProcess.errorCallback = callback;
          }
        }),
        stderr: {
          on: mock.fn(() => {})
        }
      };
      return mockProcess;
    });

    const promise = startTunnel('3000');

    await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(mockProcess.errorCallback, 'errorCallback should be registered');
    mockProcess.errorCallback(new Error('Spawn failed with exit code 1'));

    const res = await promise;

    assert.ok(res.error, 'Should return error');
    assert.ok(res.error.includes('Failed to spawn tunnel process'));
  });
});
