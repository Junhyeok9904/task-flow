import React from 'react';
import { Playlist, MediaFile } from '../types';

interface PlaylistSubmenuProps {
  playlists: Playlist[];
  track: MediaFile;
  onAddTrack: (playlistId: string, playlistName: string, track: MediaFile) => void;
  onClose: () => void;
}

export function PlaylistSubmenu({ playlists, track, onAddTrack, onClose }: PlaylistSubmenuProps) {
  return (
    <div className="absolute left-full top-0 ml-1 bg-[#10121a]/95 border border-gray-800 rounded-xl shadow-2xl p-1.5 w-44 z-[99999] backdrop-blur-2xl animate-fade-in animate-duration-100">
      <div className="px-2 py-1 text-[8px] text-gray-500 font-bold uppercase tracking-wider border-b border-white/5 mb-1">
        플레이리스트 선택
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-0.5">
        {playlists.length > 0 ? (
          playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => {
                onAddTrack(pl.id, pl.name, track);
                onClose();
              }}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-[11px] text-gray-300 hover:text-white transition truncate block"
            >
              💿 {pl.name}
            </button>
          ))
        ) : (
          <div className="text-center py-4 text-[10px] text-gray-600">
            생성된 목록 없음
          </div>
        )}
      </div>
    </div>
  );
}
