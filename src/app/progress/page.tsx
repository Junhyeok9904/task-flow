'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAudioPlayer } from '../../contexts/AudioProvider';
import { MediaFile, Task, TaskStatus } from '../../types';
import { ProgressSkeleton, ErrorState, EmptyState } from '../../components/Skeletons';
import { Icon } from '../../components/ui/Icon';
import { usePointerDnd } from './usePointerDnd';

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ProgressPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
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

  const handleUpdateTasksOnServer = async (updatedTasks: Task[]) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', tasks: updatedTasks }),
    });
  };

  const {
    dragState,
    ghost,
    handlePointerDown,
  } = usePointerDnd(tasks, setTasks, handleUpdateTasksOnServer);

  const updateTask = async (id: string, updates: any) => {
    // Optimistic inline update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, updates }),
    });
    // Optional: reload tasks if needed, but optimistic update is usually fine
    // await loadTasks();
  };

  const startEdit = (task: Task) => {
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

  const labelMap: Record<TaskStatus, string> = { pending: '대기 (Pending)', in_progress: '진행중 (In Progress)', completed: '완료 (Completed)' };
  const colorMap: Record<TaskStatus, string> = { pending: 'border-amber-500', in_progress: 'border-blue-500', completed: 'border-emerald-500' };
  const borderBgMap: Record<TaskStatus, string> = { pending: 'border-l-4 border-l-amber-500', in_progress: 'border-l-4 border-l-blue-500', completed: 'border-l-4 border-l-emerald-500' };
  
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-900 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-base md:text-lg font-bold text-white tracking-wide uppercase">📊 Dev Progress - 플레이리스트 제작 진척</h1>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Subpage Active
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
            <Link 
              href="/checklist" 
              className="px-4 py-2 text-center bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:from-blue-500 hover:to-cyan-400 hover:text-white font-bold text-xs transition duration-300 shadow-lg shadow-blue-500/5"
            >
              ✓ 데일리 체크리스트
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2 text-center bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:from-emerald-500 hover:to-teal-400 hover:text-black font-bold text-xs transition duration-300 shadow-lg shadow-emerald-500/5"
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

        <p className="text-sm text-gray-400 font-semibold my-4">
          카드를 마우스나 터치로 길게 끌어 원하는 위치나 열로 이동해 보세요. 넘칠 경우 상하단 경계 부근에서 자동으로 스크롤됩니다.
        </p>

        {/* Kanban Board Row (Drag and Drop Integrated) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['pending', 'in_progress', 'completed'] as const).map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            
            // Generate display tasks list (hiding the currently dragged task from its original place while dragging)
            let displayTasks = [...columnTasks];
            if (dragState.draggedTaskId) {
              displayTasks = displayTasks.filter(t => t.id !== dragState.draggedTaskId);
            }

            // Map list elements
            const cardElements = displayTasks.map((task, index) => {
              return (
                <div 
                  key={task.id} 
                  data-task-id={task.id}
                  data-status={status}
                  data-index={index}
                  onPointerDown={(e) => {
                    // Only start drag if we are not editing
                    if (editingId !== task.id) {
                      handlePointerDown(e, task.id, status, task.title, task.description);
                    }
                  }}
                  style={{ touchAction: editingId === task.id ? 'auto' : 'none' }}
                  className={`p-4 bg-[#181b24]/75 rounded-xl border transition-all duration-200 shadow-sm
                    ${editingId === task.id ? '' : 'cursor-grab active:cursor-grabbing hover:bg-[#1c1e29]'}
                    ${borderBgMap[status]} 
                    ${task.checked ? 'opacity-65' : 'opacity-100'}
                  `}
                >
                  {/* Inline Editor */}
                  {editingId === task.id ? (
                    <div className="space-y-3.5 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
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
                      <div className="flex items-start justify-between gap-2.5 pointer-events-none">
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateTask(task.id, { checked: !task.checked }); }}
                          className="text-gray-500 hover:text-emerald-400 transition pointer-events-auto mt-0.5"
                        >
                          {task.checked ? '🟢' : '⚪'}
                        </button>
                        <h4 className={`flex-1 text-sm font-bold text-white leading-snug ${task.checked ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); startEdit(task); }}
                          className="text-[10px] text-gray-600 hover:text-blue-400 transition pointer-events-auto pl-1 self-start"
                        >
                          ✏️
                        </button>
                      </div>
                      
                      {/* Description */}
                      {task.description && (
                        <p className="w-full text-[11px] text-gray-400 line-clamp-3 mt-2 pl-6 leading-relaxed pointer-events-none">
                          {task.description}
                        </p>
                      )}
                      
                      {/* Kanban Actions */}
                      <div className="flex gap-1 mt-3 pl-6 flex-wrap pointer-events-auto">
                        {status !== 'pending' && (
                          <button onPointerDown={e => e.stopPropagation()} onClick={() => updateTask(task.id, { status: 'pending' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-amber-400 text-gray-400 rounded-md transition uppercase">
                            ← 대기
                          </button>
                        )}
                        {status !== 'in_progress' && (
                          <button onPointerDown={e => e.stopPropagation()} onClick={() => updateTask(task.id, { status: 'in_progress' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-blue-400 text-gray-400 rounded-md transition uppercase">
                            → 진행
                          </button>
                        )}
                        {status !== 'completed' && (
                          <button onPointerDown={e => e.stopPropagation()} onClick={() => updateTask(task.id, { checked: true, status: 'completed' })} className="text-[8px] font-bold px-2 py-1 bg-gray-900 border border-gray-850 hover:bg-[#1b2520] hover:text-emerald-400 text-gray-400 rounded-md transition uppercase">
                            ✓ 완료
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            });

            // Insert placeholder card at targetIndex
            const isTargetColumn = dragState.targetStatus === status;
            if (dragState.draggedTaskId && isTargetColumn) {
              const placeholderCard = (
                <div 
                  key="drag-placeholder"
                  className={`p-5 rounded-2xl border-2 border-dashed h-[110px] flex items-center justify-center text-xs font-bold transition-all duration-200 bg-white/5 animate-pulse
                    ${status === 'completed' ? 'border-emerald-500/40 text-emerald-400/50' : status === 'in_progress' ? 'border-blue-500/40 text-blue-400/50' : 'border-purple-500/40 text-purple-400/50'}
                  `}
                >
                  이곳에 드롭
                </div>
              );
              const insertIdx = Math.min(Math.max(0, dragState.targetIndex), cardElements.length);
              cardElements.splice(insertIdx, 0, placeholderCard);
            }

            const isHovered = dragState.targetStatus === status;

            return (
              <div 
                key={status} 
                data-status={status}
                className={`column-container bg-[#13161f]/60 backdrop-blur-md border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[65vh] transition-all duration-300 ${
                  isHovered 
                    ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-black/60 scale-[1.01]' 
                    : 'border-gray-900 hover:border-gray-800'
                }`}
              >
                {/* Kanban Column Header with glowing accent lines */}
                <div className={`border-t-4 ${colorMap[status]} px-4 py-3 bg-[#0f1118]/80 flex justify-between items-center shrink-0 pointer-events-none`}>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{labelMap[status]}</h3>
                  <span className="bg-[#181b24] border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">
                    {tasks.filter(t => t.status === status && t.checked).length} / {columnTasks.length}
                  </span>
                </div>
                
                {/* Column Item list */}
                <div className="column-list p-3 space-y-2.5 overflow-y-auto flex-1 bg-[#13161f]/20">
                  {cardElements}
                  
                  {cardElements.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-800 rounded-xl mt-4 pointer-events-none">
                      <p className="text-gray-600 text-xs font-semibold">이곳에 카드를 드롭하세요</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                    <span className="truncate font-semibold max-w-[180px] flex items-center gap-1">
                      <Icon name="play" size={12} className={isActive ? "fill-emerald-400/20 text-emerald-400" : "text-gray-400"} />
                      {m.name || 'Audio'}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">MP3</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ghost Preview Card overlay */}
      {ghost && (
        <div
          style={{
            position: 'fixed',
            left: ghost.x - ghost.offsetX,
            top: ghost.y - ghost.offsetY,
            width: ghost.width,
            height: ghost.height,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'rotate(2.5deg) scale(1.03)',
            transition: 'transform 0.05s ease-out',
          }}
          className={`p-4 bg-white/10 backdrop-blur-2xl rounded-xl border shadow-[0_20px_50px_rgba(168,85,247,0.3)] text-[#cfd3db] select-none
            ${borderBgMap[ghost.status]}
          `}
        >
          <div className="flex items-start justify-between gap-2.5">
            <h4 className="flex-1 text-sm font-bold text-white leading-snug">
              {ghost.title}
            </h4>
          </div>
          {ghost.description && (
            <p className="w-full text-[11px] text-gray-400 line-clamp-3 mt-2 pl-6 leading-relaxed">
              {ghost.description}
            </p>
          )}
        </div>
      )}

      {/* ─── Persistent Glassmorphic Player bar ─── */}
      {currentFile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f1118] border-t border-gray-900 hidden md:flex items-center justify-between px-6 z-50 select-none shadow-2xl">
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
                className={`p-1.5 rounded-full transition-all ${isShuffle ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
                title="Shuffle"
              >
                <Icon name="shuffle" size={16} />
              </button>
              <button 
                onClick={handlePrev} 
                className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition-transform"
                title="Previous Track"
              >
                <Icon name="skip-back" size={18} />
              </button>
              <button 
                onClick={togglePlay} 
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.93] transition-all"
                title={isPlaying ? "Pause" : "Play"}
              >
                <img 
                  src={isPlaying ? "/images/premium_pause_icon.png" : "/images/premium_play_icon.png"} 
                  alt={isPlaying ? "Pause" : "Play"} 
                  className="w-full h-full object-cover scale-105"
                />
              </button>
              <button 
                onClick={() => handleNext(false)} 
                className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition-transform"
                title="Next Track"
              >
                <Icon name="skip-forward" size={18} />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-full relative transition-all ${repeatMode !== 'none' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
                title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
              >
                <Icon name="repeat" size={16} />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[7px] bg-emerald-500 text-black px-1 py-0.2 rounded-full font-black scale-90">1</span>
                )}
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
