'use client';

import React from 'react';
import { Icon } from './ui/Icon';

interface CenterHeaderProps {
  search: string;
  setSearch: (val: string) => void;
}

export function CenterHeader({ search, setSearch }: CenterHeaderProps) {
  return (
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
          <span className="absolute left-3.5 top-2 text-gray-500">
            <Icon name="search" size={18} />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-gray-200 relative p-1 transition">
          <Icon name="bell" size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#0b0c10]"></span>
        </button>
        
        <div className="flex items-center gap-2 bg-[#12131a] px-3 py-1.5 rounded-full border border-gray-800 cursor-pointer hover:bg-[#181b24] transition text-xs font-semibold">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Icon name="user" size={14} />
          </div>
          <span>Profile</span>
          <span className="text-[10px] text-gray-500">▼</span>
        </div>
      </div>
    </header>
  );
}
