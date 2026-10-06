import React from "react";

export interface SeparatorProps {
	orientation?: "horizontal" | "vertical";
	className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
	orientation = "horizontal",
	className = "",
}) => {
	if (orientation === "vertical") {
		return <div className={`w-px h-full bg-border-default self-stretch ${className}`} />;
	}
	return <hr className={`w-full border-0 h-px bg-border-default my-4 ${className}`} />;
};

export default Separator;
