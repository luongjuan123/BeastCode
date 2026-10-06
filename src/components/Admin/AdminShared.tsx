import React from "react";
import { FiSearch, FiX, FiChevronLeft, FiChevronRight, FiAlertTriangle, FiLoader } from "react-icons/fi";

// ─── ADMIN CARD ─────────────────────────────────────────────────────────────
interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	hoverable?: boolean;
}
export const AdminCard: React.FC<AdminCardProps> = ({ children, hoverable = false, className = "", ...props }) => {
	return (
		<div
			className={`bg-bg-surface border border-border-default rounded-lg p-5 transition-all duration-150 ${
				hoverable ? "hover:border-border-hover hover:border-accent-brand/30" : ""
			} ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};

// ─── ADMIN HEADER ────────────────────────────────────────────────────────────
interface AdminHeaderProps {
	title: string;
	description?: string;
	actions?: React.ReactNode;
}
export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, description, actions }) => {
	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 select-none">
			<div>
				<h1 className="text-lg md:text-xl font-semibold tracking-tight text-text-primary font-sans">
					{title}
				</h1>
				{description && (
					<p className="text-xs text-text-secondary mt-1 max-w-xl">
						{description}
					</p>
				)}
			</div>
			{actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
		</div>
	);
};

// ─── ADMIN ACTION BUTTON ──────────────────────────────────────────────────────
interface AdminActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	icon?: React.ReactNode;
}
export const AdminActionButton: React.FC<AdminActionButtonProps> = ({
	children,
	variant = "secondary",
	size = "md",
	loading = false,
	icon,
	className = "",
	disabled,
	...props
}) => {
	const baseStyle = "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 rounded-md disabled:opacity-50 disabled:pointer-events-none select-none text-xs";
	
	const sizeStyles = {
		sm: "px-2.5 py-1 text-[11px]",
		md: "px-3.5 py-1.5 text-xs",
		lg: "px-4 py-2 text-sm"
	};

	const variantStyles = {
		primary: "bg-accent-brand text-black hover:bg-accent-hover font-semibold shadow-none",
		secondary: "bg-bg-elevated border border-border-default text-text-primary hover:bg-bg-hover",
		danger: "bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:bg-rose-900/40",
		success: "bg-accent-brand/10 text-accent-brand border border-accent-brand/30 hover:bg-accent-brand/20",
		ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
		outline: "border border-border-default text-text-secondary hover:text-text-primary hover:border-accent-brand/40 bg-transparent"
	};

	return (
		<button
			type="button"
			disabled={disabled || loading}
			className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
			{...props}
		>
			{loading ? <FiLoader className="animate-spin" size={12} /> : icon}
			{children}
		</button>
	);
};

// ─── ADMIN SEARCH BAR ────────────────────────────────────────────────────────
interface AdminSearchBarProps {
	value: string;
	onChange: (val: string) => void;
	placeholder?: string;
	className?: string;
}
export const AdminSearchBar: React.FC<AdminSearchBarProps> = ({
	value,
	onChange,
	placeholder = "Search...",
	className = ""
}) => {
	return (
		<div className={`relative flex items-center bg-bg-base border border-border-default rounded-md px-2.5 py-1.5 focus-within:border-accent-brand focus-within:ring-1 focus-within:ring-accent-brand/30 transition-all ${className}`}>
			<FiSearch className="text-text-muted mr-2 shrink-0" size={13} />
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck={false}
				className="bg-transparent text-xs text-text-primary outline-none w-full placeholder:text-text-muted border-0 p-0 focus:ring-0"
			/>
			{value && (
				<button
					onClick={() => onChange("")}
					className="text-text-muted hover:text-text-primary transition"
				>
					<FiX size={13} />
				</button>
			)}
		</div>
	);
};

// ─── ADMIN FILTER BAR ────────────────────────────────────────────────────────
interface AdminFilterBarProps {
	children: React.ReactNode;
	className?: string;
}
export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({ children, className = "" }) => {
	return (
		<div className={`p-3 bg-bg-elevated/30 border-b border-border-default flex flex-wrap items-center justify-between gap-3 select-none ${className}`}>
			{children}
		</div>
	);
};

// ─── ADMIN STATUS PILL ────────────────────────────────────────────────────────
interface AdminStatusPillProps {
	theme?: "success" | "warning" | "danger" | "info" | "neutral";
	children: React.ReactNode;
}
export const AdminStatusPill: React.FC<AdminStatusPillProps> = ({ theme = "neutral", children }) => {
	const themeStyles = {
		success: "bg-emerald-950/30 border-emerald-800/40 text-emerald-400",
		warning: "bg-amber-950/30 border-amber-800/40 text-amber-400",
		danger: "bg-rose-950/30 border-rose-800/40 text-rose-400",
		info: "bg-blue-950/30 border-blue-800/40 text-blue-400",
		neutral: "bg-bg-base border-border-default text-text-secondary"
	};
	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-medium border capitalize ${themeStyles[theme]}`}>
			{children}
		</span>
	);
};

// ─── ADMIN BADGE ─────────────────────────────────────────────────────────────
interface AdminBadgeProps {
	children: React.ReactNode;
}
export const AdminBadge: React.FC<AdminBadgeProps> = ({ children }) => {
	return (
		<span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-bg-base text-text-secondary border border-border-default">
			{children}
		</span>
	);
};

// ─── ADMIN EMPTY STATE ────────────────────────────────────────────────────────
interface AdminEmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	actionText?: string;
	onAction?: () => void;
}
export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
	icon,
	title,
	description,
	actionText,
	onAction
}) => {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center select-none bg-bg-surface p-6 rounded-lg border border-border-default">
			{icon && (
				<div className="w-10 h-10 rounded-md bg-bg-base flex items-center justify-center text-text-muted mb-3 border border-border-default">
					{icon}
				</div>
			)}
			<h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-text-primary">{title}</h4>
			{description && (
				<p className="text-[11px] text-text-muted mt-1 mb-4 max-w-xs leading-relaxed">
					{description}
				</p>
			)}
			{actionText && onAction && (
				<AdminActionButton variant="primary" onClick={onAction}>
					{actionText}
				</AdminActionButton>
			)}
		</div>
	);
};

// ─── ADMIN LOADING SKELETON ──────────────────────────────────────────────────
interface AdminLoadingSkeletonProps {
	rows?: number;
}
export const AdminLoadingSkeleton: React.FC<AdminLoadingSkeletonProps> = ({ rows = 5 }) => {
	return (
		<div className="p-4 space-y-2.5">
			{Array.from({ length: rows }).map((_, idx) => (
				<div
					key={idx}
					className="flex items-center justify-between p-3.5 bg-bg-base border border-border-subtle rounded-md animate-pulse"
				>
					<div className="flex items-center gap-3 w-1/2">
						<div className="w-3.5 h-3.5 bg-white/5 rounded" />
						<div className="h-3 bg-white/5 rounded w-48" />
					</div>
					<div className="flex gap-2 w-1/3 justify-end">
						<div className="h-3 bg-white/5 rounded w-16" />
						<div className="h-3 bg-white/5 rounded w-16" />
					</div>
				</div>
			))}
		</div>
	);
};

// ─── ADMIN PAGINATION ─────────────────────────────────────────────────────────
interface AdminPaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}
export const AdminPagination: React.FC<AdminPaginationProps> = ({
	currentPage,
	totalPages,
	onPageChange
}) => {
	if (totalPages <= 1) return null;
	return (
		<div className="px-4 py-2.5 bg-bg-elevated/20 border-t border-border-default flex items-center justify-between text-xs text-text-secondary select-none font-mono">
			<span>
				Showing page <span className="font-semibold text-text-primary">{currentPage}</span> of{" "}
				<span className="font-semibold text-text-primary">{totalPages}</span>
			</span>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
					disabled={currentPage === 1}
					className="p-1.5 bg-bg-base hover:bg-bg-elevated border border-border-default rounded-md transition disabled:opacity-30 disabled:pointer-events-none text-text-secondary hover:text-text-primary"
				>
					<FiChevronLeft size={13} />
				</button>
				<button
					type="button"
					onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
					disabled={currentPage === totalPages}
					className="p-1.5 bg-bg-base hover:bg-bg-elevated border border-border-default rounded-md transition disabled:opacity-30 disabled:pointer-events-none text-text-secondary hover:text-text-primary"
				>
					<FiChevronRight size={13} />
				</button>
			</div>
		</div>
	);
};

// ─── ADMIN TABLE ─────────────────────────────────────────────────────────────
interface AdminTableProps {
	children: React.ReactNode;
	className?: string;
}
export const AdminTable: React.FC<AdminTableProps> = ({ children, className = "" }) => {
	return (
		<div className={`overflow-x-auto ${className}`}>
			<table className="w-full text-xs text-left text-text-secondary border-collapse font-sans">
				{children}
			</table>
		</div>
	);
};

// ─── ADMIN MODAL ─────────────────────────────────────────────────────────────
interface AdminModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	className?: string;
}
export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, title, children, className = "" }) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
			<div className={`bg-bg-surface border border-border-default rounded-lg p-5 shadow-2xl max-w-md w-full mx-4 animate-scale-up ${className}`}>
				<div className="flex justify-between items-center mb-4 pb-3 border-b border-border-subtle">
					<h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-text-primary">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-text-muted hover:text-text-primary transition"
					>
						<FiX size={15} />
					</button>
				</div>
				{children}
			</div>
		</div>
	);
};

// ─── ADMIN CONFIRM DIALOG ─────────────────────────────────────────────────────
interface AdminConfirmDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isDanger?: boolean;
	loading?: boolean;
}
export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDanger = false,
	loading = false
}) => {
	return (
		<AdminModal isOpen={isOpen} onClose={onClose} title={title}>
			<div className="space-y-5">
				<p className="text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
					{isDanger && <FiAlertTriangle className="text-rose-400 mt-0.5 shrink-0" size={15} />}
					<span>{message}</span>
				</p>
				<div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
					<AdminActionButton variant="ghost" onClick={onClose} disabled={loading}>
						{cancelText}
					</AdminActionButton>
					<AdminActionButton
						variant={isDanger ? "danger" : "primary"}
						onClick={onConfirm}
						loading={loading}
					>
						{confirmText}
					</AdminActionButton>
				</div>
			</div>
		</AdminModal>
	);
};

// ─── ADMIN SECTION ───────────────────────────────────────────────────────────
interface AdminSectionProps {
	children: React.ReactNode;
	className?: string;
}
export const AdminSection: React.FC<AdminSectionProps> = ({ children, className = "" }) => {
	return <section className={`space-y-5 ${className}`}>{children}</section>;
};

// ─── CONFIRMATION MODAL ALIAS ─────────────────────────────────────────────────
// Alias for backwards compatibility with tab components that import ConfirmationModal
export const ConfirmationModal = AdminConfirmDialog;

