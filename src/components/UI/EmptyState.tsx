import React from "react";

export interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon,
	title,
	description,
	action,
	className = "",
}) => {
	return (
		<div className={`flex flex-col items-center justify-center text-center py-14 px-4 select-none ${className}`}>
			{icon && (
				<div className="w-10 h-10 rounded-md bg-[var(--bg-elevated)] border border-border-default flex items-center justify-center text-text-muted mb-3.5">
					{icon}
				</div>
			)}
			<h3 className="text-sm font-semibold text-text-primary mb-1">
				{title}
			</h3>
			{description && (
				<p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed font-normal">
					{description}
				</p>
			)}
			{action && (
				<div className="mt-1">
					{action}
				</div>
			)}
		</div>
	);
};

export default EmptyState;
