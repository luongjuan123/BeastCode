import React from "react";
import { TypingState } from "@/types/chat";

interface TypingIndicatorProps {
	typingUsers: TypingState[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
	if (typingUsers.length === 0) return null;

	const names = typingUsers.map((u) => u.displayName);
	const text =
		names.length === 1
			? `${names[0]} is typing...`
			: names.length === 2
			? `${names[0]} and ${names[1]} are typing...`
			: `${names[0]} and ${names.length - 1} others are typing...`;

	return (
		<div className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted select-none animate-fade-in">
			<div className="flex items-center gap-1">
				<span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce"></span>
				<span
					className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce"
					style={{ animationDelay: "150ms" }}
				></span>
				<span
					className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-bounce"
					style={{ animationDelay: "300ms" }}
				></span>
			</div>
			<span className="font-medium text-[11px]">{text}</span>
		</div>
	);
};
