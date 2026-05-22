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
      const res = await startTunnel(port);
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 500 });
      }
      return NextResponse.json(res);
    }

    if (action === 'status') {
      const res = getTunnelStatus();
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Tunnel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
