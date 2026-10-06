import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
	children,
	header,
	footer,
	noPadding = false,
	className = "",
	...props
}) => {
	return (
		<div
			className={`bg-[var(--bg-surface)] border border-border-default rounded-lg overflow-hidden ${className}`}
			{...props}
		>
			{header && (
				<div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between">
					{header}
				</div>
			)}
			<div className={noPadding ? "" : "p-5"}>
				{children}
			</div>
			{footer && (
				<div className="px-5 py-3 border-t border-border-default bg-[#0c0e0d] flex items-center justify-between text-xs text-text-muted">
					{footer}
				</div>
			)}
		</div>
	);
};

export default Card;
