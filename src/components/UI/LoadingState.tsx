import React from "react";

export interface LoadingStateProps {
	message?: string;
	className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
	message = "Loading...",
	className = "",
}) => {
	return (
		<div className={`flex flex-col items-center justify-center py-16 gap-3 select-none ${className}`}>
			<div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
			{message && <span className="text-xs text-text-muted font-medium">{message}</span>}
		</div>
	);
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = "h-4 w-full" }) => {
	return (
		<div className={`bg-[var(--bg-elevated)] border border-border-subtle rounded-md animate-pulse ${className}`} />
	);
};

export default LoadingState;
