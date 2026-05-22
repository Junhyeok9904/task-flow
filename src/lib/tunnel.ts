import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let tunnelProcess: ChildProcess | null = null;
let currentTunnelUrl: string | null = null;
let spawnFn = spawn;

export function setSpawnFn(fn: any) {
  spawnFn = fn;
}

export function getTunnelStatus() {
  return {
    status: currentTunnelUrl ? 'running' : 'stopped',
    url: currentTunnelUrl
  };
}

export function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    currentTunnelUrl = null;
    return { status: 'stopped' };
  }
  return { status: 'already_stopped' };
}

export function startTunnel(port: string = '3000'): Promise<{ status: string; url?: string | null; error?: string }> {
  if (currentTunnelUrl) {
    return Promise.resolve({ status: 'running', url: currentTunnelUrl });
  }

  return new Promise((resolve) => {
    try {
      const cloudflaredBin = path.join(
        process.cwd(),
        'node_modules',
        'cloudflared',
        'bin',
        process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'
      );

      tunnelProcess = spawnFn(cloudflaredBin, ['tunnel', '--url', `http://localhost:${port}`]);
      let foundUrl = false;

      tunnelProcess.on('error', (err) => {
        console.error('[Tunnel] Spawn error:', err);
        if (!foundUrl) {
          foundUrl = true;
          resolve({ status: 'error', error: `Failed to spawn tunnel process: ${err.message}` });
        }
      });

      tunnelProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !foundUrl) {
          foundUrl = true;
          currentTunnelUrl = match[0];
          resolve({ status: 'started', url: currentTunnelUrl });
        }
      });

      tunnelProcess.on('close', () => {
        tunnelProcess = null;
        currentTunnelUrl = null;
      });

      // Timeout in case it fails to fetch a URL
      setTimeout(() => {
        if (!foundUrl) {
          if (tunnelProcess) tunnelProcess.kill();
          tunnelProcess = null;
          resolve({ status: 'error', error: 'Failed to start tunnel within 15 seconds' });
        }
      }, 15000);
    } catch (e: any) {
      resolve({ status: 'error', error: `Exception during tunnel startup: ${e.message}` });
    }
  });
}

// For unit testing only: reset the internal state
export function resetTunnelState() {
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  tunnelProcess = null;
  currentTunnelUrl = null;
}
