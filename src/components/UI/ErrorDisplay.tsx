import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
	FiAlertOctagon,
	FiShield,
	FiLock,
	FiServer,
	FiCloudOff,
	FiCpu,
	FiAward,
	FiCode,
	FiMessageSquare,
	FiTerminal,
	FiSlash,
	FiCalendar,
	FiZapOff,
	FiClock,
	FiHome,
	FiArrowLeft,
	FiRefreshCw,
	FiSearch,
	FiMail,
} from "react-icons/fi";

export type ErrorType =
	| "404"
	| "403"
	| "401"
	| "500"
	| "503"
	| "maintenance"
	| "contest_not_found"
	| "problem_not_found"
	| "thread_not_found"
	| "submission_not_found"
	| "access_denied"
	| "expired_invitation"
	| "contest_ended"
	| "contest_not_started";

interface ErrorConfig {
	code: string;
	title: string;
	message: string;
	icon: React.ComponentType<{ size: number; className?: string }>;
	showRetry?: boolean;
	showSearchProblems?: boolean;
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
	"404": {
		code: "404",
		title: "Page Not Found",
		message: "The page you are looking for has vanished into space or does not exist.",
		icon: FiAlertOctagon,
	},
	"403": {
		code: "403",
		title: "Forbidden",
		message: "You do not have permission to access this resource. Double-check your access privileges.",
		icon: FiShield,
	},
	"401": {
		code: "401",
		title: "Unauthorized",
		message: "Authentication is required. Please sign in to access this page.",
		icon: FiLock,
	},
	"500": {
		code: "500",
		title: "Internal Server Error",
		message: "Something went wrong on our end. This page is temporarily unavailable.",
		icon: FiServer,
		showRetry: true,
	},
	"503": {
		code: "503",
		title: "Service Unavailable",
		message: "The server is temporarily overloaded or down for maintenance. Please check back later.",
		icon: FiCloudOff,
		showRetry: true,
	},
	maintenance: {
		code: "503",
		title: "System Maintenance",
		message: "We are currently upgrading our systems. BeastCode will be back online shortly.",
		icon: FiCpu,
		showRetry: true,
	},
	contest_not_found: {
		code: "Contest Error",
		title: "Contest Not Found",
		message: "The requested contest could not be found. It may have been deleted, archived, or was private.",
		icon: FiAward,
	},
	problem_not_found: {
		code: "Problem Error",
		title: "Problem Not Found",
		message: "The requested coding problem could not be found. Make sure the ID is correct.",
		icon: FiCode,
		showSearchProblems: true,
	},
	thread_not_found: {
		code: "Thread Error",
		title: "Thread Not Found",
		message: "The requested discussion thread or post could not be found or has been deleted.",
		icon: FiMessageSquare,
	},
	submission_not_found: {
		code: "Submission Error",
		title: "Submission Not Found",
		message: "The requested code submission record could not be found in our database.",
		icon: FiTerminal,
	},
	access_denied: {
		code: "Access Denied",
		title: "Access Restricted",
		message: "Access is restricted. You do not possess the required administrator or role clearance.",
		icon: FiSlash,
	},
	expired_invitation: {
		code: "Expired Link",
		title: "Invitation Expired",
		message: "This invitation link is expired, invalid, or has already been consumed.",
		icon: FiCalendar,
	},
	contest_ended: {
		code: "Contest Closed",
		title: "Contest Has Ended",
		message: "This contest has already ended. Submissions and registrations are now closed.",
		icon: FiZapOff,
	},
	contest_not_started: {
		code: "Contest Scheduled",
		title: "Contest Has Not Started",
		message: "This contest has not started yet. Registrants will be able to access problems when the timer begins.",
		icon: FiClock,
		showRetry: true,
	},
};

interface ErrorDisplayProps {
	type?: ErrorType;
	customTitle?: string;
	customMessage?: string;
	retryAction?: () => void | Promise<void>;
	children?: React.ReactNode;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
	type = "404",
	customTitle,
	customMessage,
	retryAction,
	children,
}) => {
	const router = useRouter();
	const config = ERROR_CONFIGS[type] || ERROR_CONFIGS["404"];

	const title = customTitle || config.title;
	const message = customMessage || config.message;
	const IconComponent = config.icon;

	const handleBack = () => {
		if (window.history.length > 1) {
			router.back();
		} else {
			router.push("/");
		}
	};

	const handleRetry = async () => {
		if (retryAction) {
			await retryAction();
		} else {
			window.location.reload();
		}
	};

	return (
		<div className="min-h-screen flex flex-col justify-center items-center bg-bg-base px-4 select-none relative font-sans">
			<div className="max-w-md w-full bg-bg-surface border border-border-subtle p-8 rounded-lg shadow-sm text-center flex flex-col items-center gap-5 z-10">
				{/* Themed icon */}
				<div className="h-12 w-12 rounded-md bg-emerald-500/10 flex justify-center items-center text-emerald-450 border border-emerald-500/20">
					<IconComponent size={22} />
				</div>

				<div className="space-y-1.5">
					<span className="text-[10px] font-mono font-bold tracking-widest text-emerald-450 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
						{config.code}
					</span>
					<h1 className="text-xl font-bold text-text-primary tracking-tight mt-2">
						{title}
					</h1>
					<p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
						{message}
					</p>
				</div>

				{children}

				<div className="flex flex-col gap-2.5 w-full mt-2">
					{/* Primary Navigation Actions */}
					<div className="flex flex-col sm:flex-row gap-2.5 w-full">
						<button
							onClick={handleBack}
							className="flex items-center justify-center gap-2 flex-1 py-2 px-3.5 bg-bg-dark-fill-3 hover:bg-bg-hover text-text-secondary hover:text-text-primary text-xs font-semibold rounded-md border border-border-subtle transition duration-150"
						>
							<FiArrowLeft size={14} />
							<span>Go Back</span>
						</button>
						<Link
							href="/"
							className="flex items-center justify-center gap-2 flex-1 py-2 px-3.5 bg-emerald-500 hover:bg-emerald-450 text-black text-xs font-semibold rounded-md transition duration-150 shadow-sm"
						>
							<FiHome size={14} />
							<span>Go Home</span>
						</Link>
					</div>

					{/* Secondary Context Actions */}
					{(config.showRetry || retryAction) && (
						<button
							onClick={handleRetry}
							className="flex items-center justify-center gap-2 w-full py-2 px-3.5 bg-bg-dark-fill-3 hover:bg-bg-hover text-text-secondary hover:text-text-primary text-xs font-semibold rounded-md border border-border-subtle transition duration-150"
						>
							<FiRefreshCw size={13} className="animate-spin" style={{ animationDuration: "3s" }} />
							<span>Retry Action</span>
						</button>
					)}

					{config.showSearchProblems && (
						<Link
							href="/"
							className="flex items-center justify-center gap-2 w-full py-2 px-3.5 bg-bg-dark-fill-3 hover:bg-bg-hover text-text-secondary hover:text-text-primary text-xs font-semibold rounded-md border border-border-subtle transition duration-150"
						>
							<FiSearch size={13} />
							<span>Browse Problems</span>
						</Link>
					)}

					<a
						href="mailto:support@beastcode.codes?subject=BeastCode%20Platform%20Issue"
						className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-semibold text-text-muted hover:text-text-secondary transition duration-150"
					>
						<FiMail size={11} />
						<span>Contact Support</span>
					</a>
				</div>
			</div>
		</div>
	);
};

export default ErrorDisplay;
