'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaFile, Playlist } from '../types';
import Link from 'next/link';
import { useUpload } from '../components/UploadManager';
import { Icon } from '../components/ui/Icon';
import { useAudioPlayer } from '../contexts/AudioProvider';

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtSize(b: number) {
  if (!b) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Generate premium mock visual waveforms for each track card
function getMockWaveform(seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const heights = [];
  for (let i = 0; i < 28; i++) {
    heights.push(15 + ((hash * (i + 3)) % 75)); // standard heights between 15% and 90%
  }
  return heights;
}

// Generate unique glowing gradients based on song titles
function getGradientFromTitle(title: string) {
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
}

export default function Home() {
  const { enqueueFiles } = useUpload();
  const [mounted, setMounted] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'songs' | 'playlists' | 'upload' | 'recent'>('songs');
  
  const {
    currentFile, setCurrentFile, isPlaying, setIsPlaying, currentTime, setCurrentTime,
    duration, setDuration, volume, setVolume, queue, setQueue, queueIndex, setQueueIndex,
    repeatMode, setRepeatMode, isShuffle, setIsShuffle, getMediaEl,
    playPlaylistRewrite, playPlaylistAppend, handlePrev, handleNext, playFile, togglePlay,
    seekBy, toggleShuffle, toggleRepeat
  } = useAudioPlayer();

  // High-Fidelity UI states matching Dribbble mockup
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'added'>('added');
  const [activeFilterTag, setActiveFilterTag] = useState<'all' | 'audio' | 'video'>('all');
  const [activeGenreTag, setActiveGenreTag] = useState<string>('Ambient Electronica'); // Active tag badge
  const [selectedTrack, setSelectedTrack] = useState<MediaFile | null>(null);
  const [selectedTracksList, setSelectedTracksList] = useState<string[]>([]); // Multi-select list
  const [dragOver, setDragOver] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);

  // Accordion toggle states
  const [activePlaylistsOpen, setActivePlaylistsOpen] = useState(true);
  const [activeQueueOpen, setActiveQueueOpen] = useState(true);

  // Duplicate modal handler states
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    playlistId: string;
    playlistName: string;
    trackPath: string;
    trackName: string;
  } | null>(null);



  const loadData = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (activeFilterTag !== 'all') queryParams.set('type', activeFilterTag);

      const [mRes, pRes] = await Promise.all([
        fetch(`/api/music/search?${queryParams.toString()}`),
        fetch('/api/playlists')
      ]);
      
      setMediaFiles(await mRes.json());
      setPlaylists(await pRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Hydration safety mount
  useEffect(() => {
    setMounted(true);
    loadData().then(() => {
      setLoading(false);
    });
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (mounted) {
      const handler = setTimeout(() => {
        loadData();
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [search, activeFilterTag]);

  // Set default selected track on list mount
  useEffect(() => {
    if (mediaFiles.length > 0 && !selectedTrack) {
      setSelectedTrack(mediaFiles[0]);
    }
  }, [mediaFiles]);

  const deleteFile = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/media?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentFile && currentFile.name === filename) {
          const el = getMediaEl();
          if (el) el.pause();
          setCurrentFile(null);
          setIsPlaying(false);
        }
        if (selectedTrack && selectedTrack.name === filename) {
          setSelectedTrack(null);
        }
        setQueue(prev => prev.filter(q => q.name !== filename));
        await loadData();
      } else {
        alert('Failed to delete file');
      }
    } catch (e) { console.error(e); }
  };



  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newPlaylistName.trim() })
    });
    setNewPlaylistName('');
    await loadData();
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
    await loadData();
  };

  // Add items with duplicate checks
  const handleAddTrack = async (playlistId: string, playlistName: string, track: MediaFile) => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addItem', id: playlistId, itemPath: track.path })
      });
      const data = await res.json();
      
      if (data.duplicate) {
        setDuplicateModal({
          isOpen: true,
          playlistId: playlistId,
          playlistName: playlistName,
          trackPath: track.path,
          trackName: track.name
        });
      } else {
        await loadData();
        alert('Playlist updated successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBatchTracks = async (playlistId: string, playlistName: string) => {
    if (!selectedTracksList.length) return;
    let duplicateOccurred = false;
    for (const trackPath of selectedTracksList) {
      const track = mediaFiles.find(m => m.path === trackPath);
      if (!track) continue;
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addItem', id: playlistId, itemPath: trackPath })
        });
        const data = await res.json();
        if (data.duplicate) {
          duplicateOccurred = true;
          setDuplicateModal({
            isOpen: true,
            playlistId: playlistId,
            playlistName: playlistName,
            trackPath: trackPath,
            trackName: track.name
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    setSelectedTracksList([]);
    await loadData();
    if (!duplicateOccurred) {
      alert('Batch addition complete!');
    }
  };

  const handleResolveDuplicate = async (strategy: 'skip' | 'replace' | 'keep_both') => {
    if (!duplicateModal) return;
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          id: duplicateModal.playlistId,
          itemPath: duplicateModal.trackPath,
          strategy: strategy
        })
      });
      setDuplicateModal(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePlaylistItem = async (pid: string, itemPath: string, isIn: boolean) => {
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isIn ? 'removeItem' : 'addItem',
        id: pid,
        itemPath,
        force: true
      })
    });
    await loadData();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    enqueueFiles(Array.from(files));
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await handleUpload(e.dataTransfer.files);
  };

  const sortedSongs = [...mediaFiles].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
    return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
  });

  const toggleSelectTrack = (path: string) => {
    setSelectedTracksList(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  if (!mounted) return null;
  if (loading) return <div className="flex h-screen items-center justify-center text-emerald-400 bg-[#08090d] font-sans">로딩중...</div>;

  return (
    <div className="h-screen flex flex-col bg-[#0b0c10] text-[#cfd3db] font-sans overflow-hidden select-none">
      
      {/* ─── Main 3-Panel Workspace ─── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* PANEL 0: Vertical App Utility strip (Mocking visual mockup edge) */}
        <aside className="w-14 bg-[#08090c] border-r border-gray-900 flex flex-col items-center py-4 justify-between shrink-0">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Spotify / Circular glowing wave logo */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <span className="text-black text-sm">🟢</span>
            </div>
            
            {/* Nav icons */}
            <div className="flex flex-col items-center gap-5 w-full mt-4">
              <button onClick={() => { setView('songs'); setSelectedPlaylistId(null); }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-emerald-400 relative transition group">
                <Icon name="home" size={20} />
                <span className="absolute left-0 top-3 w-1 h-3 bg-emerald-500 rounded-r-md"></span>
              </button>
              
              <button onClick={() => { setView('playlists'); }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <Icon name="library" size={20} />
              </button>
              
              <Link href="/progress" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <Icon name="analytics" size={20} />
              </Link>
              
              <button onClick={() => setView('upload')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <Icon name="upload" size={20} />
              </button>
              
              <button onClick={() => setView('recent')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#181b24] text-gray-500 hover:text-gray-300 transition">
                <Icon name="recent" size={20} />
              </button>
            </div>
          </div>
          
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border border-gray-800 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-white">JK</span>
          </div>
        </aside>

        {/* PANEL 1: Left Playlist Explorer Sidebar */}
        <aside className="w-60 bg-[#0f1118] border-r border-[#181b24] flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-900">
            <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Playlist Explorer</h1>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              <button 
                onClick={() => { setView('songs'); setSelectedPlaylistId(null); }} 
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${view === 'songs' && !selectedPlaylistId ? 'bg-[#181b24] text-white shadow border border-gray-800' : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'}`}
              >
                <Icon name="folder" size={16} /> My Library
              </button>
              <button 
                onClick={() => { setView('playlists'); }} 
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${view === 'playlists' ? 'bg-[#181b24] text-white border border-gray-800' : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'}`}
              >
                <Icon name="library" size={16} /> Playlists
              </button>
              <button 
                onClick={() => setView('recent')} 
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${view === 'recent' ? 'bg-[#181b24] text-white border border-gray-800' : 'text-gray-400 hover:bg-[#121319] hover:text-gray-200'}`}
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
                  {/* Mock lists matching the design mockup for fidelity */}
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

                  <div className="w-full flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg text-gray-400 hover:bg-[#121319] cursor-pointer group">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white">⚡</div>
                      <span className="truncate">Workout Mix</span>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition text-[9px]">✕</button>
                  </div>

                  {playlists.map(pl => (
                    <div 
                      key={pl.id} 
                      onClick={() => { setSelectedPlaylistId(pl.id); setView('playlists'); }} 
                      className={`w-full flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg cursor-pointer transition ${selectedPlaylistId === pl.id ? 'bg-[#181b24] text-white font-medium' : 'text-gray-400 hover:bg-[#121319]'}`}
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
                  <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#121319] cursor-pointer">
                    <span className="truncate max-w-[130px]">Echoes</span>
                    <span className="text-[9px] text-gray-600 font-mono">2:55</span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Connected mini media playing status */}
          {currentFile && (
            <div className="p-3 border-t border-gray-900 bg-[#08090d]/60">
              <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-semibold mb-1">
                <span>playing</span>
                <span className="text-emerald-400 text-xs">⚡</span>
              </div>
              <p className="text-xs font-semibold text-white truncate">{currentFile.name}</p>
            </div>
          )}
        </aside>

        {/* PANEL 2: Center Search & Grid Browser Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0b0c10]" onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          
          {/* Main workspace header matching visual HUD exactly */}
          <header className="h-16 border-b border-gray-900/60 flex items-center justify-between px-6 shrink-0 bg-[#0b0c10]/40 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Search songs, artists, uploads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#12131a] border border-gray-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/80 text-gray-200 transition-all placeholder-gray-600"
                />
                <span className="absolute left-3.5 top-2 text-gray-500"><Icon name="search" size={18} /></span>
              </div>
            </div>

            {/* Notifications & avatar tags */}
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-200 relative p-1 transition">
                <Icon name="bell" size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#0b0c10]"></span>
              </button>
              
              <div className="flex items-center gap-2 bg-[#12131a] px-3 py-1.5 rounded-full border border-gray-800 cursor-pointer hover:bg-[#181b24] transition text-xs font-semibold">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Icon name="user" size={14} /></div>
                <span>Profile</span>
                <span className="text-[10px] text-gray-500">▼</span>
              </div>
            </div>
          </header>

          {/* Subheader: Horizontal filters tags from visual mockup */}
          <div className="px-6 py-2.5 border-b border-gray-900 bg-[#0b0c10]/10 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tags</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveGenreTag('Ambient Electronica')} 
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeGenreTag === 'Ambient Electronica' ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24]'}`}
                >
                  Ambient Electronica
                </button>
                <button 
                  onClick={() => setActiveGenreTag('Synthwave Hits')} 
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeGenreTag === 'Synthwave Hits' ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24]'}`}
                >
                  Synthwave Hits
                </button>
                <button 
                  onClick={() => setActiveGenreTag('80s Retro')} 
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeGenreTag === '80s Retro' ? 'bg-[#1b2f28] text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24]'}`}
                >
                  80s Retro
                </button>
              </div>
            </div>

            {/* Mock filter dropdowns from Dribbble UI */}
            <div className="flex gap-2 text-[10px] font-semibold text-gray-400">
              <div className="px-2 py-1 bg-[#12131a] hover:bg-[#181b24] border border-gray-800 rounded-lg cursor-pointer transition">
                Tags ∨
              </div>
              <div className="px-2 py-1 bg-[#12131a] hover:bg-[#181b24] border border-gray-800 rounded-lg cursor-pointer transition">
                Upload Date ∨
              </div>
              <div className="px-2 py-1 bg-[#12131a] hover:bg-[#181b24] border border-gray-800 rounded-lg cursor-pointer transition">
                Bitrate ∨
              </div>
            </div>
          </div>

          {/* Browser grid header labels */}
          <div className="px-6 pt-5 pb-2.5 flex items-center justify-between shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Active searched & uploaded music files</h2>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span>{sortedSongs.length} tracks found</span>
              
              <div className="bg-[#12131a] p-0.5 rounded-lg border border-gray-800 flex gap-0.5">
                <button onClick={() => setLayoutMode('grid')} className={`p-1 rounded transition ${layoutMode === 'grid' ? 'bg-[#181b24] text-white' : 'text-gray-500 hover:text-gray-300'}`}>🎴</button>
                <button onClick={() => setLayoutMode('list')} className={`p-1 rounded transition ${layoutMode === 'list' ? 'bg-[#181b24] text-white' : 'text-gray-500 hover:text-gray-300'}`}>📜</button>
              </div>
            </div>
          </div>

          {/* Main List / Grid browser */}
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
                {layoutMode === 'grid' ? (
                  /* HIGH FIDELITY DRIBBBLE GRID MODE */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
                    {sortedSongs.map(f => {
                      const isSelected = selectedTrack?.path === f.path;
                      const isPlayingFile = isPlaying && currentFile?.path === f.path;
                      const isChecked = selectedTracksList.includes(f.path);
                      const waveform = getMockWaveform(f.name);
                      
                      return (
                        <div
                          key={f.path}
                          onClick={() => setSelectedTrack(f)}
                          className={`group relative bg-[#13161f]/80 rounded-2xl p-4 border transition-all duration-300 hover:bg-[#161a25]/90 hover:-translate-y-0.5 ${isSelected ? 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.12)]' : 'border-gray-900'}`}
                        >
                          {/* Multi-select check on the card */}
                          <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleSelectTrack(f.path)} 
                              className="w-3.5 h-3.5 rounded bg-[#12131a] border-gray-800 accent-emerald-500 cursor-pointer focus:ring-0" 
                            />
                          </div>

                          {/* Top part: Cover thumbnail, Title, artist, ellipsis */}
                          <div className="flex gap-3 items-center">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getGradientFromTitle(f.name)} flex items-center justify-center shadow-md relative overflow-hidden shrink-0`}>
                              {f.coverArt ? (
                                <img src={f.coverArt} alt="Cover" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg text-white drop-shadow-md">{f.type === 'video' ? '🎬' : '🎵'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-xs text-white truncate pr-4" title={f.name}>{f.name}</h3>
                              <span className="text-[10px] text-gray-500 truncate block w-full">{f.artist || 'Unknown Artist'}</span>
                            </div>
                            <button className="text-gray-600 hover:text-gray-300 text-xs self-start mt-1">︙</button>
                          </div>

                          {/* Center Part: Waveform & Play button overlay */}
                          <div className="flex items-center gap-3 mt-4">
                            {/* Round green floating play button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); playFile(f); }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shadow transition-all duration-300 scale-95 group-hover:scale-100 ${isPlayingFile ? 'bg-emerald-500 text-black' : 'bg-[#181b24] text-white hover:bg-emerald-500 hover:text-black'}`}
                            >
                              <span className="text-sm font-semibold">{isPlayingFile ? '⏸' : '▶'}</span>
                            </button>

                            {/* Audio Waveform layout matching design mockup exactly */}
                            <div className="flex-1 flex items-end justify-between h-7 gap-[2px] opacity-75">
                              {waveform.map((h, idx) => (
                                <div
                                  key={idx}
                                  className={`w-[2px] rounded-full transition-all duration-300 ${isPlayingFile ? 'bg-emerald-400 animate-pulse' : 'bg-gray-700'}`}
                                  style={{ 
                                    height: `${h}%`, 
                                    animationDelay: `${idx * 40}ms`,
                                    animationDuration: '800ms'
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Bottom metadata tags matching the color pills in mockup */}
                          <div className="flex gap-1.5 mt-4 text-[8px] font-bold uppercase tracking-wider">
                            <span className="px-2 py-0.5 rounded-full bg-[#1c2e28] text-emerald-400 border border-emerald-500/20">Genre</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#2e1c28] text-pink-400 border border-pink-500/20">Artist</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#1c242e] text-blue-400 border border-blue-500/20">Year</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#2e261c] text-amber-400 border border-amber-500/20">BPM</span>
                          </div>
                        </div>
                      );
                    })}
                    {!sortedSongs.length && <p className="col-span-full text-center text-gray-600 py-12 text-xs">No media files available in this view.</p>}
                  </div>
                ) : (
                  /* Standard clean list view */
                  <div className="bg-[#13161f] rounded-2xl border border-gray-900 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0f1118]/80 text-gray-500 border-b border-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-center w-10">#</th>
                          <th className="px-4 py-3 text-left">Title</th>
                          <th className="px-4 py-3 text-center w-20">Type</th>
                          <th className="px-4 py-3 text-right w-24">Size</th>
                          <th className="px-4 py-3 text-center w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSongs.map((f, idx) => (
                          <tr 
                            key={f.path} 
                            onClick={() => setSelectedTrack(f)} 
                            className={`border-b border-gray-900/40 hover:bg-[#181b24]/50 cursor-pointer transition ${selectedTrack?.path === f.path ? 'bg-emerald-500/5' : ''}`}
                          >
                            <td className="px-4 py-3 text-center text-gray-600 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-white truncate max-w-xs">{f.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${f.type === 'video' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{f.type.toUpperCase()}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 font-mono">{fmtSize(f.size)}</td>
                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => playFile(f)} className="text-emerald-400 hover:text-emerald-300 font-semibold">▶ Play</button>
                                <button onClick={() => deleteFile(f.name)} className="text-rose-400 hover:text-rose-350 font-semibold">🗑 Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* view: PLAYLISTS */}
            {view === 'playlists' && (
              <div className="space-y-6">
                <div className="bg-[#13161f] border border-gray-900 p-4 rounded-xl flex gap-2">
                  <input type="text" placeholder="새 플레이리스트 이름 입력..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} className="flex-1 bg-[#12131a] border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <button onClick={createPlaylist} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-bold rounded-lg transition">Create</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map(pl => {
                    const plItems = pl.items.map(p => mediaFiles.find(m => m.path === p)).filter(Boolean) as MediaFile[];
                    const isSelected = selectedPlaylistId === pl.id;
                    return (
                      <div key={pl.id} className={`bg-[#13161f] rounded-2xl border p-4 cursor-pointer transition-all ${isSelected ? 'border-emerald-500/80 bg-emerald-500/[0.02]' : 'border-gray-900 hover:border-gray-800'}`} onClick={() => setSelectedPlaylistId(isSelected ? null : pl.id)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm tracking-wide text-white">{pl.name}</h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">{plItems.length} songs</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} className="text-rose-400 hover:text-rose-350 text-xs">Delete</button>
                        </div>
                        <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                          <button onClick={() => playPlaylistRewrite(plItems)} className="text-[10px] py-1.5 bg-[#1b2f28] text-emerald-400 border border-emerald-950 hover:bg-emerald-900/20 rounded font-semibold flex-1 transition">▶ 재생 및 덮어쓰기</button>
                          <button onClick={() => playPlaylistAppend(plItems)} className="text-[10px] py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded font-semibold flex-1 transition">➕ 대기열 추가</button>
                        </div>

                        {isSelected && (
                          <div className="mt-4 border-t border-gray-900 pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 mb-2">Tracks ({plItems.length})</h4>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {plItems.length ? plItems.map((item, idx) => (
                                  <div key={`${item.path}-${idx}`} className="flex items-center justify-between p-2 bg-[#08090d]/60 rounded border border-gray-900/60">
                                    <span className="text-xs truncate max-w-[120px] text-gray-300">{item.name}</span>
                                    <button onClick={() => playFile(item)} className="text-emerald-400 text-xs font-bold">▶</button>
                                  </div>
                                )) : <p className="text-[10px] text-gray-500">플레이리스트가 비어 있습니다.</p>}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 mb-2">Manage library tracks</h4>
                              <div className="max-h-32 overflow-y-auto space-y-1 bg-[#08090d]/80 p-2 rounded border border-gray-900">
                                {mediaFiles.map(file => {
                                  const isIn = pl.items.includes(file.path);
                                  return (
                                    <label key={file.path} className="flex items-center justify-between p-1.5 hover:bg-[#181b24]/40 rounded cursor-pointer">
                                      <span className="text-[10px] truncate max-w-[150px] text-gray-400">{file.name}</span>
                                      <input type="checkbox" checked={isIn} onChange={() => togglePlaylistItem(pl.id, file.path, isIn)} className="rounded text-emerald-600 focus:ring-0 accent-emerald-600" />
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
                  {!playlists.length && <p className="col-span-full text-center py-8 text-gray-500 text-xs">No playlists created.</p>}
                </div>
              </div>
            )}

            {/* view: UPLOAD */}
            {view === 'upload' && (
              <div className="max-w-xl mx-auto py-12">
                <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-950 hover:border-gray-800 bg-[#13161f]/80'}`} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
                  <p className="text-6xl mb-4">☁️</p>
                  <p className="text-base font-bold text-white mb-1">Drag & Drop music or video files</p>
                  <p className="text-xs text-gray-500 mb-6">Supports MP3, WAV, M4A, MP4 formats</p>
                  <input type="file" multiple accept="audio/*,video/*" onChange={e => handleUpload(e.target.files)} className="hidden" id="file-upload-main" />
                  <label htmlFor="file-upload-main" className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-black rounded-lg shadow-lg cursor-pointer text-xs font-bold transition">Choose Files</label>
                </div>
              </div>
            )}

            {/* view: RECENT */}
            {view === 'recent' && (
              <div className="bg-[#13161f] rounded-2xl border border-gray-900 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#0f1118]/80 text-gray-500 border-b border-gray-900">
                    <tr><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-right">Added</th></tr>
                  </thead>
                  <tbody>
                    {mediaFiles.map(f => (
                      <tr key={f.path} className="border-b border-gray-900/40 hover:bg-[#181b24]/40">
                        <td className="px-4 py-3 truncate max-w-sm font-semibold text-white">{f.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${f.type === 'video' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{f.type.toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-right text-gray-500">{f.addedAt ? new Date(f.addedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* PANEL 3: Right Track Inspector & Preview Panel */}
        <aside className="w-80 bg-[#0f1118] border-l border-[#181b24] flex flex-col shrink-0 overflow-y-auto">
          {selectedTrack ? (
            <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Large high-fidelity visual cover with dyn-glow drop shadow */}
              <div className="space-y-4">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block">Track Info</span>
                
                {/* Glowing vinyl/glowing city cover visualizer */}
                <div className={`aspect-square w-full rounded-2xl bg-gradient-to-br ${getGradientFromTitle(selectedTrack.name)} flex flex-col items-center justify-center shadow-xl relative overflow-hidden border border-white/5 group`}>
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
                  <h2 className="font-bold text-base text-white tracking-wide line-clamp-2" title={selectedTrack.name}>{selectedTrack.name}</h2>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold font-mono">{selectedTrack.artist || 'Unknown Artist'}</span>
                </div>
              </div>

              {/* Inspector Metadata List matching mockup values */}
              <div className="space-y-4 pt-4 border-t border-gray-900 flex-1">
                <div className="space-y-3 text-[10px] font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 uppercase">Length</span>
                    <span className="text-white font-mono">3:45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 uppercase">Format</span>
                    <span className="text-white font-mono uppercase">{selectedTrack.path.split('.').pop()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 uppercase">Bitrate</span>
                    <span className="text-white font-mono text-[9px] text-right">24-bit / 96kHz, 1411 kbps</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-500 uppercase block mb-1">File Path</span>
                    <span className="font-mono text-[9px] text-gray-400 break-all bg-black/20 p-1.5 rounded block">{selectedTrack.path}</span>
                  </div>
                </div>

                {/* Gray capsule tag pills from design mockup */}
                <div className="space-y-2 pt-2 border-t border-gray-900/60">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {['Electronic', 'Synthwave', 'Chill', 'Retro', '120 BPM'].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-[#12131a] text-gray-400 border border-gray-800 text-[9px] font-semibold">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action area: Add to Playlist glowing button & Play controls */}
              <div className="space-y-3 pt-4 border-t border-gray-900">
                <div className="flex gap-2">
                  <button onClick={() => playFile(selectedTrack)} className="flex-1 py-2 bg-[#12131a] hover:bg-[#181b24] text-white rounded-xl text-xs font-bold transition border border-gray-800 flex items-center justify-center gap-1.5">
                    ▶ Play
                  </button>
                  <button onClick={() => deleteFile(selectedTrack.name)} className="px-3 py-2 bg-[#12131a] hover:bg-rose-950/20 hover:text-rose-400 border border-gray-800 text-gray-500 rounded-xl text-xs transition">
                    🗑 Delete
                  </button>
                </div>

                {/* Grand Neon Green Glowing Gradient Button from Mockup */}
                <div className="relative">
                  <button 
                    onClick={() => setIsPlaylistDropdownOpen(!isPlaylistDropdownOpen)} 
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:scale-[1.01] text-black font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1"
                  >
                    Add to Playlist
                  </button>

                  {/* Dropdown playlist selector */}
                  {isPlaylistDropdownOpen && playlists.length > 0 && (
                    <div className="absolute bottom-12 left-0 right-0 bg-[#12131a] border border-gray-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 max-h-48 overflow-y-auto">
                      <span className="text-[9px] text-gray-500 font-bold block px-2 py-1 border-b border-gray-900 mb-1">Select target Playlist</span>
                      {playlists.map(pl => (
                        <button
                          key={pl.id}
                          onClick={() => { handleAddTrack(pl.id, pl.name, selectedTrack); setIsPlaylistDropdownOpen(false); }}
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-600">
              <span className="text-4xl mb-3">🎵</span>
              <p className="text-xs">Select a track from the library workspace to inspect files and add to playlists.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ─── Bottom Persistent Media Player Bar ─── */}
      {currentFile && (
        <>
          <div className="h-16 bg-[#0f1118] border-t border-gray-900 flex items-center justify-between px-6 z-50 shrink-0 select-none">
            {/* Left track details */}
            <div className="w-52 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getGradientFromTitle(currentFile.name)} flex items-center justify-center shrink-0 shadow overflow-hidden`}>
                {currentFile.coverArt ? (
                  <img src={currentFile.coverArt} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg text-white">💿</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate w-36" title={currentFile.name}>{currentFile.name}</p>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono truncate w-36 block">{currentFile.artist || 'playing'}</span>
              </div>
            </div>

            {/* Center Player Panel controls */}
            <div className="flex flex-col items-center flex-1 max-w-xl gap-1">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleShuffle}
                  className={`text-xs transition ${isShuffle ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
                  title="Shuffle"
                >
                  🔀
                </button>
                <button onClick={handlePrev} className="text-sm text-gray-400 hover:text-white transition">⏮</button>
                <button onClick={togglePlay} className="w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center hover:scale-105 transition shadow">
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={() => handleNext(false)} className="text-sm text-gray-400 hover:text-white transition">⏭</button>
                <button
                  onClick={toggleRepeat}
                  className={`text-xs transition ${repeatMode !== 'none' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
                  title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
                >
                  {repeatMode === 'one' ? '🔂' : '🔁'}
                </button>
              </div>

              {/* Seek slider range */}
              <div className="w-full flex items-center gap-2.5 text-[9px] text-gray-500 font-mono">
                <span className="w-8 text-right">{fmtTime(currentTime)}</span>
                <button onClick={() => seekBy(-10)} className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold">-10</button>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    const el = getMediaEl();
                    if (el) {
                      el.currentTime = val;
                      setCurrentTime(val);
                    }
                  }}
                  className="flex-1 h-1 bg-gray-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                />
                <button onClick={() => seekBy(10)} className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold">+10</button>
                <span className="w-8">{fmtTime(duration)}</span>
              </div>
            </div>

            {/* Right side items: Volume & counters */}
            <div className="w-56 flex items-center justify-end gap-4 shrink-0">
              <span className="text-[9px] text-gray-500 font-mono">{queueIndex + 1} / {queue.length} Tracks</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">{volume > 0 ? '🔊' : '🔇'}</span>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-16 h-1 accent-emerald-500 bg-gray-800" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── MODAL: Duplicate Strategy Resolver ─── */}
      {duplicateModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#13161f] border border-gray-800/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-sm font-bold text-white mt-2">중복 곡 감지됨</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] mx-auto break-all leading-relaxed">
                &quot;{duplicateModal.trackName}&quot; 곡이 플레이리스트 &quot;{duplicateModal.playlistName}&quot; 에 이미 존재합니다. 추가 방식을 선택하세요.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2 text-xs font-semibold">
              <button
                onClick={() => handleResolveDuplicate('skip')}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                Skip (중복 추가 안 함)
              </button>
              <button
                onClick={() => handleResolveDuplicate('replace')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-lg shadow-amber-600/10"
              >
                Replace (기존 항목 대체)
              </button>
              <button
                onClick={() => handleResolveDuplicate('keep_both')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-black rounded-lg transition shadow-lg shadow-emerald-600/10"
              >
                Keep Both (중복 허용 및 추가)
              </button>
            </div>
            <button
              onClick={() => setDuplicateModal(null)}
              className="w-full text-center text-[10px] text-gray-500 hover:text-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}