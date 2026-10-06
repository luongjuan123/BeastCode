import { atom } from 'recoil';

export interface RatingFeedback {
  problemId: string;
  rating: number;
  isAnimating: boolean;
  confirmedRating: number;
}

export const ratingFeedbackAtom = atom<RatingFeedback>({
  key: 'ratingFeedback',
  default: {
    problemId: '',
    rating: 0,
    isAnimating: false,
    confirmedRating: 0,
  },
});
