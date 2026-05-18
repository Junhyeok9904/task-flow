'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaFile, Playlist } from '../types';
import Link from 'next/link';

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtSize(b: number) {
  if (!b) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Home() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'songs' | 'playlists' | 'upload' | 'recent'>('songs');
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([fetch('/api/media'), fetch('/api/playlists')]);
      setMediaFiles(await mRes.json());
      setPlaylists(await pRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData().then(() => setLoading(false)); }, []);

  // 메소 미디어 refs
  const getMediaEl = () => currentFile?.type === 'video' ? videoRef.current : audioRef.current;

  // 시간 업데이트
  useEffect(() => {
    const el = getMediaEl();
    if (!el) return;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnded = () => { setIsPlaying(false); handleNext(); };
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [currentFile]);

  // 볼륨
  useEffect(() => {
    const el = getMediaEl();
    if (el) el.volume = volume;
  }, [volume, currentFile]);

  const playFile = useCallback((file: MediaFile) => {
    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setQueue(prev => prev.some(q => q.path === file.path) ? prev : [file, ...prev]);
    setQueueIndex(0);
  }, []);

  const togglePlay = useCallback(() => {
    const el = getMediaEl();
    if (!el) return;
    isPlaying ? el.pause() : el.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentFile]);

  const seekBy = (delta: number) => {
    const el = getMediaEl();
    if (!el) return;
    const dur = el.duration;
    if (!isFinite(dur) || dur === 0) return;
    el.currentTime = Math.max(0, Math.min(dur, el.currentTime + delta));
  };

  const handleNext = useCallback(() => {
    if (!queue.length) return;
    const next = (queueIndex + 1) % queue.length;
    setQueueIndex(next); setCurrentFile(queue[next]); setIsPlaying(true);
    setTimeout(() => {
      const el = getMediaEl();
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    }, 100);
  }, [queue, queueIndex]);

  const handlePrev = useCallback(() => {
    if (!queue.length) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev); setCurrentFile(queue[prev]); setIsPlaying(true);
    setTimeout(() => {
      const el = getMediaEl();
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    }, 100);
  }, [queue, queueIndex]);

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: newPlaylistName.trim() }) });
    setNewPlaylistName('');
    await loadData();
  };

  const deletePlaylist = async (id: string) => {
    await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
    await loadData();
  };

  const togglePlaylistItem = async (pid: string, itemPath: string, isIn: boolean) => {
    await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: isIn ? 'removeItem' : 'addItem', id: pid, itemPath }) });
    await loadData();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('file', f));
    await fetch('/api/media', { method: 'POST', body: fd });
    await loadData();
  };

  const onDrop = async (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); await handleUpload(e.dataTransfer.files); };
  const filteredSongs = mediaFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">로딩중...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-800">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4">
            <Link href="/progress" className="block w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center font-medium text-sm">
              📊 Dev Progress
            </Link>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            <button onClick={() => setView('songs')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === 'songs' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>🎵 All Songs</button>
            <button onClick={() => setView('playlists')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === 'playlists' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>📁 My Playlists</button>
            <button onClick={() => setView('upload')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === 'upload' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>⬆️ Upload Queue</button>
            <button onClick={() => setView('recent')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === 'recent' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>🕐 Recent Uploads</button>
          </nav>
          {selectedPlaylistId && (() => { const p = playlists.find(pl => pl.id === selectedPlaylistId); return p ? (
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-1">SELECTED</p>
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-gray-500">{p.items.length} items</p>
            </div>
          ) : null; })()}
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <h1 className="text-lg font-bold text-gray-900">
              {view === 'songs' && 'All Songs'}
              {view === 'playlists' && 'My Playlists'}
              {view === 'upload' && 'Upload Music'}
              {view === 'recent' && 'Recent Uploads'}
            </h1>
            <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} className="w-64 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {view === 'songs' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-right">Size</th><th className="px-4 py-3 text-center">Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredSongs.map((f, i) => (
                      <tr key={f.path} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i+1}</td>
                        <td className="px-4 py-3 font-medium">{f.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${f.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{f.type.toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-right text-gray-500">{fmtSize(f.size)}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => playFile(f)} className="text-blue-600 hover:text-blue-800 font-medium">▶ Play</button></td>
                      </tr>
                    ))}
                    {!filteredSongs.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No media files</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'playlists' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-2">
                  <input type="text" placeholder="New playlist name..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={createPlaylist} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map(pl => {
                    const plItems = pl.items.map(p => mediaFiles.find(m => m.path === p)).filter(Boolean) as MediaFile[];
                    const isSelected = selectedPlaylistId === pl.id;
                    return (
                      <div key={pl.id} className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition ${isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100 hover:border-blue-200'}`} onClick={() => setSelectedPlaylistId(isSelected ? null : pl.id)}>
                        <div className="flex justify-between items-start">
                          <div><h3 className="font-bold text-lg">{pl.name}</h3><p className="text-sm text-gray-500">{plItems.length} songs</p></div>
                          <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                        </div>
                        {isSelected && (
                          <div className="mt-3 border-t pt-3 space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tracks</h4>
                              {plItems.length ? plItems.map(item => (
                                <div key={item.path} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                                  <span className="text-sm">{item.type === 'video' ? '🎬' : '🎵'} {item.name}</span>
                                  <button onClick={() => playFile(item)} className="text-blue-600 text-sm">▶</button>
                                </div>
                              )) : <p className="text-sm text-gray-400">Empty</p>}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Add / Remove</h4>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {mediaFiles.map(file => {
                                  const isIn = pl.items.includes(file.path);
                                  return (
                                    <label key={file.path} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                      <input type="checkbox" checked={isIn} onChange={() => togglePlaylistItem(pl.id, file.path, isIn)} />
                                      <span className="text-sm">{file.type === 'video' ? '🎬' : '🎵'} {file.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!playlists.length && <p className="col-span-full text-center py-8 text-gray-400">No playlists yet</p>}
                </div>
              </div>
            )}

            {view === 'upload' && (
              <div className={`border-2 border-dashed rounded-xl p-10 text-center transition ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
                <p className="text-4xl mb-4">☁️</p>
                <p className="text-lg font-semibold mb-1">Upload music files</p>
                <p className="text-sm text-gray-500 mb-4">Drag & drop files here or</p>
                <input type="file" multiple accept="audio/*,video/*" onChange={e => handleUpload(e.target.files)} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer">Choose Files</label>
              </div>
            )}

            {view === 'recent' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Added</th></tr></thead>
                  <tbody>
                    {!mediaFiles.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No uploads</td></tr>}
                    {mediaFiles.map(f => (
                      <tr key={f.path} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">{f.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${f.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{f.type.toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-gray-500">{f.addedAt ? new Date(f.addedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── 하단 플레이바 (고정, 진한 배경 + 시간/스킵 일관화) ─── */}
      {currentFile && (
        <>
          {/* 숨김 오디오/비디오 */}
          {currentFile.type === 'video'
            ? <video ref={videoRef} src={currentFile.path} autoPlay className="hidden" />
            : <audio ref={audioRef} src={currentFile.path} autoPlay className="hidden" />
          }
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-6 py-3 flex items-center gap-4 shadow-2xl z-50">
            {/* 곡 정보 */}
            <div className="w-48 truncate text-sm">
              <span className="text-gray-300">🎵 {currentFile.name}</span>
            </div>

            {/* 컨트롤 (재생/일시정지, 이전, 다음) */}
            <div className="flex items-center gap-3">
              <button onClick={handlePrev} className="text-xl hover:text-blue-400 text-gray-400">⏮</button>
              <button onClick={togglePlay} className="text-2xl hover:text-blue-400 text-white">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={handleNext} className="text-xl hover:text-blue-400 text-gray-400">⏭</button>
            </div>

            {/* 시간 + 스킵 */}
            <div className="flex flex-col items-center flex-1 gap-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono w-10 text-right">{fmtTime(currentTime)}</span>
                <button onClick={() => seekBy(-10)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">-10</button>
                <div className="h-1.5 bg-gray-700 rounded-full w-48 overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
                </div>
                <button onClick={() => seekBy(10)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">+10</button>
                <span className="font-mono w-10">{fmtTime(duration)}</span>
              </div>
            </div>

            {/* 큐 정보 */}
            <div className="text-xs text-gray-500 w-20 text-right">
              {queueIndex + 1} / {queue.length}
            </div>

            {/* 볼륨 */}
            <div className="flex items-center gap-2 w-36">
              <span className="text-sm">{volume > 0 ? '🔊' : '🔇'}</span>
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-blue-500" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}