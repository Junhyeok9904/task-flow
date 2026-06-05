'use client';

import React from 'react';
import Link from 'next/link';
import { Playlist, MediaFile } from '../types';
import { Icon } from './ui/Icon';

interface PlaylistExplorerSidebarProps {
  view: 'songs' | 'playlists' | 'upload' | 'recent';
  setView: (val: 'songs' | 'playlists' | 'upload' | 'recent') => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  playlists: Playlist[];
  deletePlaylist: (id: string) => void;
  activePlaylistsOpen: boolean;
  setActivePlaylistsOpen: (val: boolean) => void;
  activeQueueOpen: boolean;
  setActiveQueueOpen: (val: boolean) => void;
  isTunneling: boolean;
  tunnelUrl: string | null;
  tunnelLoading: boolean;
  tunnelProgress: number;
  tunnelProgressMsg: string;
  toggleTunnel: () => void;
  showAlert: (title: string, msg: string, isDanger?: boolean) => void;
  currentFile: MediaFile | null;
  isDocker?: boolean;
}

export function PlaylistExplorerSidebar({
  view,
  setView,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playlists,
  deletePlaylist,
  activePlaylistsOpen,
  setActivePlaylistsOpen,
  activeQueueOpen,
  setActiveQueueOpen,
  isTunneling,
  tunnelUrl,
  tunnelLoading,
  tunnelProgress,
  tunnelProgressMsg,
  toggleTunnel,
  showAlert,
  currentFile,
  isDocker = false
}: PlaylistExplorerSidebarProps) {
  return (
    <aside className="hidden md:flex w-64 bg-[#0a0b10]/60 backdrop-blur-xl border-r border-white/5 flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
      <div className="p-6 border-b border-white/5">
        <h1 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <Icon name="library" size={14} /> Playlist Explorer
        </h1>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          <button
            onClick={() => {
              setView('songs');
              setSelectedPlaylistId(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'songs' && !selectedPlaylistId
                ? 'bg-[#181b24] text-white shadow border border-gray-800'
                : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'
            }`}
          >
            <Icon name="folder" size={16} /> My Library
          </button>
          <button
            onClick={() => setView('playlists')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'playlists'
                ? 'bg-[#181b24] text-white border border-gray-800'
                : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'
            }`}
          >
            <Icon name="library" size={16} /> Playlists
          </button>
          <button
            onClick={() => setView('recent')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'recent'
                ? 'bg-[#181b24] text-white border border-gray-800'
                : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'
            }`}
          >
            <Icon name="recent" size={16} /> Recently Added
          </button>
        </div>

        {/* Accordion: Active Playlists */}
        <div className="pt-4 space-y-1">
          <button
            onClick={() => setActivePlaylistsOpen(!activePlaylistsOpen)}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider hover:text-gray-400 transition"
          >
            <span>Active Playlists</span>
            <span>{activePlaylistsOpen ? '▼' : '▶'}</span>
          </button>

          {activePlaylistsOpen && (
            <div className="space-y-1 pl-1.5 transition-all">
              <div className="w-full flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg text-gray-400 hover:bg-[#121319] cursor-pointer group">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded bg-pink-500 flex items-center justify-center text-[10px] text-white">🌃</div>
                  <span className="truncate">Synthwave Nights</span>
                </div>
                <span className="text-gray-600 text-[9px]">4</span>
              </div>

              <div className="w-full flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg text-gray-400 hover:bg-[#121319] cursor-pointer group">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center text-[10px] text-white">🎧</div>
                  <span className="truncate">LoFi Beats</span>
                </div>
                <button className="text-pink-400 hover:text-pink-300 opacity-0 group-hover:opacity-100 transition text-[9px]">✕</button>
              </div>

              {playlists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setView('playlists');
                  }}
                  className={`w-full flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg cursor-pointer transition ${
                    selectedPlaylistId === pl.id
                      ? 'bg-[#181b24] text-white font-medium'
                      : 'text-gray-400 hover:bg-[#121319]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-[9px]">💿</div>
                    <span className="truncate">{pl.name}</span>
                  </div>
                  <span className="text-gray-600 text-[9px]">{pl.items.length}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion: Active Queue */}
        <div className="pt-4 space-y-1">
          <button
            onClick={() => setActiveQueueOpen(!activeQueueOpen)}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider hover:text-gray-400 transition"
          >
            <span>Active Queue</span>
            <span>{activeQueueOpen ? '▼' : '▶'}</span>
          </button>

          {activeQueueOpen && (
            <div className="space-y-1 pl-1.5 text-[11px] text-gray-400">
              <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#121319] cursor-pointer">
                <span className="truncate max-w-[130px]">Stardust</span>
                <span className="text-[9px] text-gray-600 font-mono">3:40</span>
              </div>
              <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#121319] cursor-pointer">
                <span className="truncate max-w-[130px]">Ocean Waves</span>
                <span className="text-[9px] text-gray-600 font-mono">4:12</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Cloudflare Tunnel Widget */}
      <div className="p-4 border-t border-white/5 bg-black/20 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-semibold">
          <span>Public Access</span>
          {isDocker ? (
            <span className="text-emerald-400 text-xs animate-pulse">☁️ Docker Active</span>
          ) : isTunneling ? (
            <span className="text-emerald-400 text-xs animate-pulse">☁️ Connected</span>
          ) : (
            <span className="text-gray-600 text-xs">☁️ Offline</span>
          )}
        </div>
        
        <button
          onClick={toggleTunnel}
          disabled={tunnelLoading || isDocker}
          className={`w-full py-2 rounded-lg text-xs font-bold transition-all border ${
            isDocker
              ? 'bg-emerald-500/5 text-emerald-400/50 border-emerald-500/10 cursor-not-allowed'
              : isTunneling
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          } ${tunnelLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isDocker ? 'Managed by Docker' : tunnelLoading ? 'Connecting...' : isTunneling ? 'Stop Tunnel' : 'Start Public Tunnel'}
        </button>
        
        {tunnelLoading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[8px] font-bold text-emerald-400">
              <span className="truncate max-w-[140px]">{tunnelProgressMsg || '연결 준비 중...'}</span>
              <span className="font-mono">{tunnelProgress}%</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
                style={{ width: `${tunnelProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {isTunneling && tunnelUrl && (
          <div className="space-y-2 pt-1.5 border-t border-white/5">
            <button
              onClick={() => {
                navigator.clipboard.writeText(tunnelUrl);
                showAlert('성공', '공공 터널 URL이 클립보드에 복사되었습니다.');
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>📋</span> Copy Public URL
            </button>
            <div className="p-2.5 bg-[#12131a] border border-gray-800 rounded-lg text-center selection:bg-emerald-500/30">
              <div className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-1">Current Public Address</div>
              <span className="text-[10px] text-emerald-400 font-mono break-all select-all block leading-relaxed">{tunnelUrl}</span>
            </div>
          </div>
        )}
      </div>

      {currentFile && (
        <div className="p-3 border-t border-white/5 bg-[#08090d]/60 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-semibold mb-1">
            <span>playing</span>
            <span className="text-emerald-400 text-xs">⚡</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">{currentFile.name}</p>
        </div>
      )}
    </aside>
  );
}
