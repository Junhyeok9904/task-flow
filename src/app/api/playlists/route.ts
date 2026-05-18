import { NextResponse } from 'next/server';
import { getPlaylists, savePlaylist, getTasks } from '../../../lib/store';

export async function GET() {
  const playlists = getPlaylists();
  return NextResponse.json(playlists);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.action === 'create') {
    const playlists = getPlaylists();
    const newPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      items: [],
      createdAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    // JSON에 저장 함수는 savePlaylist(playlist)로 하나씩 저장함
    // 다시 전체를 쓰려면 store에 새 함수가 필요함
    const fs = require('fs');
    const path = require('path');
    const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');
    // store.ts에서 writeJSON이 없으므로 직접 작성
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    return NextResponse.json(newPlaylist);
  }

  if (body.action === 'delete') {
    const playlists = getPlaylists();
    const filtered = playlists.filter(p => p.id !== body.id);
    const fs = require('fs');
    const path = require('path');
    const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(filtered, null, 2));
    return NextResponse.json({ success: true });
  }

  if (body.action === 'addItem') {
    const playlists = getPlaylists();
    const idx = playlists.findIndex(p => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    if (!playlists[idx].items.includes(body.itemPath)) {
      playlists[idx].items.push(body.itemPath);
    }
    const fs = require('fs');
    const path = require('path');
    const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    return NextResponse.json(playlists[idx]);
  }

  if (body.action === 'removeItem') {
    const playlists = getPlaylists();
    const idx = playlists.findIndex(p => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    playlists[idx].items = playlists[idx].items.filter(p => p !== body.itemPath);
    const fs = require('fs');
    const path = require('path');
    const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    return NextResponse.json(playlists[idx]);
  }

  // 기존 savePlaylist
  savePlaylist(body);
  return NextResponse.json(body);
}
