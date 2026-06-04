'use client';

import React from 'react';
import { MediaFile, Playlist } from '../types';
import { EmptyState } from './Skeletons';
import { GridSongCard } from './GridSongCard';
import { ListSongRow } from './ListSongRow';
import { PlaylistsView } from './PlaylistsView';
import { UploadView } from './UploadView';
import { RecentView } from './RecentView';

interface MainContentAreaProps {
  view: 'songs' | 'playlists' | 'upload' | 'recent';
  setView: (val: any) => void;
  layoutMode: 'grid' | 'list';
  setLayoutMode: (val: any) => void;
  activeGenreTag: string;
  setActiveGenreTag: (val: string) => void;
  selectedTracksList: string[];
  setSelectedTracksList: (val: any) => void;
  deleteSelectedTracks: () => void;
  currentFolder: string;
  setCurrentFolder: (val: string) => void;
  currentFolders: string[];
  currentSongs: MediaFile[];
  sortedSongs: MediaFile[];
  selectedTrack: MediaFile | null;
  setSelectedTrack: (val: any) => void;
  isPlaying: boolean;
  currentFile: MediaFile | null;
  playFile: (file: MediaFile) => void;
  handleMenuClick: (e: React.MouseEvent, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  showToast: (msg: string) => void;
  playlists: Playlist[];
  deleteFile: (filename: string) => void;
  createPlaylist: () => void;
  deletePlaylist: (id: string) => void;
  newPlaylistName: string;
  setNewPlaylistName: (val: string) => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  playPlaylistRewrite: (items: MediaFile[]) => void;
  playPlaylistAppend: (items: MediaFile[]) => void;
  togglePlaylistItem: (pid: string, itemPath: string, isIn: boolean) => void;
  dragOver: boolean;
  setDragOver: (val: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  handleUpload: (files: FileList | null) => void;
  sortBy: 'name' | 'size' | 'added';
  setSortBy: (val: 'name' | 'size' | 'added') => void;
  sortOrder: 'asc' | 'desc';
  handleSortChange: (val: 'name' | 'size' | 'added') => void;
  toggleSelectTrack: (path: string) => void;
}

export function MainContentArea(props: MainContentAreaProps) {
  const {
    view, setView, layoutMode, setLayoutMode, activeGenreTag, setActiveGenreTag,
    selectedTracksList, setSelectedTracksList, deleteSelectedTracks,
    currentFolder, setCurrentFolder, currentFolders, currentSongs, sortedSongs,
    selectedTrack, setSelectedTrack, isPlaying, currentFile, playFile,
    handleMenuClick, addToQueueNext, addToQueueEnd, showToast, playlists, deleteFile,
    createPlaylist, deletePlaylist, newPlaylistName, setNewPlaylistName,
    selectedPlaylistId, setSelectedPlaylistId, playPlaylistRewrite,
    playPlaylistAppend, togglePlaylistItem, dragOver, setDragOver, onDrop, handleUpload,
    sortBy, setSortBy, sortOrder, handleSortChange, toggleSelectTrack
  } = props;

  const getParentFolder = (filePath: string) => {
    const relative = filePath.replace(/^\/media\//, '');
    const parts = relative.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  };

  return (
    <>
      {/* Subheader Filter tag buttons */}
      <div className="px-4 md:px-6 py-2.5 border-b border-gray-900 bg-[#0b0c10]/10 flex items-center justify-between shrink-0 z-10 gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold shrink-0">Tags</span>
          <div className="flex gap-2 overflow-x-auto pb-0.5 whitespace-nowrap scrollbar-none flex-nowrap min-w-0 flex-1">
            {['Ambient Electronica', 'Synthwave Hits', '80s Retro'].map(tag => (
              <button
                key={tag}
                onClick={() => setActiveGenreTag(tag)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border shrink-0 ${
                  activeGenreTag === tag
                    ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        <div className="hidden sm:flex gap-2 text-[10px] font-semibold text-gray-400">
          {[
            { id: 'name', label: 'Name' },
            { id: 'added', label: 'Upload Date' },
            { id: 'size', label: 'Size' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSortChange(opt.id as any)}
              className={`px-2.5 py-1 border rounded-lg cursor-pointer transition flex items-center gap-1 ${
                sortBy === opt.id
                  ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.06)]'
                  : 'bg-[#12131a] text-gray-400 border-gray-800 hover:bg-[#181b24]'
              }`}
            >
              <span>{opt.label}</span>
              {sortBy === opt.id && (
                <span className="text-emerald-400 font-extrabold">
                  {sortOrder === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pt-5 pb-2.5 flex items-center justify-between shrink-0">
        {selectedTracksList.length > 0 ? (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-pulse">
            <span className="text-[10px] text-rose-400 font-bold font-mono">{selectedTracksList.length} Selected</span>
            <button onClick={deleteSelectedTracks} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition">
              🗑 선택 삭제
            </button>
            <button onClick={() => setSelectedTracksList([])} className="text-gray-400 hover:text-white text-[10px] font-semibold">
              Cancel
            </button>
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
                    addToQueueEnd={addToQueueEnd}
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
                          addToQueueEnd={addToQueueEnd}
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
            mediaFiles={sortedSongs}
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
            addToQueueEnd={addToQueueEnd}
            showToast={showToast}
          />
        )}

        {view === 'upload' && <UploadView dragOver={dragOver} setDragOver={setDragOver} handleUpload={handleUpload} onDrop={onDrop} />}
        {view === 'recent' && <RecentView mediaFiles={sortedSongs} />}
      </div>
    </>
  );
}
