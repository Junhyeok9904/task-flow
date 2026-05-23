'use client';

import React from 'react';

interface ConfirmModalGroupProps {
  duplicateModal: {
    isOpen: boolean;
    playlistId: string;
    playlistName: string;
    trackPath: string;
    trackName: string;
  } | null;
  setDuplicateModal: (val: any) => void;
  handleResolveDuplicate: (strategy: 'skip' | 'replace' | 'keep_both') => void;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    isAlert?: boolean;
  } | null;
  setConfirmDialog: (val: any) => void;
}

export function ConfirmModalGroup({
  duplicateModal,
  setDuplicateModal,
  handleResolveDuplicate,
  confirmDialog,
  setConfirmDialog
}: ConfirmModalGroupProps) {
  return (
    <>
      {/* Duplicate strategy MODAL */}
      {duplicateModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-black/40 backdrop-blur-3xl border border-amber-500/20 rounded-3xl w-full max-w-sm p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-5">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-sm font-bold text-white mt-2">중복 곡 감지됨</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] mx-auto break-all leading-relaxed font-sans">
                &quot;{duplicateModal.trackName}&quot; 곡이 플레이리스트 &quot;{duplicateModal.playlistName}&quot; 에 이미 존재합니다. 추가 방식을 선택하세요.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2 text-xs font-semibold">
              <button onClick={() => handleResolveDuplicate('skip')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-amber-500/30 transition">Skip (Do not add)</button>
              <button onClick={() => handleResolveDuplicate('replace')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-amber-500/30 transition">Replace (Override current)</button>
              <button onClick={() => handleResolveDuplicate('keep_both')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-amber-400 rounded-xl border border-amber-500/50 transition">Keep Both (Allow duplicate)</button>
            </div>
            <button onClick={() => setDuplicateModal(null)} className="w-full text-center text-[10px] text-gray-500 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Custom Confirm dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`bg-[#0a0a0d]/90 backdrop-blur-3xl border ${confirmDialog.isDanger ? 'border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)]' : 'border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]'} rounded-3xl w-full max-w-sm p-8 space-y-6`}>
            <div className="text-center">
              <span className="text-4xl">{confirmDialog.isDanger ? '🚨' : (confirmDialog.isAlert ? '✅' : '❓')}</span>
              <h3 className="text-sm font-bold text-white mt-2">{confirmDialog.title}</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] mx-auto break-all leading-relaxed font-sans">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-2">
              {!confirmDialog.isAlert && <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition text-xs font-bold">{confirmDialog.cancelText || 'Cancel'}</button>}
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className={`flex-1 py-2.5 ${confirmDialog.isDanger ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'} rounded-xl border transition text-xs font-bold`}>{confirmDialog.confirmText || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
