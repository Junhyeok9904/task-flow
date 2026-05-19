'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ChecklistPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.checked).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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

  const toggleCheck = async (task: any) => {
    const newChecked = !task.checked;
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checked: newChecked } : t));
    
    // Background sync
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update', 
        id: task.id, 
        updates: { checked: newChecked } 
      }),
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-emerald-400 bg-[#08090d] font-sans">로딩중...</div>;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 p-6 relative z-10 pt-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-900">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Daily Routines
              </h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Checklist
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium">Keep track of your daily development tasks and routines.</p>
          </div>
          <Link 
            href="/progress" 
            className="px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 border border-gray-700 rounded-xl hover:text-white font-bold text-xs transition duration-300 shadow-lg shrink-0"
          >
            ← 메인 대시보드로 이동
          </Link>
        </div>

        {/* Progress Widget */}
        <div className="bg-[#13161f]/60 backdrop-blur-md border border-gray-800/80 rounded-3xl p-6 shadow-2xl flex items-center gap-6">
          {/* Circular Progress (CSS Hack using conic-gradient) */}
          <div className="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center bg-[#181b24] shadow-inner"
               style={{ background: `conic-gradient(#10b981 ${progress}%, #1f2937 ${progress}% 100%)` }}>
            <div className="absolute inset-2 bg-[#13161f] rounded-full flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-emerald-400">{progress}%</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Today's Progress</h3>
            <p className="text-sm text-gray-400 mb-3">You have completed {completedTasks} out of {totalTasks} tasks.</p>
            {progress === 100 ? (
              <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 inline-block px-3 py-1.5 rounded-lg border border-emerald-500/20">
                🎉 All tasks completed for today!
              </p>
            ) : (
              <p className="text-xs font-semibold text-amber-400 bg-amber-500/10 inline-block px-3 py-1.5 rounded-lg border border-amber-500/20">
                🚀 Keep going! You're doing great.
              </p>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="bg-[#13161f]/40 backdrop-blur-md border border-gray-800/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-[#0f1118]/80">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">To-Do Items</h3>
            <span className="text-xs text-gray-500 font-mono">{tasks.length} items</span>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {tasks.map(task => (
              <div 
                key={task.id}
                onClick={() => toggleCheck(task)}
                className={`p-5 flex items-start gap-4 cursor-pointer transition-all duration-300 hover:bg-[#181b24] group ${task.checked ? 'bg-[#13161f]/80' : ''}`}
              >
                {/* Custom Checkbox */}
                <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  task.checked 
                    ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                    : 'border-gray-600 bg-[#12131a] group-hover:border-emerald-500/50'
                }`}>
                  {task.checked && <span className="text-sm font-black">✓</span>}
                </div>

                {/* Content */}
                <div className={`flex-1 transition-all duration-300 ${task.checked ? 'opacity-50' : 'opacity-100'}`}>
                  <h4 className={`text-base font-bold transition-all duration-300 ${task.checked ? 'text-gray-500 line-through' : 'text-gray-200 group-hover:text-emerald-400'}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed pr-8">
                      {task.description}
                    </p>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="shrink-0 mt-1">
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md border ${
                    task.checked 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {task.checked ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            
            {tasks.length === 0 && (
              <div className="p-12 text-center text-gray-500 text-sm font-semibold">
                새로운 작업이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
