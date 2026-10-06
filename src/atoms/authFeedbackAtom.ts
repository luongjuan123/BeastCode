import { atom } from 'recoil';

export interface AuthFeedback {
  error: string;
  fieldErrors: Record<string, string>;
  isLoading: boolean;
  success: string;
}

export const authFeedbackAtom = atom<AuthFeedback>({
  key: 'authFeedback',
  default: {
    error: '',
    fieldErrors: {},
    isLoading: false,
    success: '',
  },
});
