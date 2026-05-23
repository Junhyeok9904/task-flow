'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAudioPlayer } from '../contexts/AudioProvider';
import { Icon } from './ui/Icon';
import { MediaFile, Playlist } from '../types';

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface QueueItemProps {
  file: MediaFile;
  idx: number;
  isActive: boolean;
  onRemove: (index: number) => void;
  onPlay: (file: MediaFile) => void;
  getGradient: (title: string) => string;
}

function QueueItem({ file, idx, isActive, onRemove, onPlay, getGradient }: QueueItemProps) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff < 0) {
      setOffsetX(Math.max(diff, -100));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -70) {
      setIsDeleting(true);
      setOffsetX(-350);
      setTimeout(() => {
        onRemove(idx);
      }, 200);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-xl border border-white/5 bg-[#0f1118]/80 transition-all duration-300 ${
        isDeleting ? 'max-h-0 opacity-0 mb-0 py-0 border-0' : 'max-h-16 mb-2 py-0'
      }`}
    >
      {/* Background Delete Action Reveal */}
      <div 
        className="absolute inset-y-0 right-0 bg-rose-600 flex items-center justify-end px-5 transition-all duration-200"
        style={{ width: `${Math.abs(offsetX)}px`, opacity: offsetX < -15 ? 1 : 0 }}
      >
        <div className="text-white text-[10px] font-bold flex items-center gap-1 shrink-0">
          <Icon name="trash" size={13} className="text-white shrink-0 mr-1" />
          <span className={offsetX < -70 ? "scale-105 transition-transform" : ""}>삭제</span>
        </div>
      </div>

      {/* Foreground Swipable Item */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onPlay(file)}
        className={`flex items-center justify-between p-2.5 cursor-pointer select-none active:bg-white/5 ${
          isActive ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''
        }`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(file.name)} flex items-center justify-center shrink-0 shadow overflow-hidden`}>
            {file.coverArt ? (
              <img src={file.coverArt} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-white">💿</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold truncate pr-2 ${isActive ? 'text-emerald-400' : 'text-white'}`}>
              {file.name.split('/').pop()}
            </p>
            <p className="text-[8px] text-gray-500 font-medium uppercase tracking-wider font-mono truncate">
              {file.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">재생 중</span>
          ) : (
            <span className="text-[8px] text-gray-600 font-mono">#{idx + 1}</span>
          )}
          <div className="text-gray-600 select-none px-0.5 text-[10px]">☰</div>
        </div>
      </div>
    </div>
  );
}

export function MobileContainer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') || 'songs';

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
    toast,
    showToast,
    removeFromQueue,
  } = useAudioPlayer();

  // Mobile layout state
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'nowplaying' | 'queue'>('nowplaying');

  // Fetch playlists for add-to-playlist bottom sheet
  const loadPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        setPlaylists(await res.json());
      }
    } catch (e) {
      console.error('Failed to load playlists in mobile container', e);
    }
  };

  useEffect(() => {
    if (isMobilePlayerOpen) {
      loadPlaylists();
    }
  }, [isMobilePlayerOpen]);

  const handleAddCurrentToPlaylist = async (playlistId: string, playlistName: string) => {
    if (!currentFile) return;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addItem', id: playlistId, itemPath: currentFile.path })
      });
      const data = await res.json();
      
      if (data.duplicate) {
        // Handle duplicate gracefully on mobile with toast warning
        showToast(`'${currentFile.name}'은(는) '${playlistName}'에 이미 존재합니다.`, 'warning');
      } else {
        showToast(`'${playlistName}' 플레이리스트에 추가되었습니다.`);
      }
      setIsAddToPlaylistOpen(false);
    } catch (e) {
      console.error(e);
      showToast('플레이리스트 추가 실패', 'error');
    }
  };

  // Unique glowing gradients based on song titles
  const getGradientFromTitle = (title: string) => {
    const hash = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-pink-500 via-rose-500 to-red-500',
      'from-purple-600 via-indigo-500 to-blue-500',
      'from-blue-500 via-cyan-500 to-teal-400',
      'from-emerald-400 via-teal-500 to-indigo-600',
      'from-amber-400 via-orange-500 to-rose-500',
      'from-violet-500 via-fuchsia-500 to-pink-500'
    ];
    return gradients[hash % gradients.length];
  };

  // Check active state of tabs
  const isLibraryActive = pathname === '/' && activeView === 'songs';
  const isPlaylistsActive = pathname === '/' && activeView === 'playlists';
  const isTasksActive = pathname === '/progress';
  const isChecklistActive = pathname === '/checklist';

  return (
    <div className="md:hidden">
      
      {/* ─── Mobile Toast Alert Notification ─── */}
      {toast && (
        <div className="fixed top-6 left-4 right-4 z-9999 flex justify-center pointer-events-none animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-3xl text-xs font-bold flex items-center gap-2 max-w-[90%]
            ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400' : ''}
            ${toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/40 text-rose-400' : ''}
            ${toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500/40 text-amber-400' : ''}
          `}>
            <span>{toast.type === 'success' ? '✅' : (toast.type === 'error' ? '🚨' : '⚠️')}</span>
            <span className="truncate leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ─── Floating Mobile Mini Player (Shown when playing and full screen sheet is closed) ─── */}
      {currentFile && !isMobilePlayerOpen && (
        <div 
          onClick={() => setIsMobilePlayerOpen(true)}
          className="fixed bottom-[74px] left-4 right-4 h-14 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-between px-4 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-pointer active:scale-[0.98] transition-all"
        >
          {/* Top Progress Line (currentTime / duration ratio) */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 rounded-t-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Left: Track Information */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradientFromTitle(currentFile.name)} flex items-center justify-center shrink-0 shadow overflow-hidden`}>
              {currentFile.coverArt ? (
                <img src={currentFile.coverArt} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-white">💿</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate pr-2">{currentFile.name.split('/').pop()}</p>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider font-mono truncate">{currentFile.artist || 'Unknown Artist'}</p>
            </div>
          </div>

          {/* Right: Simple controls (prevent event bubbling to open full screen player) */}
          <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
            <button 
              onClick={togglePlay}
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-transform bg-black/40 border border-white/10"
            >
              <img 
                src={isPlaying ? "/images/premium_pause_icon.png" : "/images/premium_play_icon.png"} 
                alt={isPlaying ? "Pause" : "Play"} 
                className="w-full h-full object-cover scale-110"
              />
            </button>
            <button 
              onClick={() => handleNext(false)}
              className="text-gray-400 hover:text-emerald-400 active:scale-90 transition-transform p-1 flex items-center justify-center"
            >
              <Icon name="skip-forward" size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Mobile Bottom Tab Bar (iOS Native Style) ─── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#090a0f]/80 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around z-40 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.8)] select-none">
        
        {/* Library Tab */}
        <button 
          onClick={() => { router.push('/'); }}
          className={`flex flex-col items-center justify-center w-16 h-full transition relative ${isLibraryActive ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <Icon name="home" size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Library</span>
          {isLibraryActive && (
            <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
          )}
        </button>

        {/* Playlists Tab */}
        <button 
          onClick={() => { router.push('/?view=playlists'); }}
          className={`flex flex-col items-center justify-center w-16 h-full transition relative ${isPlaylistsActive ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <Icon name="library" size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Playlists</span>
          {isPlaylistsActive && (
            <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
          )}
        </button>

        {/* Tasks Tab */}
        <button 
          onClick={() => { router.push('/progress'); }}
          className={`flex flex-col items-center justify-center w-16 h-full transition relative ${isTasksActive ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <Icon name="analytics" size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Tasks</span>
          {isTasksActive && (
            <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
          )}
        </button>

        {/* Checklist Tab */}
        <button 
          onClick={() => { router.push('/checklist'); }}
          className={`flex flex-col items-center justify-center w-16 h-full transition relative ${isChecklistActive ? 'text-emerald-400' : 'text-gray-500'}`}
        >
          <Icon name="menu" size={20} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Checklist</span>
          {isChecklistActive && (
            <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
          )}
        </button>
      </nav>

      {currentFile && (
        <div className={`fixed inset-0 bg-[#07080b]/98 z-50 flex flex-col p-6 overflow-hidden select-none transition-all duration-500 ease-[cubic-bezier(0.32,0.94,0.6,1)] ${
          isMobilePlayerOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}>
          
          {/* Top Panel HUD */}
          <header className="flex justify-between items-center shrink-0 mb-6">
            <button 
              onClick={() => setIsMobilePlayerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 active:scale-95 transition-transform"
            >
              <span className="text-white text-base">▼</span>
            </button>
            <div className="flex bg-white/5 p-0.5 rounded-full border border-white/5 relative z-10">
              <button
                onClick={() => setActiveSubTab('nowplaying')}
                className={`px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest transition-all duration-300 ${
                  activeSubTab === 'nowplaying' ? 'bg-emerald-500 text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                NOW PLAYING
              </button>
              <button
                onClick={() => setActiveSubTab('queue')}
                className={`px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest transition-all duration-300 ${
                  activeSubTab === 'queue' ? 'bg-emerald-500 text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                QUEUE ({queue.length})
              </button>
            </div>
            <div className="w-10 h-10"></div> {/* Spacer for symmetry */}
          </header>

          {/* Central Content Area (Now Playing Cover Art OR Queue List) */}
          <div className="flex-1 flex flex-col items-center justify-center my-4 min-h-0 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-indigo-500/5 to-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            {activeSubTab === 'nowplaying' ? (
              <div className={`aspect-square w-full max-w-[290px] rounded-3xl bg-gradient-to-br ${getGradientFromTitle(currentFile.name)} flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden transition-all duration-500 ${isPlaying ? 'scale-[1.03]' : 'scale-95 opacity-80'}`}>
                {currentFile.coverArt ? (
                  <img src={currentFile.coverArt} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-sm">
                    <div className={`w-32 h-32 rounded-full border-8 border-black/40 bg-gray-900/90 flex items-center justify-center shadow-2xl relative ${isPlaying ? 'animate-spin [animation-duration:15s]' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <span className="text-white text-lg">💿</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full max-w-[340px] flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">플레이리스트 대기열</span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">{queueIndex + 1} / {queue.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 select-none space-y-1">
                  {queue.length > 0 ? (
                    queue.map((file, idx) => (
                      <QueueItem
                        key={`${file.id || file.path}-${idx}`}
                        file={file}
                        idx={idx}
                        isActive={idx === queueIndex}
                        onRemove={removeFromQueue}
                        onPlay={playFile}
                        getGradient={getGradientFromTitle}
                      />
                    ))
                  ) : (
                    <div className="text-center py-20 shrink-0">
                      <p className="text-xs text-gray-500">대기열이 비어 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Control Area */}
          <div className="space-y-6 shrink-0 pb-safe">
            
            {/* Title / Artist info */}
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold text-white tracking-wide truncate max-w-[85%]">{currentFile.name.split('/').pop()}</h2>
                <p className="text-sm text-emerald-400 font-bold tracking-wide mt-1 uppercase font-mono">{currentFile.artist || 'Unknown Artist'}</p>
              </div>
              <button 
                onClick={() => setIsAddToPlaylistOpen(true)}
                className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 active:scale-95 transition-transform"
                title="Add to playlist"
              >
                <Icon name="plus" size={18} />
              </button>
            </div>

            {/* Time seeker slider */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={e => seekTo(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls Row */}
            <div className="flex justify-between items-center px-4">
              {/* Shuffle button */}
              <button 
                onClick={toggleShuffle}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isShuffle ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
                title="Shuffle"
              >
                <Icon name="shuffle" size={18} />
              </button>

              {/* Prev button */}
              <button 
                onClick={handlePrev}
                className="w-12 h-12 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 active:scale-90 transition-transform"
                title="Previous Track"
              >
                <Icon name="skip-back" size={24} />
              </button>

              {/* Huge central Play/Pause */}
              <button 
                onClick={togglePlay}
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-black/60 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-[0.93] transition-all"
                title={isPlaying ? "Pause" : "Play"}
              >
                <img 
                  src={isPlaying ? "/images/premium_pause_icon.png" : "/images/premium_play_icon.png"} 
                  alt={isPlaying ? "Pause" : "Play"} 
                  className="w-full h-full object-cover scale-105"
                />
              </button>

              {/* Next button */}
              <button 
                onClick={() => handleNext(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 active:scale-90 transition-transform"
                title="Next Track"
              >
                <Icon name="skip-forward" size={24} />
              </button>

              {/* Repeat button */}
              <button 
                onClick={toggleRepeat}
                className={`w-10 h-10 flex items-center justify-center rounded-full relative transition-all ${repeatMode !== 'none' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
                title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
              >
                <Icon name="repeat" size={18} />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-full font-black scale-90">1</span>
                )}
              </button>
            </div>

            {/* Volume bar */}
            <div className="flex items-center gap-3 bg-[#121318]/50 p-3 rounded-2xl border border-white/5">
              <span className="text-xs text-gray-500 shrink-0">🔇</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volume} 
                onChange={e => setVolume(parseFloat(e.target.value))} 
                className="flex-1 h-1 bg-gray-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-emerald-400 shrink-0">🔊</span>
            </div>

          </div>

          {/* ─── Bottom Sheet: Add To Playlist Modal ─── */}
          {isAddToPlaylistOpen && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-99 flex flex-col justify-end p-4">
              <div className="bg-[#0f1118] border border-white/5 rounded-3xl w-full max-h-[70vh] flex flex-col p-6 shadow-2xl animate-slide-up">
                <header className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">플레이리스트 선택</h3>
                  <button 
                    onClick={() => setIsAddToPlaylistOpen(false)}
                    className="text-xs font-bold text-gray-500 hover:text-white"
                  >
                    닫기
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto space-y-2 pb-6">
                  {playlists.length > 0 ? (
                    playlists.map(pl => (
                      <button
                        key={pl.id}
                        onClick={() => handleAddCurrentToPlaylist(pl.id, pl.name)}
                        className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/20 rounded-xl transition text-left active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base shrink-0">💿</span>
                          <span className="text-xs text-gray-200 font-semibold truncate">{pl.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">{pl.items.length}곡</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-xs text-gray-500">생성된 플레이리스트가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
