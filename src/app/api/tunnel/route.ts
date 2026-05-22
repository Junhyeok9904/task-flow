import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';

// Keep a global reference to the tunnel process
let tunnelProcess: ChildProcess | null = null;
let currentTunnelUrl: string | null = null;

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'stop') {
      if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
        currentTunnelUrl = null;
        return NextResponse.json({ status: 'stopped' });
      }
      return NextResponse.json({ status: 'already_stopped' });
    }

    if (action === 'start') {
      if (currentTunnelUrl) {
        return NextResponse.json({ status: 'running', url: currentTunnelUrl });
      }

      // Determine the port (default Next.js is 3000, but let's allow ENV override)
      const port = process.env.PORT || '3000';

      return new Promise((resolve) => {
        // Spawn cloudflared from the locally installed npm package
        // Note: cloudflared outputs all its logs to stderr, not stdout.
        // shell: true is required on Windows to resolve npx batch script (.cmd)
        const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        tunnelProcess = spawn(cmd, ['cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
          shell: true
        });

        let foundUrl = false;

        tunnelProcess.on('error', (err) => {
          console.error('[Tunnel] Spawn error:', err);
          if (!foundUrl) {
            foundUrl = true;
            resolve(NextResponse.json({ error: `Failed to spawn tunnel process: ${err.message}` }, { status: 500 }));
          }
        });

        tunnelProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          // Regex to match the trycloudflare URL
          const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (match && !foundUrl) {
            foundUrl = true;
            currentTunnelUrl = match[0];
            resolve(NextResponse.json({ status: 'started', url: currentTunnelUrl }));
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
            resolve(NextResponse.json({ error: 'Failed to start tunnel within 15 seconds' }, { status: 500 }));
          }
        }, 15000);
      });
    }

    if (action === 'status') {
      return NextResponse.json({ 
        status: currentTunnelUrl ? 'running' : 'stopped', 
        url: currentTunnelUrl 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Tunnel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
