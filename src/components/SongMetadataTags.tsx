import React from 'react';

export function SongMetadataTags() {
  return (
    <div className="flex gap-1.5 mt-4 text-[8px] font-bold uppercase tracking-wider">
      <span className="px-2 py-0.5 rounded-full bg-[#1c2e28] text-emerald-400 border border-emerald-500/20">Genre</span>
      <span className="px-2 py-0.5 rounded-full bg-[#2e1c28] text-pink-400 border border-pink-500/20">Artist</span>
      <span className="px-2 py-0.5 rounded-full bg-[#1c242e] text-blue-400 border border-blue-500/20">Year</span>
      <span className="px-2 py-0.5 rounded-full bg-[#2e261c] text-amber-400 border border-amber-500/20">BPM</span>
    </div>
  );
}
