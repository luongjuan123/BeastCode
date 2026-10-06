import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";

interface ReactionBarProps {
	reactions?: Record<string, string[]>;
	currentUserId?: string;
	onToggleReaction: (emoji: string) => void;
	canReact?: boolean;
}

const COMMON_EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "👏", "😂", "👀"];

export const ReactionBar: React.FC<ReactionBarProps> = ({
	reactions = {},
	currentUserId,
	onToggleReaction,
	canReact = true,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);

	const entries = Object.entries(reactions).filter(([_, uids]) => uids.length > 0);

	if (entries.length === 0 && !canReact) return null;

	return (
		<div className="relative flex flex-wrap items-center gap-1 mt-1">
			{/* Existing reaction badges */}
			{entries.map(([emoji, uids]) => {
				const hasReacted = currentUserId ? uids.includes(currentUserId) : false;
				return (
					<button
						key={emoji}
						type="button"
						onClick={() => onToggleReaction(emoji)}
						className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition select-none ${
							hasReacted
								? "bg-brand-orange/20 border border-brand-orange/50 text-brand-orange"
								: "bg-dark-fill-3 border border-border-subtle text-text-secondary hover:bg-dark-fill-2"
						}`}
						title={`${uids.length} reaction${uids.length === 1 ? "" : "s"}`}
					>
						<span>{emoji}</span>
						<span className="text-[11px] font-mono font-bold">{uids.length}</span>
					</button>
				);
			})}

			{/* Add Reaction Button */}
			{canReact && (
				<div className="relative">
					<button
						type="button"
						onClick={() => setPickerOpen(!pickerOpen)}
						className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-dark-fill-3 transition opacity-0 group-hover:opacity-100"
						title="Add reaction"
					>
						<FaPlus size={10} />
					</button>

					{pickerOpen && (
						<>
							<div
								className="fixed inset-0 z-30"
								onClick={() => setPickerOpen(false)}
							/>
							<div className="absolute left-0 bottom-full mb-1 z-40 flex items-center gap-1 p-1 rounded-full bg-dark-layer-1 border border-border-default shadow-xl backdrop-blur-md animate-scale-in">
								{COMMON_EMOJIS.map((emoji) => (
									<button
										key={emoji}
										type="button"
										onClick={() => {
											onToggleReaction(emoji);
											setPickerOpen(false);
										}}
										className="p-1.5 rounded-full hover:bg-dark-fill-3 hover:scale-125 transition select-none text-sm"
									>
										{emoji}
									</button>
								))}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};
