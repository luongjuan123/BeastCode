import React, { useState, useEffect } from "react";
import {
	resolveOrganizationAvatar,
	getOrganizationInitials,
	getOrganizationDeterministicColor,
} from "@/utils/organizationAvatar";

export interface OrganizationAvatarProps {
	organization?: {
		id?: string;
		name?: string;
		displayName?: string;
		avatar?: string | null;
		avatarUrl?: string | null;
		orgLogo?: string | null;
		organizationLogo?: string | null;
		type?: string;
	} | null;
	src?: string | null;
	name?: string | null;
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	shape?: "rounded" | "circle" | "square";
	className?: string;
	alt?: string;
	showGlow?: boolean;
	objectFit?: "cover" | "contain";
}

const SIZE_CLASSES: Record<string, { container: string; text: string; icon: number }> = {
	xs: { container: "w-6 h-6", text: "text-[10px] font-extrabold", icon: 12 },
	sm: { container: "w-8 h-8", text: "text-xs font-extrabold", icon: 14 },
	md: { container: "w-11 h-11", text: "text-sm font-black", icon: 18 },
	lg: { container: "w-16 h-16", text: "text-lg font-black", icon: 26 },
	xl: { container: "w-24 h-24", text: "text-2xl font-black", icon: 36 },
	"2xl": { container: "w-28 h-28 md:w-36 md:h-36", text: "text-3xl md:text-4xl font-black", icon: 44 },
};

const SHAPE_CLASSES: Record<string, string> = {
	rounded: "rounded-md",
	circle: "rounded-full",
	square: "rounded-none",
};

export const OrganizationAvatar: React.FC<OrganizationAvatarProps> = ({
	organization,
	src,
	name,
	size = "md",
	shape = "rounded",
	className = "",
	alt,
	showGlow = false,
	objectFit = "cover",
}) => {
	const resolvedUrl = resolveOrganizationAvatar(src || organization);
	const displayName = name || organization?.displayName || organization?.name || "Workspace";
	const orgIdentifier = organization?.id || organization?.name || displayName;
	const altText = alt || `${displayName} logo`;

	const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">(
		resolvedUrl ? "loading" : "error"
	);

	// Reset status when the URL changes
	useEffect(() => {
		if (resolvedUrl) {
			setImgStatus("loading");
		} else {
			setImgStatus("error");
		}
	}, [resolvedUrl]);

	const sizeConfig = typeof size === "string" ? SIZE_CLASSES[size] || SIZE_CLASSES.md : null;
	const shapeClass = SHAPE_CLASSES[shape] || SHAPE_CLASSES.rounded;
	const palette = getOrganizationDeterministicColor(orgIdentifier);
	const initials = getOrganizationInitials(displayName);

	const customStyle: React.CSSProperties = typeof size === "number"
		? { width: size, height: size, minWidth: size, minHeight: size }
		: {};

	if (showGlow) {
		customStyle.boxShadow = `0 10px 25px -5px ${palette.glow}`;
	}

	const containerClass = `
		relative overflow-hidden shrink-0 flex items-center justify-center select-none
		${sizeConfig ? sizeConfig.container : ""}
		${shapeClass}
		${className}
	`.trim();

	// Render Image if available and not failed
	if (resolvedUrl && imgStatus !== "error") {
		return (
			<div
				className={`${containerClass} bg-dark-layer-1 border border-border-default/60 shadow-md`}
				style={customStyle}
			>
				{/* Loading skeleton placeholder */}
				{imgStatus === "loading" && (
					<div className="absolute inset-0 bg-dark-fill-3 animate-pulse flex items-center justify-center">
						<span className={`${sizeConfig?.text || "text-sm"} opacity-40 font-bold ${palette.text}`}>
							{initials}
						</span>
					</div>
				)}

				<img
					src={resolvedUrl}
					alt={altText}
					className={`w-full h-full ${objectFit === "contain" ? "object-contain p-1" : "object-cover"} transition-opacity duration-200 ${
						imgStatus === "loaded" ? "opacity-100" : "opacity-0"
					}`}
					onLoad={() => setImgStatus("loaded")}
					onError={() => setImgStatus("error")}
					loading="lazy"
				/>
			</div>
		);
	}

	// Graceful deterministic initials fallback (Never shows browser broken image icon)
	return (
		<div
			className={`
				${containerClass}
				${palette.bg}
				border ${palette.border}
				shadow-md
			`}
			style={{
				...customStyle,
				backgroundColor: palette.solidBg,
			}}
			role="img"
			aria-label={altText}
		>
			<span
				className={`
					${sizeConfig?.text || "text-base font-black"}
					${palette.text}
					tracking-tight uppercase select-none
				`}
				style={{ color: palette.solidText }}
			>
				{initials}
			</span>
		</div>
	);
};

export default OrganizationAvatar;
