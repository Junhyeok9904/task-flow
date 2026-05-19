'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../../components/ui/Icon';

export default function BoardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // DnD States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      setTasks(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const updateTask = async (id: string, updates: any) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    // Background sync
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, updates }),
    });
  };

  // ─── Drag and Drop Handlers ───
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag ghost to generate before we might add a class
    setTimeout(() => {
      // Optional: hide the element or change its opacity while dragging
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task || task.status === newStatus) return;

    // Update the task status immediately
    // If moving to completed, we should also auto-check it
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') updates.checked = true;
    if (newStatus !== 'completed' && task.checked) updates.checked = false;

    updateTask(draggedTaskId, updates);
  };

  const labelMap: Record<string, string> = { pending: '대기 (Pending)', in_progress: '진행중 (In Progress)', completed: '완료 (Completed)' };
  const colorMap: Record<string, string> = { pending: 'border-amber-500', in_progress: 'border-blue-500', completed: 'border-emerald-500' };
  const borderBgMap: Record<string, string> = { pending: 'border-l-4 border-l-amber-500', in_progress: 'border-l-4 border-l-blue-500', completed: 'border-l-4 border-l-emerald-500' };

  if (loading) return <div className="flex h-screen items-center justify-center text-emerald-400 bg-[#08090d] font-sans">로딩중...</div>;

  return (
    <div className="min-h-screen bg-transparent text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-6 p-6 relative z-10">
        
        {/* Top Header Section */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-wide uppercase">📋 Interactive Kanban Board</h1>
            <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">
              Drag & Drop Enabled
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
          카드를 드래그하여 다른 열로 이동하세요. 진행 상태가 자동으로 업데이트됩니다.
        </p>

        {/* Kanban Board Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[75vh]">
          {(['pending', 'in_progress', 'completed'] as const).map(status => (
            <div 
              key={status} 
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              className={`bg-black/40 backdrop-blur-3xl border rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ${
                dragOverColumn === status 
                  ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-black/60 scale-[1.01]' 
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* Kanban Column Header */}
              <div className={`px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/5`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : status === 'in_progress' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]'}`}></div>
                  <h3 className="text-sm font-bold text-white tracking-wide">{labelMap[status]}</h3>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold">{tasks.filter(t => t.status === status).length} Tasks</span>
              </div>
              
              {/* Column Item list */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-transparent">
                {tasks.filter(t => t.status === status).map(task => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-5 bg-white/5 backdrop-blur-xl rounded-2xl border transition-all duration-300 cursor-grab active:cursor-grabbing hover:bg-white/10 shadow-lg 
                      ${status === 'completed' ? 'border-emerald-500/30 hover:border-emerald-500/60' : status === 'in_progress' ? 'border-blue-500/30 hover:border-blue-500/60' : 'border-purple-500/30 hover:border-purple-500/60'} 
                      ${draggedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100'} ${task.checked ? 'opacity-60' : ''}`}
                  >
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-3">
                      <h4 className={`flex-1 text-sm font-bold text-white leading-snug ${task.checked ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h4>
                    </div>
                    
                    {/* Description */}
                    {task.description && (
                      <p className="w-full text-[11px] text-gray-400 line-clamp-3 mt-3 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Bottom Status Tags */}
                    <div className="mt-4 flex gap-2">
                       <span className={`px-2.5 py-1 rounded-full border text-[9px] font-bold tracking-wide uppercase ${
                        status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : status === 'in_progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                       }`}>
                         {status === 'completed' ? 'Done' : status === 'in_progress' ? 'Dev' : 'Research'}
                       </span>
                    </div>
                  </div>
                ))}
                
                {!tasks.filter(t => t.status === status).length && (
                  <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-800 rounded-xl mt-4">
                    <p className="text-gray-600 text-xs font-semibold">이곳에 카드를 드롭하세요</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
