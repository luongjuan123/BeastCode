import { atom } from 'recoil';

export type ExecutionStatus = 
  | 'idle' 
  | 'compiling' 
  | 'running' 
  | 'accepted' 
  | 'compile_error' 
  | 'wrong_answer' 
  | 'error';

export interface ExecutionState {
  status: ExecutionStatus;
  isLoading: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  showIndicator: boolean;
  dismissAt: number; // timestamp for auto-dismiss
}

export const executionStateAtom = atom<ExecutionState>({
  key: 'executionState',
  default: {
    status: 'idle',
    isLoading: false,
    message: '',
    type: 'info',
    showIndicator: false,
    dismissAt: 0,
  },
});
