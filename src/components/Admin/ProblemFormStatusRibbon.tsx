import React, { useEffect, useState } from 'react';
import { FaCheck, FaExclamationCircle } from 'react-icons/fa';

export type FormStatus = 'idle' | 'saving' | 'success' | 'error';

interface ProblemFormStatusRibbonProps {
  status: FormStatus;
  message?: string;
  autoDismissMs?: number;
}

/**
 * ProblemFormStatusRibbon: Low-profile inline status indicator for admin form submissions
 * 
 * Replaces floating success/error toasts with a contextual ribbon that:
 * - Slides in from top
 * - Shows spinner during save
 * - Shows checkmark on success, then auto-dismisses
 * - Shows error persistently until cleared
 * - Never blocks form interaction
 */
const ProblemFormStatusRibbon: React.FC<ProblemFormStatusRibbonProps> = ({
  status,
  message,
  autoDismissMs = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setIsVisible(true);

      if (status === 'success' && autoDismissMs > 0) {
        const timer = setTimeout(() => setIsVisible(false), autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [status, autoDismissMs]);

  if (!isVisible || status === 'idle') return null;

  const statusStyles: Record<FormStatus, { background: string; color: string; borderColor: string }> = {
    saving: {
      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
      color: "var(--accent)",
      borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
    },
    success: {
      background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
      color: "var(--color-success)",
      borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)",
    },
    error: {
      background: "color-mix(in srgb, var(--color-error) 12%, transparent)",
      color: "var(--color-error)",
      borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)",
    },
    idle: {
      background: "transparent",
      color: "transparent",
      borderColor: "transparent",
    },
  };

  return (
    <div
      className={`
        mx-4 mb-4 px-4 py-3 rounded-lg border
        flex items-center gap-3
        transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
      `}
      style={statusStyles[status]}
    >
      {status === 'saving' && (
        <svg 
          className='animate-spin w-5 h-5 flex-shrink-0' 
          fill='none' 
          stroke='currentColor' 
          viewBox='0 0 24 24'
        >
          <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' opacity='0.3' />
          <path d='M12 2a10 10 0 0110 10' strokeWidth='2' strokeLinecap='round' />
        </svg>
      )}
      {status === 'success' && <FaCheck className='flex-shrink-0' size={18} />}
      {status === 'error' && <FaExclamationCircle className='flex-shrink-0' size={18} />}

      <span className='text-sm font-medium'>{message}</span>
    </div>
  );
};

export default ProblemFormStatusRibbon;
