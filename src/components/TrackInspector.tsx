'use client';

import React from 'react';
import { MediaFile, Playlist } from '../types';
import { Icon } from './ui/Icon';
import { getGradientFromTitle } from './SongHelpers';

interface TrackInspectorProps {
  selectedTrack: MediaFile | null;
  playFile: (file: MediaFile) => void;
  deleteFile: (filename: string) => void;
  playlists: Playlist[];
  isPlaylistDropdownOpen: boolean;
  setIsPlaylistDropdownOpen: (val: boolean) => void;
  handleAddTrack: (playlistId: string, playlistName: string, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  showToast: (message: string) => void;
}

export function TrackInspector({
  selectedTrack,
  playFile,
  deleteFile,
  playlists,
  isPlaylistDropdownOpen,
  setIsPlaylistDropdownOpen,
  handleAddTrack,
  addToQueueNext,
  addToQueueEnd,
  showToast
}: TrackInspectorProps) {
  if (!selectedTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-600">
        <span className="text-4xl mb-3">🎵</span>
        <p className="text-xs">
          Select a track from the library workspace to inspect files and add to playlists.
        </p>
      </div>
    );
  }

  const fileFormat = selectedTrack.path.split('.').pop() || 'unknown';

  return (
    <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
      <div className="space-y-4">
        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block">Track Info</span>
        
        <div
          className={`aspect-square w-full rounded-2xl bg-gradient-to-br ${getGradientFromTitle(
            selectedTrack.name
          )} flex flex-col items-center justify-center shadow-xl relative overflow-hidden border border-white/5 group`}
        >
          {selectedTrack.coverArt ? (
            <img src={selectedTrack.coverArt} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-end p-4 bg-black/20">
              <div className="w-20 h-20 rounded-full border-4 border-black/40 bg-gray-900/90 flex items-center justify-center shadow-lg relative animate-spin [animation-duration:20s] shrink-0">
                <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs">💿</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="font-bold text-base text-white tracking-wide line-clamp-2" title={selectedTrack.name}>
            {selectedTrack.name}
          </h2>
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold font-mono">
            {selectedTrack.artist || 'Unknown Artist'}
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-900 flex-1">
        <div className="space-y-3 text-[10px] font-semibold">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 uppercase">Length</span>
            <span className="text-white font-mono">3:45</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 uppercase">Format</span>
            <span className="text-white font-mono uppercase">{fileFormat}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 uppercase">Bitrate</span>
            <span className="text-white font-mono text-[9px] text-right">
              24-bit / 96kHz, 1411 kbps
            </span>
          </div>
          <div className="pt-2">
            <span className="text-gray-500 uppercase block mb-1">File Path</span>
            <span className="font-mono text-[9px] text-gray-400 break-all bg-black/20 p-1.5 rounded block">
              {selectedTrack.path}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-900/60">
          <span className="text-[10px] text-gray-500 font-bold uppercase">Tags</span>
          <div className="flex flex-wrap gap-1">
            {['Electronic', 'Synthwave', 'Chill', 'Retro', '120 BPM'].map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-[#12131a] text-gray-400 border border-gray-800 text-[9px] font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-900">
        <div className="flex gap-2">
          <button
            onClick={() => playFile(selectedTrack)}
            className="flex-1 py-2 bg-[#12131a] hover:bg-[#181b24] text-white rounded-xl text-xs font-bold transition border border-gray-800 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Icon name="play" size={14} className="fill-white/10" /> Play
          </button>
          <button
             onClick={() => {
               addToQueueEnd(selectedTrack);
               showToast(`'${selectedTrack.name.split('/').pop()}'이(가) 대기열 마지막에 추가되었습니다.`);
             }}
            className="flex-1 py-2 bg-[#12131a] hover:bg-[#181b24] hover:text-teal-400 text-white rounded-xl text-xs font-bold transition border border-gray-800 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Icon name="plus" size={14} /> Queue
          </button>
          <button
            onClick={() => deleteFile(selectedTrack.name)}
            className="px-3 py-2 bg-[#12131a] hover:bg-rose-950/20 hover:text-rose-400 border border-gray-800 text-gray-500 rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsPlaylistDropdownOpen(!isPlaylistDropdownOpen)}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:scale-[1.01] text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1"
          >
            Add to Playlist
          </button>

          {isPlaylistDropdownOpen && playlists.length > 0 && (
            <div className="absolute bottom-12 left-0 right-0 bg-[#12131a] border border-gray-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 max-h-48 overflow-y-auto">
              <span className="text-[9px] text-gray-500 font-bold block px-2 py-1 border-b border-gray-900 mb-1">
                Select target Playlist
              </span>
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => {
                    handleAddTrack(pl.id, pl.name, selectedTrack);
                    setIsPlaylistDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-[#181b24] hover:text-white transition flex justify-between items-center"
                >
                  <span className="truncate max-w-[150px]">{pl.name}</span>
                  <span className="text-[10px] text-gray-500">＋</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
