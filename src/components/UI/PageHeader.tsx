import React from "react";
import Breadcrumb, { BreadcrumbItem } from "./Breadcrumb";

export interface PageHeaderProps {
	title: string;
	description?: React.ReactNode;
	breadcrumbs?: BreadcrumbItem[];
	badge?: React.ReactNode;
	actions?: React.ReactNode;
	metrics?: Array<{ label: string; value: string | number }>;
	children?: React.ReactNode;
	className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
	title,
	description,
	breadcrumbs,
	badge,
	actions,
	metrics,
	children,
	className = "",
}) => {
	return (
		<div className={`pb-6 mb-6 border-b border-border-default ${className}`}>
			{breadcrumbs && breadcrumbs.length > 0 && (
				<div className="mb-3">
					<Breadcrumb items={breadcrumbs} />
				</div>
			)}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<h1 className="text-xl md:text-2xl font-semibold tracking-tight text-text-primary">
							{title}
						</h1>
						{badge}
					</div>
					{description && (
						<p className="text-xs md:text-sm text-text-secondary max-w-2xl font-normal leading-relaxed">
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className="flex items-center gap-2.5 shrink-0">
						{actions}
					</div>
				)}
			</div>
			{metrics && metrics.length > 0 && (
				<div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border-subtle/50">
					{metrics.map((m, idx) => (
						<div key={idx} className="flex items-center gap-2 text-xs font-mono">
							<span className="text-text-muted">{m.label}:</span>
							<span className="text-text-primary font-medium">{m.value}</span>
							{idx < metrics.length - 1 && <span className="text-border-default ml-2">•</span>}
						</div>
					))}
				</div>
			)}
			{children && (
				<div className="mt-5">
					{children}
				</div>
			)}
		</div>
	);
};

export default PageHeader;
