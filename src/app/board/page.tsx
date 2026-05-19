'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BoardSkeleton, ErrorState } from '../../components/Skeletons';
import { useBoardDnd } from './useBoardDnd';
import { Task, TaskStatus } from '../../types';

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error("서버에서 보드 태스크 데이터를 가져오지 못했습니다.");
      }
      setTasks(await res.json());
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "서버 통신 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTasks().finally(() => {
      setLoading(false);
    });
  }, []);

  const handleUpdateTasksOnServer = async (updatedTasks: Task[]) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', tasks: updatedTasks }),
    });
  };

  const {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDragOverCard,
    handleDrop,
  } = useBoardDnd(tasks, setTasks, handleUpdateTasksOnServer);

  const labelMap: Record<TaskStatus, string> = { 
    pending: '대기 (Pending)', 
    in_progress: '진행중 (In Progress)', 
    completed: '완료 (Completed)' 
  };

  if (loading) return <BoardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6">
        <ErrorState 
          title="보드 데이터 로드 실패" 
          message={error} 
          onRetry={async () => {
            setLoading(true);
            await loadTasks();
            setLoading(false);
          }} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none">
      {/* Ambient Blur circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 p-6 relative z-10">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">📋 Interactive Kanban Board</h1>
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">
              Custom drag & drop
            </span>
          </div>
          <Link 
            href="/progress" 
            className="px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 border border-gray-700 rounded-xl hover:text-white font-bold text-xs transition duration-300 shadow-lg"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>

        <p className="text-sm text-gray-400 font-semibold mb-6">
          카드를 마우스로 끌어서 순서를 바꾸거나 다른 열로 이동해 보세요. 실시간으로 서버에 저장됩니다.
        </p>

        {/* Board Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[75vh]">
          {(['pending', 'in_progress', 'completed'] as const).map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            
            // Generate display tasks list (hiding the currently dragged task to avoid double rendering)
            let displayTasks = [...columnTasks];
            if (dragState.draggedTaskId) {
              displayTasks = displayTasks.filter(t => t.id !== dragState.draggedTaskId);
            }

            // Map list elements
            const cardElements = displayTasks.map((task, index) => {
              const isDragged = dragState.draggedTaskId === task.id;
              
              return (
                <div 
                  key={task.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id, status)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverCard(e, task.id, status, index)}
                  className={`p-5 bg-white/5 backdrop-blur-xl rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing hover:bg-white/10 shadow-lg
                    ${status === 'completed' ? 'border-emerald-500/30 hover:border-emerald-500/60' : status === 'in_progress' ? 'border-blue-500/30 hover:border-blue-500/60' : 'border-purple-500/30 hover:border-purple-500/60'} 
                    ${isDragged ? 'opacity-30 scale-95 border-dashed' : 'opacity-100'} 
                    ${task.checked ? 'opacity-65' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className={`flex-1 text-sm font-bold text-white leading-snug ${task.checked ? 'line-through text-gray-500' : ''}`}>
                      {task.title}
                    </h4>
                  </div>
                  
                  {task.description && (
                    <p className="w-full text-[11px] text-gray-400 line-clamp-3 mt-3 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                     <span className={`px-2.5 py-1 rounded-full border text-[9px] font-bold tracking-wide uppercase ${
                      status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : status === 'in_progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                     }`}>
                       {status === 'completed' ? 'Done' : status === 'in_progress' ? 'Dev' : 'Research'}
                     </span>
                  </div>
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
                onDragOver={(e) => handleDragOverColumn(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                className={`column-container bg-black/40 backdrop-blur-3xl border rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ${
                  isHovered 
                    ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-black/60 scale-[1.01]' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Column Header */}
                <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/5 pointer-events-none">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : status === 'in_progress' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]'}`}></div>
                    <h3 className="text-sm font-bold text-white tracking-wide">{labelMap[status]}</h3>
                  </div>
                  <span className="text-[10px] text-gray-500 font-semibold">{columnTasks.length} Tasks</span>
                </div>
                
                {/* Column Item list */}
                <div className="column-list p-4 space-y-4 overflow-y-auto flex-1 bg-transparent">
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
      </div>
    </div>
  );
}
