'use client';

import React from 'react';
import { Playlist, MediaFile } from '../types';
import { Icon } from './ui/Icon';
import { PlaylistTrackItem } from './PlaylistTrackItem';

interface PlaylistsViewProps {
  playlists: Playlist[];
  mediaFiles: MediaFile[];
  newPlaylistName: string;
  setNewPlaylistName: (val: string) => void;
  createPlaylist: () => void;
  deletePlaylist: (id: string) => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  playPlaylistRewrite: (items: MediaFile[]) => void;
  playPlaylistAppend: (items: MediaFile[]) => void;
  togglePlaylistItem: (pid: string, itemPath: string, isIn: boolean) => void;
  playFile: (file: MediaFile) => void;
  handleMenuClick: (e: React.MouseEvent, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  showToast: (msg: string) => void;
}

export function PlaylistsView({
  playlists,
  mediaFiles,
  newPlaylistName,
  setNewPlaylistName,
  createPlaylist,
  deletePlaylist,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playPlaylistRewrite,
  playPlaylistAppend,
  togglePlaylistItem,
  playFile,
  handleMenuClick,
  addToQueueNext,
  addToQueueEnd,
  showToast
}: PlaylistsViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#13161f] border border-gray-900 p-4 rounded-xl flex gap-2">
        <input
          type="text"
          placeholder="새 플레이리스트 이름 입력..."
          value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createPlaylist()}
          className="flex-1 bg-[#12131a] border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={createPlaylist}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-bold rounded-lg transition"
        >
          Create
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map(pl => {
          const plItems = pl.items
            .map(p => mediaFiles.find(m => m.path === p))
            .filter(Boolean) as MediaFile[];
          const isSelected = selectedPlaylistId === pl.id;
          return (
            <div
              key={pl.id}
              className={`bg-[#13161f] rounded-2xl border p-4 cursor-pointer transition-all ${
                isSelected ? 'border-emerald-500/80 bg-emerald-500/[0.02]' : 'border-gray-900 hover:border-gray-800'
              }`}
              onClick={() => setSelectedPlaylistId(isSelected ? null : pl.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-white">{pl.name}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{plItems.length} songs</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    deletePlaylist(pl.id);
                  }}
                  className="text-rose-400 hover:text-rose-350 text-xs"
                >
                  Delete
                </button>
              </div>
              
              <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => playPlaylistRewrite(plItems)}
                  className="text-[10px] py-1.5 bg-[#1b2f28] text-emerald-400 border border-emerald-950 hover:bg-emerald-900/20 rounded font-semibold flex-1 transition flex items-center justify-center gap-1"
                >
                  <Icon name="play" size={12} className="fill-emerald-400/20" /> 재생 및 덮어쓰기
                </button>
                <button
                  onClick={() => playPlaylistAppend(plItems)}
                  className="text-[10px] py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded font-semibold flex-1 transition flex items-center justify-center gap-1"
                >
                  <Icon name="plus" size={12} /> 대기열 추가
                </button>
              </div>

              {isSelected && (
                <div className="mt-4 border-t border-gray-900 pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Tracks ({plItems.length})</h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {plItems.length ? (
                        plItems.map((item, idx) => (
                          <PlaylistTrackItem
                            key={`${item.path}-${idx}`}
                            item={item}
                            onPlay={() => playFile(item)}
                            onMenuClick={handleMenuClick}
                            addToQueueNext={addToQueueNext}
                            addToQueueEnd={addToQueueEnd}
                            showToast={showToast}
                          />
                        ))
                      ) : (
                        <p className="text-[10px] text-gray-500">플레이리스트가 비어 있습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Manage library tracks</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 bg-[#08090d]/80 p-2 rounded border border-gray-900">
                      {mediaFiles.map(file => {
                        const isIn = pl.items.includes(file.path);
                        return (
                          <label
                            key={file.path}
                            className="flex items-center justify-between p-1.5 hover:bg-[#181b24]/40 rounded cursor-pointer"
                          >
                            <span className="text-[10px] truncate max-w-[150px] text-gray-400">
                              {file.name}
                            </span>
                            <input
                              type="checkbox"
                              checked={isIn}
                              onChange={() => togglePlaylistItem(pl.id, file.path, isIn)}
                              className="rounded text-emerald-600 focus:ring-0 accent-emerald-600"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!playlists.length && (
          <p className="col-span-full text-center py-8 text-gray-500 text-xs">No playlists created.</p>
        )}
      </div>
    </div>
  );
}
