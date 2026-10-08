import React, { useState, KeyboardEvent } from "react";
import { FaTimes } from "react-icons/fa";

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder = "add a tag" }) => {
	const [input, setInput] = useState("");

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const trimmed = input.trim().replace(/^,+|,+$/g, "");
			if (trimmed && !tags.includes(trimmed)) {
				if (tags.length >= 3) {
					return;
				}
				const newTags = [...tags, trimmed];
				onChange(newTags);
				setInput("");
			}
		} else if (e.key === "Backspace" && !input && tags.length > 0) {
			const newTags = tags.slice(0, -1);
			onChange(newTags);
		}
	};

	const removeTag = (indexToRemove: number) => {
		const newTags = tags.filter((_, index) => index !== indexToRemove);
		onChange(newTags);
	};

	return (
		<div 
			className="border rounded-md p-2 flex flex-wrap gap-2 items-center focus-within:border-emerald-500 transition shadow-sm min-h-[42px] w-full"
			style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
		>
			{tags.map((tag, index) => (
				<span
					key={index}
					className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold select-none border"
					style={{
						color: "var(--color-success)",
						background: "color-mix(in srgb, var(--color-success) 10%, transparent)",
						borderColor: "color-mix(in srgb, var(--color-success) 25%, transparent)"
					}}
				>
					{tag}
					<button
						type="button"
						onClick={() => removeTag(index)}
						className="p-0.5 rounded transition hover:bg-black/10"
						style={{ color: "var(--color-success)" }}
					>
						<FaTimes size={10} />
					</button>
				</span>
			))}
			{tags.length < 3 ? (
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					aria-label="Add tag"
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
					style={{ color: "var(--text-primary)" }}
				/>
			) : (
				<span className="text-xs italic select-none" style={{ color: "var(--text-muted)" }}>Tag limit reached (max 3)</span>
			)}
		</div>
	);
};

export default TagInput;
