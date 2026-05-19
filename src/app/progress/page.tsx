'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAudioPlayer } from '../../contexts/AudioProvider';
import { MediaFile } from '../../types';
import { ProgressSkeleton, ErrorState, EmptyState } from '../../components/Skeletons';

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ProgressPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    currentFile,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    playFile,
    togglePlay,
    seekBy,
    seekTo,
    handleNext,
    handlePrev,
    toggleShuffle,
    toggleRepeat,
    playPlaylistRewrite
  } = useAudioPlayer();

  const SKIP = 10;
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    const res = await fetch('/api/tasks');
    if (!res.ok) {
      throw new Error("작업 진척 데이터를 가져오지 못했습니다.");
    }
    setTasks(await res.json());
  };

  const loadMedia = async () => {
    const res = await fetch('/api/media');
    if (!res.ok) {
      throw new Error("미디어 파일 목록을 가져오지 못했습니다.");
    }
    const data = await res.json();
    setMediaList(Array.isArray(data) ? data : []);
  };

  const loadAllData = async () => {
    try {
      await Promise.all([loadTasks(), loadMedia()]);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "서버 통신 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    setLoading(true);
    loadAllData().finally(() => {
      setLoading(false);
    });
  }, []);

  const playMedia = useCallback((item: MediaFile) => {
    if (queue.length === 0 || !queue.some(q => q.path === item.path)) {
      playPlaylistRewrite(mediaList);
      setTimeout(() => playFile(item), 50);
    } else {
      playFile(item);
    }
  }, [mediaList, playPlaylistRewrite, playFile, queue]);

  const updateTask = async (id: string, updates: any) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, updates }),
    });
    await loadTasks();
  };

  const startEdit = (task: any) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateTask(editingId, {
      title: editTitle.trim() || 'Untitled Task',
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const labelMap: Record<string, string> = { pending: '대기 (Pending)', in_progress: '진행중 (In Progress)', completed: '완료 (Completed)' };
  const colorMap: Record<string, string> = { pending: 'border-amber-500', in_progress: 'border-blue-500', completed: 'border-emerald-500' };
  const borderBgMap: Record<string, string> = { pending: 'border-l-4 border-l-amber-500', in_progress: 'border-l-4 border-l-blue-500', completed: 'border-l-4 border-l-emerald-500' };
  
  const statusCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  const completedPct = tasks.length ? Math.round(statusCounts.completed / tasks.length * 100) : 0;

  if (loading) return <ProgressSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6">
        <ErrorState 
          title="진척 대시보드 로드 실패" 
          message={error} 
          onRetry={async () => {
            setLoading(true);
            await loadAllData();
            setLoading(false);
          }} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none">
      
      {/* Dynamic Ambient Background Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 p-6 relative z-10">
        
        {/* Top Header Section */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">📊 Dev Progress - 플레이리스트 제작 진척</h1>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Subpage Active
            </span>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/checklist" 
              className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:from-blue-500 hover:to-cyan-400 hover:text-white font-bold text-xs transition duration-300 shadow-lg shadow-blue-500/5"
            >
              ✓ 데일리 체크리스트
            </Link>
            <Link 
              href="/board" 
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:from-purple-500 hover:to-pink-400 hover:text-white font-bold text-xs transition duration-300 shadow-lg shadow-purple-500/5"
            >
              🚀 인터랙티브 보드로 이동
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:from-emerald-500 hover:to-teal-400 hover:text-black font-bold text-xs transition duration-300 shadow-lg shadow-emerald-500/5"
            >
              ← 플레이리스트로 돌아가기
            </Link>
          </div>
        </div>

        {/* 4-Column Translucent Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '전체 작업 (Total)', value: tasks.length, grad: 'from-blue-500 to-indigo-500', text: 'text-blue-400' },
            { label: '대기 작업 (Pending)', value: statusCounts.pending, grad: 'from-amber-500 to-orange-500', text: 'text-amber-400' },
            { label: '진행중 (In Progress)', value: statusCounts.in_progress, grad: 'from-cyan-500 to-blue-500', text: 'text-cyan-400' },
            { label: '완료 작업 (Completed)', value: statusCounts.completed, grad: 'from-emerald-500 to-green-500', text: 'text-emerald-400' },
          ].map(s => (
            <div 
              key={s.label} 
              className="bg-[#13161f]/60 backdrop-blur-md border border-gray-800/80 p-5 rounded-2xl text-center shadow-xl hover:scale-[1.02] hover:bg-[#161a25]/85 hover:border-gray-700/80 transition-all duration-300"
            >
              <div className={`text-4xl font-extrabold bg-gradient-to-r ${s.grad} bg-clip-text text-transparent`}>
                {s.value}
              </div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Glowing Progress Percentage Bar */}
        <div className="bg-[#13161f]/60 backdrop-blur-md border border-gray-800/80 p-5 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">전체 완료율 (Total Progress)</h3>
            <span className="text-xs font-bold text-emerald-400">{completedPct}%</span>
          </div>
          <div className="h-4 bg-gray-950 rounded-full border border-gray-900 overflow-hidden relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
              style={{ width: `${completedPct}%` }} 
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-2.5 font-semibold">
            {statusCounts.completed} / {tasks.length}개 작업 완료됨 ({completedPct}% 완료)
          </p>
        </div>

        {/* Kanban Board Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['pending', 'in_progress', 'completed'] as const).map(status => (
            <div key={status} className="bg-[#13161f]/60 backdrop-blur-md border border-gray-900 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[65vh]">
              {/* Kanban Column Header with glowing accent lines */}
              <div className={`border-t-4 ${colorMap[status]} px-4 py-3 bg-[#0f1118]/80 flex justify-between items-center shrink-0`}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{labelMap[status]}</h3>
                <span className="bg-[#181b24] border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">
                  {tasks.filter(t => t.status === status && t.checked).length} / {tasks.filter(t => t.status === status).length}
                </span>
              </div>
              
              {/* Column Item list */}
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1 bg-[#13161f]/20">
                {tasks.filter(t => t.status === status).map(task => (
                  <div 
                    key={task.id} 
                    className={`p-4 bg-[#181b24]/75 rounded-xl border border-gray-900/60 ${borderBgMap[status]} transition-all duration-300 hover:bg-[#1c1e29] ${task.checked ? 'opacity-50' : ''}`}
                  >
                    {/* Inline Editor */}
                    {editingId === task.id ? (
                      <div className="space-y-3.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="작업 제목 입력..."
                          className="w-full bg-[#12131a] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="작업 설명 입력..."
                          rows={2}
                          className="w-full bg-[#12131a] border border-gray-800 rounded px-2.5 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-1.5">
                          <button onClick={saveEdit} className="text-[10px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition">
                            💾 저장
                          </button>
                          <button onClick={cancelEdit} className="text-[10px] px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition">
                            ✕ 취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display elements */
                      <>
                        {/* Title Row */}
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => updateTask(task.id, { checked: !task.checked })}
                            className="text-gray-500 hover:text-emerald-400 transition"
                          >
                            {task.checked ? '🟢' : '⚪'}
                          </button>
                          <button 
                            onClick={() => startEdit(task)}
                            className={`flex-1 text-left text-xs font-bold hover:text-blue-400 transition text-white ${task.checked ? 'line-through text-gray-500' : ''}`}
                          >
                            {task.title} <span className="text-[9px] text-gray-600 opacity-0 hover:opacity-100 transition pl-1">✏️</span>
                          </button>
                        </div>
                        
                        {/* Description */}
                        {task.description && (
                          <button 
                            onClick={() => startEdit(task)}
                            className="block w-full text-left text-[10px] text-gray-500 hover:text-blue-400 truncate mt-1.5 pl-6"
                          >
                            📝 {task.description}
                          </button>
                        )}
                        
                        {/* Kanban Actions */}
                        <div className="flex gap-1 mt-3 pl-6 flex-wrap">
                          {status !== 'pending' && (
                            <button onClick={() => updateTask(task.id, { status: 'pending' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-amber-400 text-gray-400 rounded-md transition uppercase">
                              ← 대기
                            </button>
                          )}
                          {status !== 'in_progress' && (
                            <button onClick={() => updateTask(task.id, { status: 'in_progress' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-blue-400 text-gray-400 rounded-md transition uppercase">
                              → 진행
                            </button>
                          )}
                          {status !== 'completed' && (
                            <button onClick={() => updateTask(task.id, { checked: true, status: 'completed' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-emerald-400 text-gray-400 rounded-md transition uppercase">
                              ✓ 완료
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {!tasks.filter(t => t.status === status).length && (
                  <p className="text-center py-8 text-gray-600 text-xs font-semibold">이 컬럼에 등록된 작업이 없습니다.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Music Player widget sync with Dark-Glass HUD */}
        <div className="bg-[#13161f]/60 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3.5">🎵 오디오 라이브러리 (Audio Library)</h3>
          {mediaList.length === 0 ? (
            <p className="text-xs text-gray-500">업로드된 파일이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mediaList.map((m, idx) => {
                const isActive = currentFile?.path === m.path;
                return (
                  <button 
                    key={m.id ?? m.name ?? `media-${idx}`} 
                    onClick={() => playMedia(m)}
                    className={`p-3 rounded-xl border text-left text-xs transition duration-300 flex items-center justify-between ${isActive ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'bg-[#181b24]/80 hover:bg-[#1c1e29] border-gray-900 text-gray-300'}`}
                  >
                    <span className="truncate font-semibold max-w-[180px]">▶ {m.name || 'Audio'}</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">MP3</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Persistent Glassmorphic Player bar ─── */}
      {currentFile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f1118] border-t border-gray-900 flex items-center justify-between px-6 z-50 select-none shadow-2xl">
          {/* Left details */}
          <div className="w-52 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center shrink-0 shadow">
              <span className="text-lg text-white">💿</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate w-36" title={currentFile.name}>{currentFile.name}</p>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">playing progress</span>
            </div>
          </div>

          {/* Center controllers */}
          <div className="flex flex-col items-center flex-1 max-w-xl gap-1">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`text-xs transition ${isShuffle ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
                title="Shuffle"
              >
                🔀
              </button>
              <button onClick={handlePrev} className="text-sm text-gray-400 hover:text-white transition">⏮</button>
              <button onClick={togglePlay} className="w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center hover:scale-105 transition shadow">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={() => handleNext(false)} className="text-sm text-gray-400 hover:text-white transition">⏭</button>
              <button
                onClick={toggleRepeat}
                className={`text-xs transition ${repeatMode !== 'none' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
                title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
              >
                {repeatMode === 'one' ? '🔂' : '🔁'}
              </button>
            </div>

            {/* Range Progress */}
            <div className="w-full flex items-center gap-2.5 text-[9px] text-gray-500 font-mono">
              <span className="w-8 text-right">{fmt(currentTime)}</span>
              <button onClick={() => seekBy(-SKIP)} className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold">-{SKIP}</button>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  seekTo(val);
                }}
                className="flex-1 h-1 bg-gray-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
              />
              <button onClick={() => seekBy(SKIP)} className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold">+{SKIP}</button>
              <span className="w-8">{fmt(duration)}</span>
            </div>
          </div>

          {/* Right Volume Controls */}
          <div className="w-56 flex items-center justify-end gap-4 shrink-0">
            <span className="text-[9px] text-gray-500 font-mono">Synced Player</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{volume > 0 ? '🔊' : '🔇'}</span>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-16 h-1 accent-emerald-500 bg-gray-800" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}