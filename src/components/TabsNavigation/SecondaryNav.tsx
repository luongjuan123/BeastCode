import React from "react";
import Link from "next/link";

export interface TabItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	disabled?: boolean;
	enabled?: boolean;
	href?: string;
}

interface SecondaryNavProps {
	tabs: TabItem[] | readonly TabItem[];
	activeTab: string;
	onChange?: (id: any) => void;
	className?: string;
}

export const SecondaryNav: React.FC<SecondaryNavProps> = ({
	tabs,
	activeTab,
	onChange,
	className = "",
}) => {
	return (
		<div className={`overflow-x-auto scrollbar-none shrink-0 ${className}`}>
			<div
				className="flex items-center gap-1 p-1 rounded-md border border-border-default bg-[var(--bg-surface)] w-max max-w-full"
			>
				{tabs.map((tab) => {
					const isActive = activeTab === tab.id;
					const isDisabled = tab.disabled || tab.enabled === false;
					if (isDisabled) {
						return (
							<div
								key={tab.id}
								className="px-3.5 py-1.5 rounded-md text-xs font-medium cursor-not-allowed select-none text-text-muted opacity-50"
								title="Feature coming soon"
							>
								{tab.label}
							</div>
						);
					}

					const commonClass = `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 select-none cursor-pointer border ${
						isActive
							? "bg-[var(--bg-elevated)] border-border-default text-accent font-semibold"
							: "border-transparent text-text-secondary hover:text-text-primary hover:bg-[var(--bg-elevated)]"
					}`;

					if (tab.href) {
						return (
							<Link
								key={tab.id}
								href={tab.href}
								onClick={() => onChange?.(tab.id)}
								className={commonClass}
							>
								{tab.icon && <span className="flex items-center justify-center shrink-0">{tab.icon}</span>}
								<span>{tab.label}</span>
							</Link>
						);
					}

					return (
						<button
							key={tab.id}
							onClick={() => onChange?.(tab.id)}
							className={commonClass}
						>
							{tab.icon && <span className="flex items-center justify-center shrink-0">{tab.icon}</span>}
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default SecondaryNav;
