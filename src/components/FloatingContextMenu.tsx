import React, { useState } from 'react';
import { MediaFile, Playlist } from '../types';
import { Icon } from './ui/Icon';
import { PlaylistSubmenu } from './PlaylistSubmenu';

interface FloatingContextMenuProps {
  track: MediaFile;
  x: number;
  y: number;
  playlists: Playlist[];
  onClose: () => void;
  addToQueueNext: (file: MediaFile) => void;
  showToast: (msg: string) => void;
  deleteFile: (filename: string) => void;
  onAddTrackToPlaylist: (playlistId: string, playlistName: string, track: MediaFile) => void;
}

export function FloatingContextMenu({
  track,
  x,
  y,
  playlists,
  onClose,
  addToQueueNext,
  showToast,
  deleteFile,
  onAddTrackToPlaylist
}: FloatingContextMenuProps) {
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  return (
    <div 
      className="fixed bg-[#10121a]/95 border border-gray-800 rounded-2xl shadow-2xl p-1.5 z-[9999] w-48 text-xs font-semibold backdrop-blur-2xl animate-fade-in animate-duration-150"
      style={{ 
        top: `${y}px`, 
        left: `${Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x)}px` 
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-white/5 text-[9px] text-gray-500 font-bold uppercase tracking-wider truncate">
        {track.name.split('/').pop()}
      </div>

      <div className="space-y-0.5 pt-1">
        <button
          onClick={() => {
            addToQueueNext(track);
            showToast(`'${track.name.split('/').pop()}'이(가) 대기열에 추가되었습니다.`);
            onClose();
          }}
          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center gap-2"
        >
          <Icon name="plus" size={14} />
          대기열 바로 다음에 추가
        </button>

        <div 
          className="relative"
          onMouseEnter={() => setShowPlaylistSubmenu(true)}
          onMouseLeave={() => setShowPlaylistSubmenu(false)}
        >
          <button
            className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center justify-between ${
              showPlaylistSubmenu ? 'bg-white/5 text-white' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm leading-none">💿</span>
              플레이리스트에 추가
            </span>
            <span className="text-[10px] text-gray-500">▶</span>
          </button>

          {showPlaylistSubmenu && (
            <PlaylistSubmenu
              playlists={playlists}
              track={track}
              onAddTrack={onAddTrackToPlaylist}
              onClose={onClose}
            />
          )}
        </div>

        <button
          onClick={() => {
            if (confirm(`정말로 '${track.name.split('/').pop()}' 파일을 물리적으로 삭제하시겠습니까? 플레이리스트 및 대기열에서도 제거됩니다.`)) {
              deleteFile(track.name);
              onClose();
            }
          }}
          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition flex items-center gap-2"
        >
          <Icon name="trash" size={14} className="text-rose-400" />
          서버에서 파일 삭제
        </button>
      </div>
    </div>
  );
}
