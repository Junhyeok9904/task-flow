'use client';

import React from 'react';
import { useAudioPlayer, CompressorMode, CompressorSettings } from '../contexts/AudioProvider';

interface CompressorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompressorSettingsModal({ isOpen, onClose }: CompressorSettingsModalProps) {
  const {
    compressorMode,
    setCompressorMode,
    compressorSettings,
    setCompressorSettings
  } = useAudioPlayer();

  if (!isOpen) return null;

  const handleModeChange = (mode: CompressorMode) => {
    setCompressorMode(mode);
  };

  const handleSettingChange = (key: keyof CompressorSettings, val: number) => {
    setCompressorSettings({
      ...compressorSettings,
      [key]: val
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Card */}
      <div 
        className="w-full max-w-md bg-[#0a0b10]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[90vh] transition-transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🎛️</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              실시간 볼륨 평준화 (Compressor)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            곡별로 소리가 너무 작거나 너무 큰 편차를 줄여 실시간으로 고른 볼륨을 제공합니다. 
            야간 모드는 갑자기 큰 소리가 나는 것을 억제해 줍니다.
          </p>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              볼륨 평준화 모드
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['off', 'soft', 'medium', 'strong', 'custom'] as CompressorMode[]).map((mode) => {
                const labels: Record<CompressorMode, string> = {
                  off: '끔',
                  soft: '부드럽게',
                  medium: '표준',
                  strong: '야간모드',
                  custom: '전문가용'
                };
                const isActive = compressorMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition-all border shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'bg-[#12131a] text-gray-400 border-transparent hover:bg-[#181b24] hover:text-gray-300'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Settings Sliders */}
          <div className={`space-y-4 pt-4 border-t border-white/5 transition-opacity duration-200 ${
            compressorMode === 'custom' ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                세부 음향 매개변수
              </label>
              {compressorMode !== 'custom' && (
                <span className="text-[9px] text-emerald-400/70 font-semibold bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                  프리셋 모드 잠금
                </span>
              )}
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-semibold">임계값 (Threshold)</span>
                <span className="font-mono text-emerald-400">{compressorSettings.threshold} dB</span>
              </div>
              <input 
                type="range" 
                min="-60" 
                max="0" 
                step="1"
                value={compressorSettings.threshold}
                onChange={(e) => handleSettingChange('threshold', parseFloat(e.target.value))}
                disabled={compressorMode !== 'custom'}
                className="w-full h-1 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
              <p className="text-[8px] text-gray-500">이 음량 수준 이상의 소리부터 압축이 동작합니다. 낮을수록 소리가 일정해집니다.</p>
            </div>

            {/* Ratio Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-semibold">압축 비율 (Ratio)</span>
                <span className="font-mono text-emerald-400">{compressorSettings.ratio} : 1</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="20" 
                step="0.5"
                value={compressorSettings.ratio}
                onChange={(e) => handleSettingChange('ratio', parseFloat(e.target.value))}
                disabled={compressorMode !== 'custom'}
                className="w-full h-1 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
              <p className="text-[8px] text-gray-500">임계값을 넘어선 소리를 얼마나 압축할지 정의합니다. 높을수록 압축량이 많아집니다.</p>
            </div>

            {/* Knee Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-semibold">무릎 폭 (Knee)</span>
                <span className="font-mono text-emerald-400">{compressorSettings.knee}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="40" 
                step="1"
                value={compressorSettings.knee}
                onChange={(e) => handleSettingChange('knee', parseFloat(e.target.value))}
                disabled={compressorMode !== 'custom'}
                className="w-full h-1 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
              <p className="text-[8px] text-gray-500">임계값 구간에서 완만하게 압축 효과를 적용해 급격한 음색 변화를 억제합니다.</p>
            </div>

            {/* Attack Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-semibold">어택 타임 (Attack)</span>
                <span className="font-mono text-emerald-400">{(compressorSettings.attack * 1000).toFixed(0)} ms</span>
              </div>
              <input 
                type="range" 
                min="0.001" 
                max="0.100" 
                step="0.001"
                value={compressorSettings.attack}
                onChange={(e) => handleSettingChange('attack', parseFloat(e.target.value))}
                disabled={compressorMode !== 'custom'}
                className="w-full h-1 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
              <p className="text-[8px] text-gray-500">임계값을 넘은 후 감쇄량이 전체 효과에 도달하는 데 걸리는 반응 시간입니다.</p>
            </div>

            {/* Release Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-semibold">릴리즈 타임 (Release)</span>
                <span className="font-mono text-emerald-400">{(compressorSettings.release * 1000).toFixed(0)} ms</span>
              </div>
              <input 
                type="range" 
                min="0.01" 
                max="1.00" 
                step="0.01"
                value={compressorSettings.release}
                onChange={(e) => handleSettingChange('release', parseFloat(e.target.value))}
                disabled={compressorMode !== 'custom'}
                className="w-full h-1 bg-[#12131a] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
              <p className="text-[8px] text-gray-500">소리가 임계값 아래로 내려갔을 때 볼륨 감쇄 상태를 해제하고 원상 복구하는 시간입니다.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
          >
            적용 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
