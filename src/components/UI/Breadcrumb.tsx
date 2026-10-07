import React from "react";
import Link from "next/link";

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

export interface BreadcrumbProps {
	items: BreadcrumbItem[];
	className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = "" }) => {
	return (
		<nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs text-text-muted select-none ${className}`}>
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				return (
					<React.Fragment key={index}>
						{index > 0 && <span className="text-text-muted" aria-hidden="true">/</span>}
						{item.href && !isLast ? (
							<Link
								href={item.href}
								className="hover:text-text-primary transition-colors duration-150"
							>
								{item.label}
							</Link>
						) : (
							<span className={isLast ? "text-text-primary font-medium" : ""}>
								{item.label}
							</span>
						)}
					</React.Fragment>
				);
			})}
		</nav>
	);
};

export default Breadcrumb;
