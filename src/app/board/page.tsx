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
    <div className="min-h-screen bg-[#0b0c10] text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

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
              className={`bg-[#13161f]/60 backdrop-blur-md border rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 ${
                dragOverColumn === status 
                  ? 'border-emerald-500/50 shadow-emerald-500/20 bg-[#161a25]/80 scale-[1.01]' 
                  : 'border-gray-900'
              }`}
            >
              {/* Kanban Column Header */}
              <div className={`border-t-4 ${colorMap[status]} px-4 py-3 bg-[#0f1118]/80 flex justify-between items-center shrink-0`}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{labelMap[status]}</h3>
                <span className="bg-[#181b24] border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">
                  {tasks.filter(t => t.status === status).length}
                </span>
              </div>
              
              {/* Column Item list */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 bg-[#13161f]/20">
                {tasks.filter(t => t.status === status).map(task => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 bg-[#181b24]/90 rounded-xl border border-gray-800/80 ${borderBgMap[status]} transition-all duration-300 cursor-grab active:cursor-grabbing hover:bg-[#1c1e29] hover:border-gray-700 shadow-md ${draggedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100'} ${task.checked ? 'opacity-70' : ''}`}
                  >
                    {/* Title Row */}
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => updateTask(task.id, { checked: !task.checked })}
                        className="text-gray-500 hover:text-emerald-400 transition"
                      >
                        {task.checked ? '🟢' : '⚪'}
                      </button>
                      <h4 className={`flex-1 text-left text-xs font-bold text-white ${task.checked ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h4>
                      <div className="text-gray-600">
                        <Icon name="folder" size={14} />
                      </div>
                    </div>
                    
                    {/* Description */}
                    {task.description && (
                      <p className="w-full text-left text-[10px] text-gray-400 line-clamp-3 mt-2.5 pl-6 pr-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
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
