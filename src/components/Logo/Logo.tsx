import React from "react";

interface LogoProps {
	className?: string;
	iconOnly?: boolean;
	size?: number;
}

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ 
	size = 28, 
	className = "", 
}) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={`inline-block select-none ${className}`}
		>
			{/* Technical Hexagon Frame */}
			<polygon
				points="50,8 88,29 88,71 50,92 12,71 12,29"
				stroke="var(--accent, #22c55e)"
				strokeWidth="5"
				strokeLinejoin="round"
				fill="#0f1210"
			/>

			{/* Left Bracket (<) */}
			<path
				d="M 38,34 L 24,50 L 38,66"
				stroke="var(--text-primary, #f1f3ef)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Right Bracket (>) */}
			<path
				d="M 62,34 L 76,50 L 62,66"
				stroke="var(--text-primary, #f1f3ef)"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Center Slash (/) */}
			<path
				d="M 56,28 L 44,72"
				stroke="var(--accent, #22c55e)"
				strokeWidth="6.5"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const Logo: React.FC<LogoProps> = ({ className = "", iconOnly = false, size = 26 }) => {
	if (iconOnly) {
		return <LogoIcon size={size} className={className} />;
	}

	return (
		<div className={`flex items-center gap-2.5 select-none ${className}`}>
			<LogoIcon size={size} />
			<span className="text-base font-semibold tracking-tight font-sans text-text-primary">
				Beast<span className="font-semibold text-accent ml-0.5">Code</span>
			</span>
		</div>
	);
};

export default Logo;
