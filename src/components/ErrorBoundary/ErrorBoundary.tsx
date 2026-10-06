import React, { Component, ErrorInfo, ReactNode } from "react";
import ErrorDisplay from "@/components/UI/ErrorDisplay";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
	isOffline: boolean;
	retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
		errorInfo: null,
		isOffline: false,
		retryCount: 0,
	};

	private handleOnline = () => {
		this.setState({ isOffline: false });
	};

	private handleOffline = () => {
		this.setState({ isOffline: true });
	};

	public componentDidMount() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", this.handleOnline);
			window.addEventListener("offline", this.handleOffline);
			this.setState({ isOffline: !navigator.onLine });
		}
	}

	public componentWillUnmount() {
		if (typeof window !== "undefined") {
			window.removeEventListener("online", this.handleOnline);
			window.removeEventListener("offline", this.handleOffline);
		}
	}

	public static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ errorInfo });
		// Log detailed errors internally/for telemetry
		if (process.env.NODE_ENV !== "production") {
			// Save in standard dev logs
			console.error("ErrorBoundary caught an error:", error, errorInfo);
		} else {
			// In production, save in a developer debug queue in window
			if (typeof window !== "undefined") {
				(window as any).__developer_errors = (window as any).__developer_errors || [];
				(window as any).__developer_errors.push({ error, errorInfo, timestamp: Date.now() });
			}
		}
	}

	private handleRetry = () => {
		this.setState((prev) => ({
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: prev.retryCount + 1,
		}));
	};

	public render() {
		if (this.state.isOffline) {
			return (
				<ErrorDisplay
					type="503"
					customTitle="Network connection lost"
					customMessage="Please check your internet connection. Once back online, page content will restore automatically."
					retryAction={() => window.location.reload()}
				/>
			);
		}

		if (this.state.hasError) {
			const isDev = process.env.NODE_ENV !== "production";
			return (
				<ErrorDisplay type="500" retryAction={this.handleRetry}>
					{isDev && this.state.error && (
						<div className="w-full text-left bg-black/40 border border-default p-4 rounded-lg font-mono text-[11px] text-red-400 overflow-x-auto max-h-40 max-w-full select-text">
							<p className="font-bold mb-1">Developer Error Details:</p>
							<p className="mb-2">{this.state.error.toString()}</p>
							{this.state.errorInfo?.componentStack && (
								<pre className="whitespace-pre">{this.state.errorInfo.componentStack}</pre>
							)}
						</div>
					)}
				</ErrorDisplay>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
