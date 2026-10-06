import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/firebase/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface FollowButtonProps {
  targetUserId: string;
  isFollowingInitial: boolean;
  targetDisplayName?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * FollowButton: State-driven follow/unfollow with smooth morphing UI
 * 
 * Behavior:
 * - Click "Follow" → Button morphs to hollow style
 * - Text changes: "Follow" → "Following"
 * - Background color transitions smoothly
 * - On error: Reverts to original state
 * 
 * Replaces: toast("You are now following X")
 */
const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  isFollowingInitial,
  targetDisplayName,
  onFollowChange,
}) => {
  const [user] = useAuthState(auth);
  const [isFollowing, setIsFollowing] = useState(isFollowingInitial);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleFollowClick = async () => {
    if (!user || isTransitioning) return;

    // OPTIMISTIC UPDATE
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    setIsTransitioning(true);

    try {
      const userRef = doc(firestore, 'users', user.uid);

      if (newFollowingState) {
        // ADD to following list
        await updateDoc(userRef, {
          following: arrayUnion(targetUserId),
        });
      } else {
        // REMOVE from following list
        await updateDoc(userRef, {
          following: arrayRemove(targetUserId),
        });
      }

      // SUCCESS: Keep new state
      setIsTransitioning(false);
      onFollowChange?.(newFollowingState);
    } catch (error) {
      // REVERT: Roll back optimistic update
      console.error('Follow action failed:', error);
      setIsFollowing(!newFollowingState);
      setIsTransitioning(false);
    }
  };

  if (!user) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-600 text-gray-400 cursor-not-allowed"
      >
        Sign in to follow
      </button>
    );
  }

  return (
    <button
      onClick={handleFollowClick}
      disabled={isTransitioning}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm
        transition-all duration-300 ease-out
        ${
          isFollowing
            ? 'bg-transparent border-2 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            : 'bg-brand-orange text-white hover:bg-brand-orange-s'
        }
        ${isTransitioning ? 'opacity-70 cursor-not-allowed' : ''}
        active:scale-95 transform
      `}
    >
      {isTransitioning ? (
        <span className='flex items-center gap-2'>
          <svg className='animate-spin w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' opacity='0.3' />
            <path d='M12 2a10 10 0 0110 10' strokeWidth='2' strokeLinecap='round' />
          </svg>
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
};

export default FollowButton;
