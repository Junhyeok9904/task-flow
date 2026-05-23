'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MediaFile, Playlist } from '../types';
import Link from 'next/link';
import { useUpload } from '../components/UploadManager';
import { useAudioPlayer } from '../contexts/AudioProvider';
import { DashboardSkeleton, ErrorState, EmptyState } from '../components/Skeletons';

// Custom Hooks for Stage 2 modularization
import { useMediaFiles } from '../hooks/useMediaFiles';
import { usePlaylistActions } from '../hooks/usePlaylistActions';
import { useTunnelState } from '../hooks/useTunnelState';

// Modular UI Components
import { PlaylistExplorerSidebar } from '../components/PlaylistExplorerSidebar';
import { CenterHeader } from '../components/CenterHeader';
import { TrackInspector } from '../components/TrackInspector';
import { BottomMediaPlayerBar } from '../components/BottomMediaPlayerBar';
import { PlaylistsView } from '../components/PlaylistsView';
import { UploadView } from '../components/UploadView';
import { RecentView } from '../components/RecentView';

// Stage 1 Components
import { GridSongCard } from '../components/GridSongCard';
import { ListSongRow } from '../components/ListSongRow';
import { FloatingContextMenu } from '../components/FloatingContextMenu';

function HomeContent() {
  const { enqueueFiles, tasks } = useUpload();
  const [mounted, setMounted] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [view, setView] = useState<'songs' | 'playlists' | 'upload' | 'recent'>('songs');
  
  const searchParams = useSearchParams();
  const queryView = searchParams.get('view');

  useEffect(() => {
    if (queryView && ['songs', 'playlists', 'upload', 'recent'].includes(queryView)) {
      setView(queryView as any);
    } else if (!queryView) {
      setView('songs');
    }
  }, [queryView]);
  
  const {
    currentFile, setCurrentFile, isPlaying, setIsPlaying, currentTime, setCurrentTime,
    duration, setDuration, volume, setVolume, queue, setQueue, queueIndex, setQueueIndex,
    repeatMode, setRepeatMode, isShuffle, setIsShuffle, getMediaEl,
    playPlaylistRewrite, playPlaylistAppend, handlePrev, handleNext, playFile, togglePlay,
    seekBy, toggleShuffle, toggleRepeat, addToQueueNext, showToast
  } = useAudioPlayer();

  // Dialog and popup UI states kept in layout level
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [activePlaylistsOpen, setActivePlaylistsOpen] = useState(true);
  const [activeQueueOpen, setActiveQueueOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [activeGenreTag, setActiveGenreTag] = useState<string>('Ambient Electronica');
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ track: MediaFile; x: number; y: number } | null>(null);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  const handleMenuClick = (e: React.MouseEvent, track: MediaFile) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({ track, x: e.clientX, y: e.clientY });
  };

  const showAlert = (title: string, message: string, isDanger: boolean = false) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: '확인',
      isDanger,
      isAlert: true,
      onConfirm: () => {}
    });
  };

  // Mount logic triggers synchronization state hooks
  const {
    mediaFiles, loading, error, search, setSearch, sortBy, setSortBy,
    activeFilterTag, setActiveFilterTag, currentFolder, setCurrentFolder,
    selectedTracksList, setSelectedTracksList, selectedTrack, setSelectedTrack,
    loadData, deleteFile, deleteSelectedTracks, toggleSelectTrack
  } = useMediaFiles(playlists, setPlaylists, setConfirmDialog, showAlert);

  const {
    newPlaylistName, setNewPlaylistName,
    selectedPlaylistId, setSelectedPlaylistId,
    duplicateModal, setDuplicateModal,
    createPlaylist, deletePlaylist,
    handleAddTrack, handleAddBatchTracks,
    handleResolveDuplicate, togglePlaylistItem
  } = usePlaylistActions(playlists, mediaFiles, selectedTracksList, setSelectedTracksList, loadData, setConfirmDialog, showAlert);

  const { tunnelUrl, isTunneling, tunnelLoading, toggleTunnel } = useTunnelState();

  // Folder helper computing
  const getParentFolder = (filePath: string) => {
    const relative = filePath.replace(/^\/media\//, '');
    const parts = relative.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  };

  const sortedSongs = [...mediaFiles].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
    return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
  });

  const currentFolders = Array.from(new Set(
    sortedSongs
      .map(s => getParentFolder(s.path))
      .filter(p => {
        if (!p) return false;
        return currentFolder === '' ? true : p.startsWith(currentFolder + '/');
      })
      .map(p => {
        if (currentFolder === '') return p.split('/')[0];
        const relative = p.slice(currentFolder.length + 1);
        return relative.split('/')[0];
      })
  )).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const currentSongs = sortedSongs.filter(s => getParentFolder(s.path) === currentFolder);

  // Sync success counts
  const prevSuccessCount = useRef(0);
  const successCount = tasks.filter(t => t.status === 'SUCCESS').length;
  useEffect(() => {
    if (successCount > prevSuccessCount.current) {
      loadData();
    }
    prevSuccessCount.current = successCount;
  }, [successCount, loadData]);

  // Folder navigation and upload dropping
  const handleUpload = (files: FileList | null) => {
    if (files?.length) enqueueFiles(Array.from(files), currentFolder);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#08090d] p-6">
        <ErrorState title="서버 데이터 로드 실패" message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-transparent text-[#cfd3db] font-sans overflow-hidden select-none">
      
      {/* Main Panel Workspaces */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* PANEL 0: Vertical Strip */}
        <aside className="hidden md:flex w-16 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex-col items-center py-6 justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <span className="text-black text-sm">🟢</span>
            </div>
            
            <div className="flex flex-col items-center gap-5 w-full mt-4">
              <button onClick={() => { setView('songs'); setSelectedPlaylistId(null); }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-emerald-400 relative transition" title="Library">
                <span className="text-xl">🏠</span>
              </button>
              
              <button onClick={() => setView('playlists')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">💿</span>
              </button>
              
              <Link href="/progress" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">📊</span>
              </Link>
              
              <button onClick={() => setView('upload')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">☁️</span>
              </button>
              
              <button onClick={() => setView('recent')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">🕒</span>
              </button>
            </div>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border border-gray-800 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-white">JK</span>
          </div>
        </aside>

        {/* PANEL 1: Playlist Explorer Sidebar */}
        <PlaylistExplorerSidebar
          view={view}
          setView={setView}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
          playlists={playlists}
          deletePlaylist={deletePlaylist}
          activePlaylistsOpen={activePlaylistsOpen}
          setActivePlaylistsOpen={setActivePlaylistsOpen}
          activeQueueOpen={activeQueueOpen}
          setActiveQueueOpen={setActiveQueueOpen}
          isTunneling={isTunneling}
          tunnelUrl={tunnelUrl}
          tunnelLoading={tunnelLoading}
          toggleTunnel={toggleTunnel}
          showAlert={showAlert}
          currentFile={currentFile}
        />

        {/* PANEL 2: Main center panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0b0c10]" onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <CenterHeader search={search} setSearch={setSearch} />

          {/* Subheader Filter tag buttons */}
          <div className="px-4 md:px-6 py-2.5 border-b border-gray-900 bg-[#0b0c10]/10 flex items-center justify-between shrink-0 z-10 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold shrink-0">Tags</span>
              <div className="flex gap-2 overflow-x-auto pb-0.5 whitespace-nowrap scrollbar-none flex-nowrap min-w-0 flex-1">
                {['Ambient Electronica', 'Synthwave Hits', '80s Retro'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveGenreTag(tag)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border shrink-0 ${activeGenreTag === tag ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24]'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden sm:flex gap-2 text-[10px] font-semibold text-gray-400">
              {['Tags ∨', 'Upload Date ∨', 'Bitrate ∨'].map(txt => (
                <div key={txt} className="px-2 py-1 bg-[#12131a] hover:bg-[#181b24] border border-gray-800 rounded-lg cursor-pointer transition">{txt}</div>
              ))}
            </div>
          </div>

          <div className="px-6 pt-5 pb-2.5 flex items-center justify-between shrink-0">
            {selectedTracksList.length > 0 ? (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-pulse">
                <span className="text-[10px] text-rose-400 font-bold font-mono">{selectedTracksList.length} Selected</span>
                <button onClick={deleteSelectedTracks} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition">🗑 선택 삭제</button>
                <button onClick={() => setSelectedTracksList([])} className="text-gray-400 hover:text-white text-[10px] font-semibold">Cancel</button>
              </div>
            ) : (
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Library Workspace</h2>
            )}
            
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span>{currentSongs.length} tracks ({sortedSongs.length} total)</span>
              <div className="bg-[#12131a] p-0.5 rounded-lg border border-gray-800 flex gap-0.5">
                <button onClick={() => setLayoutMode('grid')} className={`p-1 rounded transition ${layoutMode === 'grid' ? 'bg-[#181b24] text-white' : 'text-gray-500 hover:text-gray-300'}`}>🎴</button>
                <button onClick={() => setLayoutMode('list')} className={`p-1 rounded transition ${layoutMode === 'list' ? 'bg-[#181b24] text-white' : 'text-gray-500 hover:text-gray-300'}`}>📜</button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative">
            {dragOver && (
              <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-sm border-2 border-dashed border-emerald-500/50 m-4 rounded-2xl flex items-center justify-center z-40 transition-all pointer-events-none">
                <div className="text-center">
                  <p className="text-5xl animate-bounce">☁️</p>
                  <p className="text-sm font-bold text-emerald-400 mt-2">Drop to upload to media library</p>
                </div>
              </div>
            )}

            {view === 'songs' && (
              <>
                <div className="flex items-center gap-2 mb-6 bg-[#13161f]/40 border border-gray-900/60 rounded-xl px-4 py-2.5 text-xs text-gray-400 backdrop-blur-md">
                  <button onClick={() => setCurrentFolder('')} className={`hover:text-emerald-400 font-bold transition ${currentFolder === '' ? 'text-emerald-400 font-extrabold' : 'text-gray-300'}`}>🏠 Home</button>
                  {currentFolder.split('/').filter(Boolean).map((part, idx, arr) => {
                    const target = arr.slice(0, idx + 1).join('/');
                    const isLast = idx === arr.length - 1;
                    return (
                      <React.Fragment key={target}>
                        <span className="text-gray-600">/</span>
                        <button onClick={() => setCurrentFolder(target)} className={`hover:text-emerald-400 font-bold transition ${isLast ? 'text-emerald-400 font-extrabold' : 'text-gray-300'}`}>{part}</button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {layoutMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
                    {currentFolders.map(fName => {
                      const path = currentFolder ? `${currentFolder}/${fName}` : fName;
                      const count = sortedSongs.filter(s => getParentFolder(s.path) === path || getParentFolder(s.path).startsWith(path + '/')).length;
                      return (
                        <div key={path} onClick={() => setCurrentFolder(path)} className="group bg-[#13161f]/80 rounded-2xl p-4 border border-gray-900 transition hover:bg-[#161a25]/90 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] cursor-pointer flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">📂</div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-xs text-white truncate group-hover:text-emerald-400 transition" title={fName}>{fName}</h3>
                            <span className="text-[10px] text-gray-500 block">{count} tracks</span>
                          </div>
                          <div className="text-gray-600 group-hover:text-emerald-400 font-bold text-xs transition">➔</div>
                        </div>
                      );
                    })}

                    {currentSongs.map(f => (
                      <GridSongCard
                        key={f.path}
                        f={f}
                        isSelected={selectedTrack?.path === f.path}
                        isPlayingFile={isPlaying && currentFile?.path === f.path}
                        isChecked={selectedTracksList.includes(f.path)}
                        onSelect={() => setSelectedTrack(f)}
                        onToggleCheck={() => toggleSelectTrack(f.path)}
                        onPlay={() => playFile(f)}
                        onMenuClick={handleMenuClick}
                        addToQueueNext={addToQueueNext}
                        showToast={showToast}
                      />
                    ))}
                    {!currentFolders.length && !currentSongs.length && (
                      <div className="col-span-full py-8">
                        <EmptyState title="조회된 음악이 없습니다" description="업로드된 파일이 없거나 검색 결과가 없습니다." actionLabel="새 미디어 추가" onAction={() => setView('upload')} />
                      </div>
                    )}
                  </div>
                ) : (
                  (!currentFolders.length && !currentSongs.length) ? (
                    <div className="py-8"><EmptyState title="조회된 음악이 없습니다" description="업로드된 파일이 없거나 검색 결과가 없습니다." actionLabel="새 미디어 추가" onAction={() => setView('upload')} /></div>
                  ) : (
                    <div className="bg-[#13161f] rounded-2xl border border-gray-900 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[#0f1118]/80 text-gray-500 border-b border-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-center w-10">
                              <input type="checkbox" checked={currentSongs.length > 0 && currentSongs.every(s => selectedTracksList.includes(s.path))} onChange={e => setSelectedTracksList(e.target.checked ? currentSongs.map(s => s.path) : [])} className="w-3.5 h-3.5 rounded bg-[#12131a] border-gray-800 accent-emerald-500 cursor-pointer" />
                            </th>
                            <th className="px-4 py-3 text-left">Title</th>
                            <th className="px-4 py-3 text-center w-20 hidden sm:table-cell">Type</th>
                            <th className="px-4 py-3 text-right w-24 hidden sm:table-cell">Size</th>
                            <th className="px-4 py-3 text-center w-28">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentFolders.map(fName => {
                            const path = currentFolder ? `${currentFolder}/${fName}` : fName;
                            return (
                              <tr key={path} onClick={() => setCurrentFolder(path)} className="border-b border-gray-900/40 hover:bg-[#181b24]/50 cursor-pointer transition text-emerald-400 font-semibold">
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 flex items-center gap-2"><span>📂</span><span className="truncate max-w-xs">{fName}</span></td>
                                <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-900/20 text-emerald-400">FOLDER</span></td>
                                <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">-</td>
                                <td className="px-4 py-3 text-center"><span className="text-gray-500 hover:text-emerald-400">Open ➔</span></td>
                              </tr>
                            );
                          })}
                          {currentSongs.map(f => (
                            <ListSongRow
                              key={f.path}
                              f={f}
                              isSelected={selectedTrack?.path === f.path}
                              isPlayingFile={isPlaying && currentFile?.path === f.path}
                              isChecked={selectedTracksList.includes(f.path)}
                              onSelect={() => setSelectedTrack(f)}
                              onToggleCheck={() => toggleSelectTrack(f.path)}
                              onPlay={() => playFile(f)}
                              onDelete={() => deleteFile(f.name)}
                              onMenuClick={handleMenuClick}
                              addToQueueNext={addToQueueNext}
                              showToast={showToast}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </>
            )}

            {view === 'playlists' && (
              <PlaylistsView
                playlists={playlists}
                mediaFiles={mediaFiles}
                newPlaylistName={newPlaylistName}
                setNewPlaylistName={setNewPlaylistName}
                createPlaylist={createPlaylist}
                deletePlaylist={deletePlaylist}
                selectedPlaylistId={selectedPlaylistId}
                setSelectedPlaylistId={setSelectedPlaylistId}
                playPlaylistRewrite={playPlaylistRewrite}
                playPlaylistAppend={playPlaylistAppend}
                togglePlaylistItem={togglePlaylistItem}
                playFile={playFile}
                handleMenuClick={handleMenuClick}
                addToQueueNext={addToQueueNext}
                showToast={showToast}
              />
            )}

            {view === 'upload' && <UploadView dragOver={dragOver} setDragOver={setDragOver} handleUpload={handleUpload} onDrop={onDrop} />}
            {view === 'recent' && <RecentView mediaFiles={mediaFiles} />}
          </div>
        </main>

        {/* PANEL 3: Track Inspector details */}
        <aside className="hidden xl:flex w-80 bg-[#0f1118] border-l border-[#181b24] flex-col shrink-0 overflow-y-auto">
          <TrackInspector
            selectedTrack={selectedTrack}
            playFile={playFile}
            deleteFile={deleteFile}
            playlists={playlists}
            isPlaylistDropdownOpen={isPlaylistDropdownOpen}
            setIsPlaylistDropdownOpen={setIsPlaylistDropdownOpen}
            handleAddTrack={handleAddTrack}
          />
        </aside>
      </div>

      {/* Persistent Media Player Bar */}
      <BottomMediaPlayerBar
        currentFile={currentFile}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        handlePrev={handlePrev}
        handleNext={handleNext}
        isShuffle={isShuffle}
        toggleShuffle={toggleShuffle}
        repeatMode={repeatMode}
        toggleRepeat={toggleRepeat}
        currentTime={currentTime}
        duration={duration}
        seekBy={seekBy}
        getMediaEl={getMediaEl}
        setCurrentTime={setCurrentTime}
        volume={volume}
        setVolume={setVolume}
        queueIndex={queueIndex}
        queue={queue}
      />

      {/* Duplicate strategy MODAL */}
      {duplicateModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-black/40 backdrop-blur-3xl border border-amber-500/20 rounded-3xl w-full max-w-sm p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-5">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-sm font-bold text-white mt-2">중복 곡 감지됨</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] mx-auto break-all leading-relaxed font-sans">
                &quot;{duplicateModal.trackName}&quot; 곡이 플레이리스트 &quot;{duplicateModal.playlistName}&quot; 에 이미 존재합니다. 추가 방식을 선택하세요.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2 text-xs font-semibold">
              <button onClick={() => handleResolveDuplicate('skip')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-amber-500/30 transition">Skip (Do not add)</button>
              <button onClick={() => handleResolveDuplicate('replace')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-amber-500/30 transition">Replace (Override current)</button>
              <button onClick={() => handleResolveDuplicate('keep_both')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-amber-400 rounded-xl border border-amber-500/50 transition">Keep Both (Allow duplicate)</button>
            </div>
            <button onClick={() => setDuplicateModal(null)} className="w-full text-center text-[10px] text-gray-500 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Custom Confirm dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`bg-[#0a0a0d]/90 backdrop-blur-3xl border ${confirmDialog.isDanger ? 'border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)]' : 'border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]'} rounded-3xl w-full max-w-sm p-8 space-y-6`}>
            <div className="text-center">
              <span className="text-4xl">{confirmDialog.isDanger ? '🚨' : (confirmDialog.isAlert ? '✅' : '❓')}</span>
              <h3 className="text-sm font-bold text-white mt-2">{confirmDialog.title}</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] mx-auto break-all leading-relaxed font-sans">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-2">
              {!confirmDialog.isAlert && <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition text-xs font-bold">{confirmDialog.cancelText || 'Cancel'}</button>}
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className={`flex-1 py-2.5 ${confirmDialog.isDanger ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'} rounded-xl border transition text-xs font-bold`}>{confirmDialog.confirmText || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating track action menu */}
      {contextMenu && (
        <FloatingContextMenu
          track={contextMenu.track}
          x={contextMenu.x}
          y={contextMenu.y}
          playlists={playlists}
          onClose={() => setContextMenu(null)}
          addToQueueNext={addToQueueNext}
          showToast={showToast}
          deleteFile={deleteFile}
          onAddTrackToPlaylist={handleAddTrack}
        />
      )}

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}