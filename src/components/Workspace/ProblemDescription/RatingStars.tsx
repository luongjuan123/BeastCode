import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { useSetRecoilState } from 'recoil';
import { ratingFeedbackAtom } from '@/atoms/ratingFeedbackAtom';
import { doc, setDoc } from 'firebase/firestore';
import { firestore, auth } from '@/firebase/firebase';

interface RatingStarsProps {
  problemId: string;
  initialRating: number;
  submissionsCount?: number;
}

/**
 * RatingStars: Optimistic, tactile star rating without toast notifications
 * 
 * Behavior:
 * - Click star → Instantly fills with amber color (optimistic)
 * - Shows "Saving..." text indicator
 * - On success: Text fades to "Saved" then disappears
 * - On error: Reverts star color to initial state
 * 
 * Replaces: toast("You rated this challenge 4 stars!")
 */
const RatingStars: React.FC<RatingStarsProps> = ({
  problemId,
  initialRating,
  submissionsCount,
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [localRating, setLocalRating] = useState(initialRating);
  const [isSaving, setIsSaving] = useState(false);
  const setRatingFeedback = useSetRecoilState(ratingFeedbackAtom);

  const handleStarClick = async (rating: number) => {
    if (isSaving) return;

    // OPTIMISTIC UPDATE: Instantly change UI
    setLocalRating(rating);
    setRatingFeedback({
      problemId,
      rating,
      isAnimating: true,
      confirmedRating: 0,
    });

    // Micro-delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 200));

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Save to Firestore
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(
          userRef,
          {
            problemRatings: {
              [problemId]: rating,
            },
          },
          { merge: true }
        );

        // CONFIRM UPDATE: Mark as persisted
        setRatingFeedback((prev) => ({
          ...prev,
          confirmedRating: rating,
          isAnimating: false,
        }));

        // Auto-fade feedback after 1.2s
        setTimeout(() => {
          setRatingFeedback((prev) => ({
            ...prev,
            isAnimating: false,
            confirmedRating: 0,
          }));
        }, 1200);
      }
    } catch (error) {
      // REVERT: Roll back optimistic update
      console.error('Rating save failed:', error);
      setLocalRating(initialRating);
      setRatingFeedback((prev) => ({
        ...prev,
        isAnimating: false,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSaving}
            className={`
              transition-all duration-200 ease-out
              ${isSaving ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-110'}
              active:scale-95 transform
              ${
                star <= (hoverRating || localRating)
                  ? 'text-amber-500'
                  : 'text-gray-700 dark:text-gray-600'
              }
            `}
            title={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <FaStar size={18} />
          </button>
        ))}
      </div>

      {/* SILENT CONFIRMATION INDICATOR */}
      {localRating > 0 && (
        <div
          className={`
            text-xs font-medium text-amber-600 dark:text-amber-400
            transition-opacity duration-300
            ${isSaving || localRating !== initialRating ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {isSaving ? 'Saving...' : 'Saved'}
        </div>
      )}

      {submissionsCount !== undefined && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {submissionsCount} submission{submissionsCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default RatingStars;
