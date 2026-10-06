import { atom } from 'recoil';

export interface ThreadCommentFeedback {
  isSubmitting: boolean;
  error: string;
  justPosted: null | { id: string; timestamp: number };
}

export const threadCommentFeedbackAtom = atom<ThreadCommentFeedback>({
  key: 'threadCommentFeedback',
  default: {
    isSubmitting: false,
    error: '',
    justPosted: null,
  },
});
