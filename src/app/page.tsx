'use client';

import React, { Suspense } from 'react';
import { useHomeState } from '../hooks/useHomeState';
import { PlaylistExplorerSidebar } from '../components/PlaylistExplorerSidebar';
import { CenterHeader } from '../components/CenterHeader';
import { MainContentArea } from '../components/MainContentArea';
import { TrackInspector } from '../components/TrackInspector';
import { BottomMediaPlayerBar } from '../components/BottomMediaPlayerBar';
import { ConfirmModalGroup } from '../components/ConfirmModalGroup';
import { DashboardSkeleton } from '../components/Skeletons';

function HomeContent() {
  const state = useHomeState();

  return (
    <div className="h-screen flex flex-col bg-transparent text-[#cfd3db] font-sans overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* PANEL 0: Vertical Strip */}
        <aside className="hidden md:flex w-16 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex-col items-center py-6 justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <span className="text-black text-sm">🟢</span>
            </div>
            
            <div className="flex flex-col items-center gap-5 w-full mt-4">
              <button onClick={() => { state.setView('songs'); state.setSelectedPlaylistId(null); }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-emerald-400 relative transition" title="Library">
                <span className="text-xl">🏠</span>
              </button>
              <button onClick={() => state.setView('playlists')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">💿</span>
              </button>
              <button onClick={() => window.location.href='/progress'} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">📊</span>
              </button>
              <button onClick={() => state.setView('upload')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">☁️</span>
              </button>
              <button onClick={() => state.setView('recent')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <span className="text-xl">🕒</span>
              </button>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border border-gray-800 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-white">JK</span>
          </div>
        </aside>

        <PlaylistExplorerSidebar
          view={state.view}
          setView={state.setView}
          selectedPlaylistId={state.selectedPlaylistId}
          setSelectedPlaylistId={state.setSelectedPlaylistId}
          playlists={state.playlists}
          deletePlaylist={state.deletePlaylist}
          activePlaylistsOpen={state.activePlaylistsOpen}
          setActivePlaylistsOpen={state.setActivePlaylistsOpen}
          activeQueueOpen={state.activeQueueOpen}
          setActiveQueueOpen={state.setActiveQueueOpen}
          isTunneling={state.isTunneling}
          tunnelUrl={state.tunnelUrl}
          tunnelLoading={state.tunnelLoading}
          toggleTunnel={state.toggleTunnel}
          showAlert={state.showAlert}
          currentFile={state.currentFile}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#0b0c10]" onDragOver={e => { e.preventDefault(); state.setDragOver(true); }} onDragLeave={() => state.setDragOver(false)} onDrop={state.onDrop}>
          <CenterHeader search={state.search} setSearch={state.setSearch} />
          <MainContentArea {...state} />
        </main>

        <aside className="hidden xl:flex w-80 bg-[#0f1118] border-l border-[#181b24] flex-col shrink-0 overflow-y-auto">
          <TrackInspector
            selectedTrack={state.selectedTrack}
            playFile={state.playFile}
            deleteFile={state.deleteFile}
            playlists={state.playlists}
            isPlaylistDropdownOpen={state.isPlaylistDropdownOpen}
            setIsPlaylistDropdownOpen={state.setIsPlaylistDropdownOpen}
            handleAddTrack={state.handleAddTrack}
          />
        </aside>
      </div>

      <BottomMediaPlayerBar {...state} />
      <ConfirmModalGroup
        duplicateModal={state.duplicateModal}
        setDuplicateModal={state.setDuplicateModal}
        handleResolveDuplicate={state.handleResolveDuplicate}
        confirmDialog={state.confirmDialog}
        setConfirmDialog={state.setConfirmDialog}
      />
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