'use client';

import React, { useState } from 'react';
import { MediaFile } from '../types';
import { Icon } from './ui/Icon';
import { fmtTime, getGradientFromTitle } from './SongHelpers';
import { CompressorSettingsModal } from './CompressorSettingsModal';
import { CompressorMode } from '../contexts/AudioProvider';

interface BottomMediaPlayerBarProps {
  currentFile: MediaFile | null;
  isPlaying: boolean;
  togglePlay: () => void;
  handlePrev: () => void;
  handleNext: (val: boolean) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  repeatMode: 'none' | 'one' | 'all';
  toggleRepeat: () => void;
  currentTime: number;
  duration: number;
  seekBy: (sec: number) => void;
  getMediaEl: () => HTMLAudioElement | HTMLVideoElement | null;
  setCurrentTime: (val: number) => void;
  volume: number;
  setVolume: (val: number) => void;
  queueIndex: number;
  queue: MediaFile[];
  compressorMode: CompressorMode;
}

export function BottomMediaPlayerBar({
  currentFile,
  isPlaying,
  togglePlay,
  handlePrev,
  handleNext,
  isShuffle,
  toggleShuffle,
  repeatMode,
  toggleRepeat,
  currentTime,
  duration,
  seekBy,
  getMediaEl,
  setCurrentTime,
  volume,
  setVolume,
  queueIndex,
  queue,
  compressorMode
}: BottomMediaPlayerBarProps) {
  const [isCompressorOpen, setIsCompressorOpen] = useState(false);

  if (!currentFile) return null;

  return (
    <div className="hidden md:flex h-20 bg-black/50 backdrop-blur-3xl border-t border-white/5 shadow-[0_-4px_30px_rgba(0,0,0,0.4)] items-center justify-between px-8 z-50 shrink-0 select-none relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
      
      {/* Left track details */}
      <div className="w-52 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getGradientFromTitle(
            currentFile.name
          )} flex items-center justify-center shrink-0 shadow overflow-hidden`}
        >
          {currentFile.coverArt ? (
            <img src={currentFile.coverArt} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg text-white">💿</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate w-36" title={currentFile.name}>
            {currentFile.name}
          </p>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono truncate w-36 block">
            {currentFile.artist || 'playing'}
          </span>
        </div>
      </div>

      {/* Center Player Panel controls */}
      <div className="flex flex-col items-center flex-1 max-w-xl gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full transition-all ${
              isShuffle ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Icon name="shuffle" size={16} />
          </button>
          
          <button
            onClick={handlePrev}
            className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition-transform"
            title="Previous Track"
          >
            <Icon name="skip-back" size={18} />
          </button>
          
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.93] transition-all"
            title={isPlaying ? "Pause" : "Play"}
          >
            <img
              src={isPlaying ? "/images/premium_pause_icon.png" : "/images/premium_play_icon.png"}
              alt={isPlaying ? "Pause" : "Play"}
              className="w-full h-full object-cover scale-105"
            />
          </button>
          
          <button
            onClick={() => handleNext(false)}
            className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition-transform"
            title="Next Track"
          >
            <Icon name="skip-forward" size={18} />
          </button>
          
          <button
            onClick={toggleRepeat}
            className={`p-1.5 rounded-full relative transition-all ${
              repeatMode !== 'none' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-gray-500 hover:text-white'
            }`}
            title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
          >
            <Icon name="repeat" size={16} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[7px] bg-emerald-500 text-black px-1 py-0.2 rounded-full font-black scale-90">
                1
              </span>
            )}
          </button>
        </div>

        {/* Seek slider range */}
        <div className="w-full flex items-center gap-2.5 text-[9px] text-gray-500 font-mono">
          <span className="w-8 text-right">{fmtTime(currentTime)}</span>
          <button
            onClick={() => seekBy(-10)}
            className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold"
          >
            -10
          </button>
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
          <button
            onClick={() => seekBy(10)}
            className="px-1.5 py-0.5 bg-[#12131a] rounded border border-gray-800 hover:bg-[#181b24] transition text-[8px] font-bold"
          >
            +10
          </button>
          <span className="w-8">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Right side items: Volume & counters */}
      <div className="w-56 flex items-center justify-end gap-3 shrink-0">
        <span className="text-[9px] text-gray-500 font-mono">{queueIndex + 1} / {queue.length} Tracks</span>
        <button
          onClick={() => setIsCompressorOpen(true)}
          className={`p-1.5 active:scale-90 transition-all flex items-center justify-center rounded-lg ${
            compressorMode !== 'off'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'text-gray-500 hover:text-emerald-400'
          }`}
          title="실시간 볼륨 평준화 (스마트 볼륨)"
        >
          🎛️
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs">{volume > 0 ? '🔊' : '🔇'}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 accent-emerald-500 bg-gray-800"
          />
        </div>
      </div>
      
      <CompressorSettingsModal isOpen={isCompressorOpen} onClose={() => setIsCompressorOpen(false)} />
    </div>
  );
}
