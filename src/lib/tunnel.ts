import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let tunnelProcess: ChildProcess | null = null;
let currentTunnelUrl: string | null = null;
let tunnelStatusText: string = 'stopped';
let tunnelProgressPercent: number = 0;
let tunnelProgressMessage: string = '정지됨';
let spawnFn = spawn;

export function setSpawnFn(fn: any) {
  spawnFn = fn;
}

export function getTunnelStatus() {
  return {
    status: tunnelStatusText,
    url: currentTunnelUrl,
    progress: tunnelProgressPercent,
    message: tunnelProgressMessage
  };
}

export function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    currentTunnelUrl = null;
    tunnelStatusText = 'stopped';
    tunnelProgressPercent = 0;
    tunnelProgressMessage = '정지됨';
    return { status: 'stopped' };
  }
  return { status: 'already_stopped' };
}

export function startTunnel(port: string = '3000'): { status: string; message: string; url?: string | null; error?: string } {
  if (currentTunnelUrl) {
    return { status: 'running', url: currentTunnelUrl, message: '이미 실행 중입니다.' };
  }
  if (tunnelProcess) {
    return { status: 'starting', message: '터널 기동 중입니다.' };
  }

  tunnelStatusText = 'starting';
  tunnelProgressPercent = 10;
  tunnelProgressMessage = '로컬 터널 프로세스(cloudflared) 가동 중...';

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
      tunnelStatusText = 'error';
      tunnelProgressPercent = 0;
      tunnelProgressMessage = `오류 발생: ${err.message}`;
      if (tunnelProcess) tunnelProcess.kill();
      tunnelProcess = null;
      currentTunnelUrl = null;
    });

    tunnelProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      
      if (output.includes('Starting tunnel')) {
        tunnelProgressPercent = 25;
        tunnelProgressMessage = '터널 구동 개시...';
      } else if (output.includes('Opening connection') || output.includes('Connecting')) {
        tunnelProgressPercent = 50;
        tunnelProgressMessage = 'Cloudflare Edge 서버와 터널 연결 수립 중...';
      } else if (output.includes('Connection established') || output.includes('Registered tunnel')) {
        tunnelProgressPercent = 75;
        tunnelProgressMessage = '터널 연결 수립 완료. 도메인 등록 대기 중...';
      }

      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !foundUrl) {
        foundUrl = true;
        currentTunnelUrl = match[0];
        tunnelStatusText = 'running';
        tunnelProgressPercent = 100;
        tunnelProgressMessage = '외부 접속 주소 생성 완료!';
      }
    });

    tunnelProcess.on('close', () => {
      tunnelProcess = null;
      currentTunnelUrl = null;
      tunnelStatusText = 'stopped';
      tunnelProgressPercent = 0;
      tunnelProgressMessage = '정지됨';
    });

    // Timeout in case it fails to fetch a URL
    setTimeout(() => {
      if (!foundUrl && tunnelStatusText === 'starting') {
        if (tunnelProcess) tunnelProcess.kill();
        tunnelProcess = null;
        tunnelStatusText = 'error';
        tunnelProgressPercent = 0;
        tunnelProgressMessage = '시간 초과로 터널 연결에 실패했습니다.';
      }
    }, 15000);

    return { status: 'starting', message: '터널 기동을 시작했습니다.' };
  } catch (e: any) {
    tunnelStatusText = 'error';
    tunnelProgressPercent = 0;
    tunnelProgressMessage = `기동 중 예외 발생: ${e.message}`;
    return { status: 'error', error: e.message, message: `예외 발생: ${e.message}` };
  }
}

// For unit testing only: reset the internal state
export function resetTunnelState() {
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  tunnelProcess = null;
  currentTunnelUrl = null;
  tunnelStatusText = 'stopped';
  tunnelProgressPercent = 0;
  tunnelProgressMessage = '정지됨';
}
