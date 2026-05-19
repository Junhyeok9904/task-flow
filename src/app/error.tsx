'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/Skeletons';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <ErrorState 
          title="어플리케이션 오류 발생" 
          message={error.message || '알 수 없는 시스템 에러가 발생했습니다.'} 
          onRetry={reset} 
        />
      </div>
    </div>
  );
}
