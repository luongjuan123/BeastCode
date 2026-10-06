import React from "react";
import Link from "next/link";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	icon?: React.ReactNode;
	href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
	children,
	variant = "secondary",
	size = "md",
	loading = false,
	icon,
	href,
	className = "",
	disabled,
	...props
}, ref) => {
	const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent";

	const sizeStyles = {
		sm: "h-7 px-2.5 text-xs gap-1.5",
		md: "h-8 px-3.5 text-xs gap-2",
		lg: "h-9 px-4 text-sm gap-2",
	};

	const variantStyles = {
		primary: "bg-accent hover:bg-accent-hover text-[#080909] font-semibold border border-transparent",
		secondary: "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-text-primary border border-border-default hover:border-border-strong",
		ghost: "bg-transparent hover:bg-[var(--bg-hover)] text-text-secondary hover:text-text-primary border border-transparent",
		danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25",
		outline: "bg-transparent text-accent border border-accent/40 hover:bg-accent/10",
	};

	const classes = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

	if (href && !disabled) {
		return (
			<Link href={href} className={classes}>
				{loading ? (
					<svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
					</svg>
				) : icon}
				<span>{children}</span>
			</Link>
		);
	}

	return (
		<button
			ref={ref}
			disabled={disabled || loading}
			className={classes}
			{...props}
		>
			{loading ? (
				<svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
				</svg>
			) : icon}
			<span>{children}</span>
		</button>
	);
});

Button.displayName = "Button";
export default Button;
