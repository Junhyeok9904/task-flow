import React from 'react';

// Common shimmer/pulse utility classes
const basePulse = "animate-pulse bg-white/5 border border-white/5 rounded-2xl";

export function SkeletonCircle({ className = "w-12 h-12" }: { className?: string }) {
  return <div className={`${basePulse} rounded-full ${className}`} aria-hidden="true" />;
}

export function SkeletonLine({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`${basePulse} !rounded-lg ${className}`} aria-hidden="true" />;
}

export function SkeletonCard({ className = "h-32" }: { className?: string }) {
  return (
    <div className={`${basePulse} p-5 flex flex-col justify-between ${className}`} aria-hidden="true">
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-3 w-3/4" />
      </div>
      <SkeletonLine className="h-3 w-1/4" />
    </div>
  );
}

// 1. Dashboard Skeleton (Main Page)
export function DashboardSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-transparent text-[#cfd3db] font-sans overflow-hidden select-none" aria-busy="true" aria-label="Loading workspace">
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* PANEL 0: Vertical App Utility strip */}
        <aside className="w-16 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col items-center py-6 justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-pulse" />
            <div className="flex flex-col items-center gap-5 w-full mt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        </aside>

        {/* PANEL 1: Left Playlist Explorer Sidebar */}
        <aside className="w-60 bg-black/30 backdrop-blur-3xl border-r border-white/5 flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.3)] z-10">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-3">
              <SkeletonLine className="h-5 w-1/2" />
              <SkeletonLine className="h-4 w-3/4" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
                  <SkeletonLine className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/5 bg-black/20 space-y-2">
            <SkeletonLine className="h-3 w-1/3" />
            <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
          </div>
        </aside>

        {/* PANEL 2: Center Search & Grid Browser Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
          <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/10 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4 flex-1 max-w-lg">
              <div className="h-9 bg-white/5 rounded-xl w-full border border-white/5 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-24 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-6 w-1/4" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-7 w-16 bg-white/5 rounded-full border border-white/5 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Grid layout skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className={`${basePulse} p-4 flex flex-col gap-3 h-48 justify-between`}>
                  <div className="w-full h-24 bg-white/5 rounded-xl animate-pulse" />
                  <div className="space-y-2">
                    <SkeletonLine className="h-3.5 w-3/4" />
                    <SkeletonLine className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* PANEL 3: Right Side Track Details HUD */}
        <aside className="w-80 bg-black/35 backdrop-blur-3xl border-l border-white/5 flex flex-col overflow-hidden shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.3)] z-10">
          <div className="p-6 flex flex-col items-center text-center space-y-6 flex-1 overflow-y-auto">
            <div className="w-full aspect-square max-w-[200px] bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
            <div className="space-y-2 w-full flex flex-col items-center">
              <SkeletonLine className="h-5 w-2/3" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
            <div className="w-full space-y-3 pt-4 border-t border-white/5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between">
                  <SkeletonLine className="h-3 w-1/4" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Persistent Media Player Bar */}
      <footer className="h-24 bg-black/50 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-8 z-30 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4 w-1/4">
          <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse" />
          <div className="space-y-1 flex-1">
            <SkeletonLine className="h-3.5 w-3/4" />
            <SkeletonLine className="h-2.5 w-1/2" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 w-2/4 max-w-xl">
          <div className="flex items-center gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-5 h-5 rounded-full bg-white/5 animate-pulse" />
            ))}
          </div>
          <div className="w-full flex items-center gap-3">
            <SkeletonLine className="h-1 flex-1" />
          </div>
        </div>
        <div className="w-1/4 flex justify-end items-center gap-3">
          <div className="w-20 h-1 bg-white/5 animate-pulse" />
        </div>
      </footer>
    </div>
  );
}

// 2. Checklist Skeleton
export function ChecklistSkeleton() {
  return (
    <div className="min-h-screen bg-transparent text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none" aria-busy="true" aria-label="Loading checklist">
      <div className="max-w-4xl mx-auto space-y-8 p-6 relative z-10 pt-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-48" />
            <SkeletonLine className="h-4 w-72" />
          </div>
          <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
        </div>

        {/* Progress Widget */}
        <div className="bg-black/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center gap-8 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center" />
          <div className="flex-1 space-y-3">
            <SkeletonLine className="h-5 w-1/3" />
            <SkeletonLine className="h-4 w-1/2" />
            <SkeletonLine className="h-6 w-32" />
          </div>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-5 flex items-start gap-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-3/4" />
                <SkeletonLine className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. Board Skeleton (Kanban)
export function BoardSkeleton() {
  return (
    <div className="min-h-screen bg-transparent text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none" aria-busy="true" aria-label="Loading task board">
      <div className="max-w-7xl mx-auto space-y-6 p-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-48" />
            <SkeletonLine className="h-4 w-72" />
          </div>
          <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
        </div>

        {/* Kanban Board Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
          {['todo', 'in_progress', 'completed'].map((col, idx) => (
            <div key={col} className="bg-black/20 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              
              {/* Column Header */}
              <div className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-white/10 animate-pulse" />
                  <SkeletonLine className="h-4 w-24" />
                </div>
                <div className="h-4 w-8 bg-white/5 rounded animate-pulse" />
              </div>

              {/* Items List */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3 animate-pulse">
                    <SkeletonLine className="h-4 w-5/6" />
                    <SkeletonLine className="h-3 w-2/3" />
                    <div className="h-5 w-16 bg-white/5 rounded-full border border-white/5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Progress Dashboard Skeleton
export function ProgressSkeleton() {
  return (
    <div className="min-h-screen bg-transparent text-[#cfd3db] font-sans pb-32 relative overflow-hidden select-none" aria-busy="true" aria-label="Loading status summary">
      <div className="max-w-7xl mx-auto space-y-8 p-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-56" />
            <SkeletonLine className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
            <div className="h-10 w-24 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-black/30 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 space-y-3 animate-pulse">
              <SkeletonLine className="h-3 w-1/2" />
              <SkeletonLine className="h-8 w-1/3" />
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden" />
            </div>
          ))}
        </div>

        {/* Dynamic Interactive Progress Hub (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Progress Chart Panel */}
          <div className="lg:col-span-2 bg-black/35 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 animate-pulse">
            <SkeletonLine className="h-6 w-1/4" />
            <div className="h-64 bg-white/5 rounded-2xl border border-white/5" />
          </div>

          {/* Quick Shortcuts / Settings widgets */}
          <div className="bg-black/35 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="space-y-4">
              <SkeletonLine className="h-6 w-1/2" />
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3 w-2/3">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="space-y-2 flex-1">
                      <SkeletonLine className="h-3.5 w-3/4" />
                      <SkeletonLine className="h-2.5 w-1/2" />
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. Reusable Empty State View
export function EmptyState({ 
  title = "데이터가 없습니다", 
  description = "여기에 표시할 항목이 아직 추가되지 않았습니다.", 
  actionLabel, 
  onAction 
}: { 
  title?: string; 
  description?: string; 
  actionLabel?: string; 
  onAction?: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-2xl text-gray-500 shadow-inner">
        📂
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/30 rounded-xl text-xs font-bold transition duration-300 shadow-lg"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// 6. Reusable Error Fallback UI with Retry CTA
export function ErrorState({ 
  title = "연결 오류 발생", 
  message = "데이터를 로드하는 도중 문제가 발생했습니다.", 
  onRetry 
}: { 
  title?: string; 
  message?: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-5 rounded-3xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl shadow-2xl">
      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
        ⚠️
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-rose-400 tracking-wide">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed break-all font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 rounded-xl text-xs font-bold tracking-wide transition duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)] active:scale-95"
        >
          🔄 다시 시도하기
        </button>
      )}
    </div>
  );
}
