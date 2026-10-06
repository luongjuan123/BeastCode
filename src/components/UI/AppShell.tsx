import React from "react";
import Topbar from "@/components/Topbar/Topbar";

export interface AppShellProps {
	children: React.ReactNode;
	sidebar?: React.ReactNode;
	maxWidth?: "normal" | "wide" | "full";
	noPadding?: boolean;
	problemPage?: boolean;
	className?: string;
	activeNav?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
	children,
	sidebar,
	maxWidth = "normal",
	noPadding = false,
	problemPage = false,
	className = "",
	activeNav,
}) => {
	const maxWidthCls = {
		normal: "max-w-[1180px] mx-auto",
		wide: "max-w-[1400px] mx-auto",
		full: "w-full",
	}[maxWidth];

	return (
		<div className="min-h-screen bg-[#080909] text-text-primary flex flex-col font-sans selection:bg-accent/20 selection:text-accent">
			<Topbar problemPage={problemPage} />
			<div className="flex-1 flex w-full overflow-x-hidden">
				{sidebar && (
					<div className="hidden lg:block shrink-0">
						{sidebar}
					</div>
				)}
				<main className={`flex-1 ${noPadding ? "" : "px-4 md:px-6 py-6 md:py-8"} ${maxWidthCls} ${className}`}>
					{children}
				</main>
			</div>
		</div>
	);
};

export default AppShell;
