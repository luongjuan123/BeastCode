import React, { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { executionStateAtom } from '@/atoms/executionStateAtom';

/**
 * ExecutionStatusBar: Displays code execution status inline without floating toasts
 * 
 * States:
 * - idle: Hidden
 * - compiling/running: Shows spinner + message
 * - accepted: Green background, auto-dismisses after 4s
 * - compile_error/wrong_answer/error: Red/amber background, stays visible
 * 
 * Replaces all react-toastify calls in the Playground component
 */
const ExecutionStatusBar: React.FC = () => {
  const execState = useRecoilValue(executionStateAtom);
  const [displayMessage, setDisplayMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (execState.status === 'idle' || !execState.message) {
      setDisplayMessage('');
      setIsVisible(false);
      return;
    }

    setDisplayMessage(execState.message);
    setIsVisible(true);

    // Auto-dismiss after specified time for success states
    if (execState.dismissAt > 0) {
      const timeUntilDismiss = execState.dismissAt - Date.now();
      if (timeUntilDismiss > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, timeUntilDismiss);
        return () => clearTimeout(timer);
      }
    }
  }, [execState.status, execState.message, execState.dismissAt]);

  if (!isVisible || !displayMessage) return null;

  const statusColors: Record<string, string> = {
    accepted: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50',
    error: 'bg-rose-950/40 text-rose-400 border-rose-800/50',
    compile_error: 'bg-rose-950/40 text-rose-400 border-rose-800/50',
    wrong_answer: 'bg-amber-950/40 text-amber-400 border-amber-800/50',
    compiling: 'bg-blue-950/40 text-blue-400 border-blue-800/50',
    running: 'bg-blue-950/40 text-blue-400 border-blue-800/50',
  };

  const colorClass = statusColors[execState.status] || 'bg-gray-900/40 text-gray-400 border-gray-800/50';

  return (
    <div
      className={`
        mx-4 mt-3 px-4 py-3 rounded-lg border
        font-mono text-xs
        transition-all duration-300
        ${colorClass}
        ${isVisible ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0'}
        overflow-hidden
      `}
    >
      <div className="flex items-center gap-3">
        {execState.isLoading && (
          <div className="animate-spin flex-shrink-0">
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <path 
                d="M12 2a10 10 0 0110 10" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
        )}
        <span className="flex-1">{displayMessage}</span>
      </div>
    </div>
  );
};

export default ExecutionStatusBar;
