import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export interface SidebarItem {
	label: string;
	href: string;
	icon?: React.ReactNode;
	badge?: string | number;
	exact?: boolean;
}

export interface SidebarSection {
	title?: string;
	items: SidebarItem[];
}

export interface SidebarProps {
	sections: SidebarSection[];
	collapsed?: boolean;
	onToggleCollapse?: () => void;
	className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
	sections,
	collapsed = false,
	onToggleCollapse,
	className = "",
}) => {
	const router = useRouter();

	const isItemActive = (item: SidebarItem) => {
		if (item.exact) {
			return router.pathname === item.href;
		}
		return router.pathname.startsWith(item.href);
	};

	return (
		<aside
			className={`shrink-0 border-r border-border-default bg-[#080909] select-none transition-all duration-200 ${
				collapsed ? "w-14" : "w-60"
			} ${className}`}
		>
			<div className="h-full flex flex-col py-4 px-2.5 overflow-y-auto">
				{sections.map((section, sIdx) => (
					<div key={sIdx} className="mb-5 last:mb-0">
						{section.title && !collapsed && (
							<h4 className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
								{section.title}
							</h4>
						)}
						<nav className="space-y-0.5">
							{section.items.map((item) => {
								const active = isItemActive(item);
								return (
									<Link
										key={item.href}
										href={item.href}
										prefetch={false}
										className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
											active
												? "bg-accent/10 text-accent font-semibold border border-accent/25"
												: "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-elevated)] border border-transparent"
										}`}
										title={collapsed ? item.label : undefined}
									>
										{item.icon && (
											<span className={`shrink-0 ${active ? "text-accent" : "text-text-muted"}`}>
												{item.icon}
											</span>
										)}
										{!collapsed && (
											<span className="flex-1 truncate">{item.label}</span>
										)}
										{!collapsed && item.badge !== undefined && (
											<span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--bg-elevated)] text-text-muted border border-border-subtle">
												{item.badge}
											</span>
										)}
									</Link>
								);
							})}
						</nav>
					</div>
				))}
			</div>
		</aside>
	);
};

export default Sidebar;
