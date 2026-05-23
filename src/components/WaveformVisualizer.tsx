import React from 'react';

interface WaveformVisualizerProps {
  waveform: number[];
  isPlayingFile: boolean;
}

export function WaveformVisualizer({ waveform, isPlayingFile }: WaveformVisualizerProps) {
  return (
    <div className="flex-1 flex items-end justify-between h-7 gap-[2px] opacity-75">
      {waveform.map((h, idx) => (
        <div
          key={idx}
          className={`w-[2px] rounded-full transition-all duration-300 ${
            isPlayingFile ? 'bg-emerald-400 animate-pulse' : 'bg-gray-700'
          }`}
          style={{ 
            height: `${h}%`, 
            animationDelay: `${idx * 40}ms`,
            animationDuration: '800ms'
          }}
        />
      ))}
    </div>
  );
}
