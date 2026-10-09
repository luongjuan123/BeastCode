import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

interface EmojiPickerProps {
	onSelect: (emoji: string) => void;
	onClose: () => void;
}

const EMOJI_GROUPS = [
	{
		title: "Popular",
		emojis: ["💻", "🔥", "🚀", "💡", "😂", "👍", "🤔", "🎉", "🤯", "🙌", "✅", "❌"]
	},
	{
		title: "Tech & Coding",
		emojis: ["💻", "⌨️", "🖥️", "🖱️", "⚙️", "🔧", "🛠️", "🐛", "👾", "🤖", "📈", "📊", "🔒", "🔑"]
	},
	{
		title: "Smileys & People",
		emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😶‍🌫️", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"]
	},
	{
		title: "Symbols & Gestures",
		emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸"]
	}
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	// Auto-clamp horizontal position within parent modal/dialog to avoid clipping
	useEffect(() => {
		const adjustPosition = () => {
			if (!containerRef.current) return;
			const el = containerRef.current;
			el.style.left = "";
			el.style.right = "";

			const parentModal = el.closest(".overflow-y-auto") || el.closest("[role='dialog']") || document.body;
			const modalRect = parentModal.getBoundingClientRect();
			const elRect = el.getBoundingClientRect();

			if (elRect.right > modalRect.right - 12) {
				const overflow = elRect.right - (modalRect.right - 12);
				el.style.left = `-${overflow}px`;
			}
			const updatedRect = el.getBoundingClientRect();
			if (updatedRect.left < modalRect.left + 12) {
				const underflow = (modalRect.left + 12) - updatedRect.left;
				const currentLeft = parseFloat(el.style.left || "0");
				el.style.left = `${currentLeft + underflow}px`;
			}
		};

		adjustPosition();
		window.addEventListener("resize", adjustPosition);
		return () => window.removeEventListener("resize", adjustPosition);
	}, [searchQuery]);

	// Filtered Emojis
	const filteredGroups = EMOJI_GROUPS.map((group) => {
		if (!searchQuery.trim()) return group;
		const matching = group.emojis.filter((emoji) => {
			// Emoji search mapping could be basic since they are native, or just allow matching everything if we search
			return true; // Search query filters are handled by checking if query matches group words
		});
		return { ...group, emojis: matching };
	});

	return (
		<div
			ref={containerRef}
			className="absolute z-50 rounded-lg shadow-2xl p-3 w-64 max-w-[calc(100vw-3rem)] left-0 mt-2 border border-border-default animate-fade-in"
			style={{ background: "var(--bg-elevated)" }}
		>
			<div className="flex justify-between items-center mb-2 select-none">
				<span className="text-[10px] font-black tracking-widest text-[var(--text-primary)] uppercase">
					Insert Emoji
				</span>
				<button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
					<FaTimes size={11} />
				</button>
			</div>

			{/* Search */}
			<div className="relative flex items-center rounded-lg px-2.5 py-1 mb-2.5 bg-[var(--bg-dark-fill-3)] border border-[var(--border-subtle)]">
				<FaSearch className="text-[var(--text-muted)] mr-2 shrink-0" size={10} />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search emojis..."
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className="bg-transparent text-[11px] text-[var(--text-primary)] outline-none flex-1 placeholder:text-[var(--text-muted)] !border-0 !p-0 !ring-0 !shadow-none"
				/>
			</div>

			{/* Groups container */}
			<div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin pr-0.5">
				{EMOJI_GROUPS.map((group) => {
					// Basic keyword match for filter
					const matchesSearch = !searchQuery.trim() || 
						group.title.toLowerCase().includes(searchQuery.toLowerCase());
					
					if (!matchesSearch && searchQuery.trim()) return null;

					return (
						<div key={group.title} className="space-y-1">
							<span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider select-none">
								{group.title}
							</span>
							<div className="grid grid-cols-6 gap-1">
								{group.emojis.map((emoji, idx) => (
									<button
										key={idx}
										type="button"
										onClick={() => onSelect(emoji)}
										className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[var(--bg-hover)] rounded-lg transition-colors active:scale-95 duration-100"
									>
										{emoji}
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default EmojiPicker;
