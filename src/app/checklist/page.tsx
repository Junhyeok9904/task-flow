'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChecklistSkeleton, ErrorState, EmptyState } from '../../components/Skeletons';

export default function ChecklistPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.checked).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error("서버에서 루틴 목록을 가져오지 못했습니다.");
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

  const toggleCheck = async (task: any) => {
    const newChecked = !task.checked;
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checked: newChecked } : t));
    
    // Background sync
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          id: task.id, 
          updates: { checked: newChecked } 
        }),
      });
      if (!res.ok) throw new Error("업데이트 실패");
    } catch (e) {
      console.error(e);
      // Rollback on failure
      loadTasks();
    }
  };

  if (loading) return <ChecklistSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6">
        <ErrorState 
          title="체크리스트 로드 실패" 
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
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 p-6 relative z-10 pt-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-gray-900">
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
            className="px-5 py-2.5 w-full md:w-auto text-center bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 border border-gray-700 rounded-xl hover:text-white font-bold text-xs transition duration-300 shadow-lg shrink-0"
          >
            ← 메인 대시보드로 이동
          </Link>
        </div>

        {/* Progress Widget */}
        <div className="bg-black/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 sm:gap-8">
          {/* Circular Progress */}
          <div className="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center bg-[#181b24] shadow-[0_0_30px_rgba(16,185,129,0.2)]"
               style={{ background: `conic-gradient(#10b981 ${progress}%, #1f2937 ${progress}% 100%)` }}>
            <div className="absolute inset-2 bg-[#0a0b10] rounded-full flex flex-col items-center justify-center">
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

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => (
            <div 
              key={task.id}
              onClick={() => toggleCheck(task)}
              className={`p-5 flex flex-col gap-3 rounded-2xl backdrop-blur-xl border cursor-pointer transition-all duration-300 group ${
                task.checked 
                  ? 'bg-emerald-950/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:bg-emerald-950/20' 
                  : 'bg-blue-950/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)] hover:bg-blue-950/20 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-4">
                  {/* Custom Checkbox */}
                  <div className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                    task.checked 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                      : 'border-blue-500/50 bg-black/40 group-hover:border-blue-400'
                  }`}>
                    {task.checked && <span className="text-sm font-black">✓</span>}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h4 className={`text-base font-bold transition-all duration-300 ${task.checked ? 'text-gray-400 line-through' : 'text-gray-100 group-hover:text-blue-400'}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className={`text-[10px] font-bold tracking-wide shrink-0 ${
                  task.checked ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {task.checked ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="col-span-2 py-8">
              <EmptyState 
                title="등록된 데일리 루틴이 없습니다" 
                description="할 일 목록을 만들거나 칸반 보드에서 작업을 생성해보세요."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
