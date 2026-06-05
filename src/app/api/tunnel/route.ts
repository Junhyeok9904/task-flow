import { NextResponse } from 'next/server';
import { startTunnel, stopTunnel, getTunnelStatus } from '../../../lib/tunnel';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'stop') {
      const res = stopTunnel();
      return NextResponse.json(res);
    }

    if (action === 'start') {
      const port = process.env.PORT || '3000';
      const res = startTunnel(port);
      if (res.status === 'error') {
        return NextResponse.json({ error: res.error || res.message }, { status: 500 });
      }
      return NextResponse.json(res);
    }

    if (action === 'status') {
      let res: { status: string; url?: string | null; isDocker?: boolean } = getTunnelStatus();
      res.isDocker = process.env.IS_DOCKER === 'true';

      if (res.status === 'stopped') {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        if (host && host.includes('trycloudflare.com')) {
          res.status = 'running';
          res.url = `https://${host}`;
        }
      }
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Tunnel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
