'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/Skeletons';

export default function ChecklistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Checklist Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="relative z-10">
        <ErrorState 
          title="체크리스트 로드 실패" 
          message={error.message || '체크리스트 데이터를 로드하는 중에 오류가 발생했습니다.'} 
          onRetry={reset} 
        />
      </div>
    </div>
  );
}
