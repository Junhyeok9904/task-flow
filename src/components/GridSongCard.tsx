import React from 'react';
import { MediaFile } from '../types';
import { useSwipeToQueue } from './useSwipeToQueue';
import { WaveformVisualizer } from './WaveformVisualizer';
import { SongMetadataTags } from './SongMetadataTags';
import { getMockWaveform, getGradientFromTitle } from './SongHelpers';

interface GridSongCardProps {
  f: MediaFile;
  isSelected: boolean;
  isPlayingFile: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onPlay: () => void;
  onMenuClick: (e: React.MouseEvent, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  showToast: (msg: string) => void;
}

export function GridSongCard({
  f,
  isSelected,
  isPlayingFile,
  isChecked,
  onSelect,
  onToggleCheck,
  onPlay,
  onMenuClick,
  addToQueueNext,
  showToast
}: GridSongCardProps) {
  const { translateX, isSwiping, touchHandlers } = useSwipeToQueue(f, () => {
    addToQueueNext(f);
    showToast(`'${f.name.split('/').pop()}'이(가) 대기열에 추가되었습니다.`);
  });

  const waveform = getMockWaveform(f.name);

  return (
    <div 
      className="relative overflow-hidden rounded-2xl border border-gray-900 bg-[#13161f]/80 cursor-pointer"
      onClick={onSelect}
    >
      {/* Green reveal swipe background */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center pl-6 text-white font-bold text-xs pointer-events-none rounded-2xl transition-opacity duration-150"
        style={{ opacity: translateX > 10 ? 1 : 0 }}
      >
        <span className="flex items-center gap-1.5 animate-pulse">
          ➕ 대기열에 추가됨
        </span>
      </div>

      {/* Slidable front content */}
      <div
        {...touchHandlers}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
        className={`w-full h-full p-4 transition-all duration-300 hover:bg-[#161a25]/90 ${isSelected ? 'border-r-4 border-emerald-500/80' : ''}`}
      >
        {/* Multi-select check on the card */}
        <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isChecked} 
            onChange={onToggleCheck} 
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
            <h3 className="font-bold text-xs text-white truncate pr-4" title={f.name}>
              {f.name.split('/').pop()}
            </h3>
            <span className="text-[10px] text-gray-500 truncate block w-full">{f.artist || 'Unknown Artist'}</span>
          </div>
          <button 
            onClick={(e) => onMenuClick(e, f)}
            className="text-gray-500 hover:text-white p-1 text-sm self-start mt-0.5 active:scale-90 transition-transform"
          >
            ︙
          </button>
        </div>

        {/* Center Part: Waveform & Play button overlay */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shadow transition-all duration-300 scale-95 hover:scale-100 active:scale-90 bg-black/40 border border-white/10"
          >
            <img 
              src={isPlayingFile ? "/images/premium_pause_icon.png" : "/images/premium_play_icon.png"} 
              alt={isPlayingFile ? "Pause" : "Play"} 
              className="w-full h-full object-cover scale-110"
            />
          </button>

          <WaveformVisualizer waveform={waveform} isPlayingFile={isPlayingFile} />
        </div>

        <SongMetadataTags />
      </div>
    </div>
  );
}
