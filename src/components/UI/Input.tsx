import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
	label,
	error,
	helperText,
	leftIcon,
	rightIcon,
	className = "",
	disabled,
	id,
	...props
}, ref) => {
	const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

	return (
		<div className="w-full space-y-1.5">
			{label && (
				<label htmlFor={inputId} className="block text-xs font-medium text-text-secondary select-none">
					{label}
				</label>
			)}
			<div className="relative flex items-center">
				{leftIcon && (
					<div className="absolute left-3 text-text-muted pointer-events-none flex items-center">
						{leftIcon}
					</div>
				)}
				<input
					ref={ref}
					id={inputId}
					disabled={disabled}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className={`w-full bg-[var(--bg-surface)] text-text-primary text-xs rounded-md border transition-colors duration-150 py-2 ${
						leftIcon ? "pl-9" : "pl-3"
					} ${rightIcon ? "pr-9" : "pr-3"} ${
						error ? "border-red-500/50 focus:border-red-500" : "border-border-default focus:border-accent"
					} placeholder:text-text-muted focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
					{...props}
				/>
				{rightIcon && (
					<div className="absolute right-3 text-text-muted flex items-center">
						{rightIcon}
					</div>
				)}
			</div>
			{error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
			{helperText && !error && <p className="text-[11px] text-text-muted">{helperText}</p>}
		</div>
	);
});

Input.displayName = "Input";
export default Input;
