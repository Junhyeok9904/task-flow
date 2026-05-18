'use client';

import { useEffect, useState } from 'react';
import { MediaFile, Playlist } from '../types';

interface MediaPlayerProps {
  mediaFiles: MediaFile[];
  playlists: Playlist[];
  onPlaylistChange: () => void;
}

export default function MediaPlayer({ mediaFiles, playlists, onPlaylistChange }: MediaPlayerProps) {
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const videoFiles = mediaFiles.filter(f => f.type === 'video');
  const audioFiles = mediaFiles.filter(f => f.type === 'audio');

  const handleAddPlaylist = async () => {
    if (!playlistName.trim()) return;
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: playlistName.trim() }),
    });
    setPlaylistName('');
    onPlaylistChange();
  };

  const handleDeletePlaylist = async (id: string) => {
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    onPlaylistChange();
  };

  const handleToggleItem = async (playlistId: string, itemPath: string, isInPlaylist: boolean) => {
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isInPlaylist ? 'removeItem' : 'addItem',
        id: playlistId,
        itemPath,
      }),
    });
    onPlaylistChange();
  };

  const ResolvedPlaylistItems = ({ playlist }: { playlist: Playlist }) => {
    const items = playlist.items.map(path => mediaFiles.find(m => m.path === path)).filter(Boolean) as MediaFile[];
    return (
      <div className="space-y-2 mt-2">
        {items.map(file => (
          <div key={file.path} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <button
              onClick={() => { setCurrentFile(file); }}
              className="flex-1 text-left flex items-center gap-2 hover:bg-blue-50 rounded px-2 py-1"
            >
              {file.type === 'video' ? '🎬' : '🎵'} {file.name}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-400 text-sm text-center py-4">항목이 없습니다. 아래에서 추가하세요.</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">🎬 미디어 플레이어</h2>

      {currentFile && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="mb-2 flex justify-between items-center">
            <span className="font-medium">현재: {currentFile.name}</span>
            <button onClick={() => setCurrentFile(null)} className="text-red-500 hover:text-red-700">✕ 닫기</button>
          </div>
          {currentFile.type === 'video' ? (
            <video src={currentFile.path} controls autoPlay className="w-full rounded-lg" />
          ) : (
            <audio src={currentFile.path} controls autoPlay className="w-full" />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-3">🎥 비디오 ({videoFiles.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {videoFiles.map(file => (
              <button key={file.path} onClick={() => setCurrentFile(file)} className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center gap-2">
                <span>🎬</span><span className="truncate">{file.name}</span>
              </button>
            ))}
            {videoFiles.length === 0 && <p className="text-gray-400 text-sm">파일이 없습니다</p>}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-3">🎵 오디오 ({audioFiles.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {audioFiles.map(file => (
              <button key={file.path} onClick={() => setCurrentFile(file)} className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center gap-2">
                <span>🎵</span><span className="truncate">{file.name}</span>
              </button>
            ))}
            {audioFiles.length === 0 && <p className="text-gray-400 text-sm">파일이 없습니다</p>}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-bold mb-3">📋 플레이리스트 ({playlists.length})</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="새 플레이리스트 이름..." value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlaylist()}
            className="flex-1 px-3 py-2 border rounded-lg" />
          <button onClick={handleAddPlaylist} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">추가</button>
        </div>
        <div className="space-y-2">
          {playlists.map(playlist => {
            const isSelected = selectedPlaylist?.id === playlist.id;
            return (
              <div key={playlist.id} className={`p-3 rounded ${isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedPlaylist(isSelected ? null : playlist)}>
                  <span>📁 {playlist.name} <span className="text-sm text-gray-500">({playlist.items.length}개)</span></span>
                  <div className="flex gap-2">
                    <span className="text-blue-600 text-sm">{isSelected ? '접기' : '편집'}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id); }}
                      className="text-red-500 hover:text-red-700 text-sm">삭제</button>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3">
                    <div className="border-t pt-2">
                      <h4 className="font-medium mb-2 text-sm text-gray-700">▶️ 플레이리스트 항목</h4>
                      <ResolvedPlaylistItems playlist={playlist} />
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <h4 className="font-medium mb-2 text-sm text-gray-700">📝 미디어 추가/제거</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {mediaFiles.map(file => {
                          const isIn = playlist.items.includes(file.path);
                          return (
                            <label key={file.path} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer">
                              <input type="checkbox" checked={isIn} onChange={() => handleToggleItem(playlist.id, file.path, isIn)} />
                              <span className="text-sm">{file.type === 'video' ? '🎬' : '🎵'} {file.name}</span>
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
          {playlists.length === 0 && <p className="text-gray-400 text-sm">플레이리스트가 없습니다</p>}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 미디어 파일을 추가하려면 <code className="bg-blue-100 px-2 py-1 rounded">public/media/</code> 폴더에 파일을 넣으세요.
        </p>
      </div>
    </div>
  );
}
