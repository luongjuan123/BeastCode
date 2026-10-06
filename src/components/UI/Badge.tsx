import React from "react";

export interface BadgeProps {
	children: React.ReactNode;
	variant?: "default" | "success" | "warning" | "error" | "info" | "accent";
	size?: "sm" | "md";
	dot?: boolean;
	className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
	children,
	variant = "default",
	size = "sm",
	dot = false,
	className = "",
}) => {
	const variantStyles = {
		default: "bg-[#151816] text-text-secondary border-border-default",
		success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
		warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
		error: "bg-red-500/10 text-red-400 border-red-500/20",
		info: "bg-slate-500/10 text-slate-300 border-slate-500/20",
		accent: "bg-accent/10 text-accent border-accent/25",
	};

	const dotStyles = {
		default: "bg-text-muted",
		success: "bg-emerald-400",
		warning: "bg-amber-400",
		error: "bg-red-400",
		info: "bg-slate-300",
		accent: "bg-accent",
	};

	const sizeStyles = {
		sm: "text-[11px] px-2 py-0.5 rounded-[4px] gap-1.5 font-medium",
		md: "text-xs px-2.5 py-1 rounded-md gap-1.5 font-medium",
	};

	return (
		<span className={`inline-flex items-center border select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
			{dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
			<span>{children}</span>
		</span>
	);
};

export default Badge;
