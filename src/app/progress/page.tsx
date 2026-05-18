'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface PlayerState {
  current: { name: string; src: string; type: string; id?: string } | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ProgressPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [player, setPlayer] = useState<PlayerState>({
    current: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const [audioEl] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  const SKIP = 10;
  const seekBy = (delta: number) => {
    if (!audioEl) return;
    const dur = audioEl.duration;
    if (!isFinite(dur) || dur === 0) return;
    audioEl.currentTime = Math.max(0, Math.min(dur, audioEl.currentTime + delta));
  };

  const [mediaList, setMediaList] = useState<any[]>([]);
  const [volume, setVolume] = useState(0.8);

  // ── 인라인 편집 상태 ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      setTasks(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadMedia = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setMediaList(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadTasks();
    loadMedia();
  }, []);

  useEffect(() => {
    if (!audioEl) return;
    const tick = () => setPlayer(p => ({ ...p, currentTime: audioEl.currentTime }));
    const onMeta = () => setPlayer(p => ({ ...p, duration: audioEl.duration }));
    const onEnded = () => setPlayer(p => ({ ...p, isPlaying: false, currentTime: 0 }));
    audioEl.addEventListener('timeupdate', tick);
    audioEl.addEventListener('loadedmetadata', onMeta);
    audioEl.addEventListener('ended', onEnded);
    return () => {
      audioEl.removeEventListener('timeupdate', tick);
      audioEl.removeEventListener('loadedmetadata', onMeta);
      audioEl.removeEventListener('ended', onEnded);
    };
  }, [audioEl]);

  useEffect(() => {
    if (audioEl) audioEl.volume = volume;
  }, [volume, audioEl]);

  const playMedia = (item: any) => {
    if (!audioEl) return;
    const src = item.path || item.src || item.url;
    // 상대경로면 현재 오리진 붙이기
    audioEl.src = src.startsWith('http') ? src : window.location.origin + src;
    audioEl.play().catch(() => {});
    setPlayer(p => ({ ...p, current: item, isPlaying: true }));
  };

  const togglePlay = () => {
    if (!audioEl || !player.current) return;
    if (player.isPlaying) { audioEl.pause(); }
    else { audioEl.play().catch(() => {}); }
    setPlayer(p => ({ ...p, isPlaying: !p.isPlaying }));
  };

  const updateTask = async (id: string, updates: any) => {
    await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, updates }),
    });
    await loadTasks();
  };

  // ── 인라인 편집 시작 ──
  const startEdit = (task: any) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
  };

  // ── 인라인 편집 저장 ──
  const saveEdit = async () => {
    if (!editingId) return;
    await updateTask(editingId, {
      title: editTitle.trim() || '제목 없음',
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  // ── 인라인 편집 취소 ──
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const labelMap: Record<string, string> = { pending: '대기', in_progress: '진행중', completed: '완료' };
  const colorMap: Record<string, string> = { pending: 'border-yellow-400', in_progress: 'border-blue-400', completed: 'border-green-400' };
  const statusCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  const completedPct = tasks.length ? Math.round(statusCounts.completed / tasks.length * 100) : 0;

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-40">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📊 Dev Progress - 플레이리스트 제작 진척</h1>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">← 플레이리스트로</Link>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '전체', value: tasks.length, bg: 'bg-gray-100 text-gray-800' },
            { label: '대기', value: statusCounts.pending, bg: 'bg-yellow-100 text-yellow-800' },
            { label: '진행중', value: statusCounts.in_progress, bg: 'bg-blue-100 text-blue-800' },
            { label: '완료', value: statusCounts.completed, bg: 'bg-green-100 text-green-800' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} p-4 rounded-xl text-center`}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold mb-3">전체 완료율</h3>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${completedPct}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-2">{statusCounts.completed} / {tasks.length} 완료 ({completedPct}%)</p>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'completed'] as const).map(status => (
            <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`border-t-4 ${colorMap[status]} px-4 py-3 flex justify-between items-center`}>
                <h3 className="font-bold">{labelMap[status]}</h3>
                <span className="bg-gray-200 px-2 py-1 rounded text-xs">
                  {tasks.filter(t => t.status === status && t.checked).length} / {tasks.filter(t => t.status === status).length}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {tasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} className={`p-3 bg-gray-50 rounded-lg border-l-4 ${colorMap[status].replace('border', 'border-l')} ${task.checked ? 'opacity-60' : ''}`}>

                    {/* ── 인라인 편집 모드 ── */}
                    {editingId === task.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="작업 제목"
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          autoFocus
                        />
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="작업 설명"
                          rows={2}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                        <div className="flex gap-1">
                          <button onClick={saveEdit}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                            💾 저장
                          </button>
                          <button onClick={cancelEdit}
                            className="text-xs px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
                            ✕ 취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── 일반 표시 모드 ── */
                      <>
                        {/* 제목 줄: 체크 + 클릭편집 + 상태전환 */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateTask(task.id, { checked: !task.checked })}
                            className="text-base">
                            {task.checked ? '✅' : '⬜'}
                          </button>
                          <button onClick={() => startEdit(task)}
                            className={`flex-1 text-left text-sm hover:text-blue-600 transition ${task.checked ? 'line-through text-gray-400' : ''}`}>
                            {task.title} ✏️
                          </button>
                        </div>
                        {/* 설명 줄: 클릭편집 */}
                        {task.description && (
                          <button onClick={() => startEdit(task)}
                            className="block w-full text-left text-xs text-gray-500 hover:text-blue-500 truncate mt-1 ml-6">
                            📝 {task.description}
                          </button>
                        )}
                        {/* 상태 이동 버튼 */}
                        <div className="flex gap-1 mt-2 ml-6 flex-wrap">
                          {status !== 'pending' && <button onClick={() => updateTask(task.id, { status: 'pending' })} className="text-xs px-2 py-1 bg-yellow-100 rounded hover:bg-yellow-200">← 대기</button>}
                          {status !== 'in_progress' && <button onClick={() => updateTask(task.id, { status: 'in_progress' })} className="text-xs px-2 py-1 bg-blue-100 rounded hover:bg-blue-200">→ 진행</button>}
                          {status !== 'completed' && <button onClick={() => updateTask(task.id, { checked: true, status: 'completed' })} className="text-xs px-2 py-1 bg-green-100 rounded hover:bg-green-200">✓ 완료</button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {!tasks.filter(t => t.status === status).length && <p className="text-center py-4 text-gray-400 text-sm">항목 없음</p>}
              </div>
            </div>
          ))}
        </div>

        {/* 음악 플레이어 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold mb-3">🎵 음악 플레이어</h3>
          {mediaList.length === 0 ? (
            <p className="text-sm text-gray-400">미디어 파일이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mediaList.map((m, idx) => (
                <button key={m.id ?? m.filename ?? `media-${idx}`} onClick={() => playMedia(m)}
                  className={`p-3 rounded-lg border text-left text-sm transition ${player.current?.id === m.id ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-50 hover:bg-blue-50 border-gray-200'}`}>
                  <div className="truncate font-medium">▶ {m.name || m.filename || '파일'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 플레이바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-6 py-3 flex items-center gap-4 shadow-2xl z-50">
        <div className="w-48 truncate text-sm">
          {player.current ? (
            <span className="text-gray-300">🎵 {player.current.name}</span>
          ) : (
            <span className="text-gray-500">선택된 곡 없음</span>
          )}
        </div>
        <div className="flex flex-col items-center flex-1 gap-1">
          <button onClick={togglePlay} className="text-2xl hover:text-blue-400 disabled:text-gray-600" disabled={!player.current}>
            {player.isPlaying ? '⏸' : '▶'}
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono w-10 text-right">{fmt(player.currentTime)}</span>
            <button onClick={() => seekBy(-SKIP)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">-{SKIP}</button>
            <div className="h-1.5 bg-gray-700 rounded-full w-48 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: player.duration ? `${(player.currentTime / player.duration) * 100}%` : '0%' }} />
            </div>
            <button onClick={() => seekBy(SKIP)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs">+{SKIP}</button>
            <span className="font-mono w-10">{fmt(player.duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-36">
          <span className="text-sm">{volume > 0 ? '🔊' : '🔇'}</span>
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-blue-500" />
        </div>
      </div>
    </div>
  );
}