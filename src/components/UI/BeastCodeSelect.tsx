import React, { useState, useEffect, useRef } from "react";
import { FaChevronDown, FaSearch, FaTimes, FaCheck } from "react-icons/fa";

export interface SelectOption {
	value: string;
	label: string;
	subLabel?: string;
}

interface BeastCodeSelectProps {
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchable?: boolean;
	clearable?: boolean;
	maxHeight?: string;
	className?: string;
	disabled?: boolean;
	size?: "sm" | "md" | "lg";
}

const BeastCodeSelect: React.FC<BeastCodeSelectProps> = ({
	options,
	value,
	onChange,
	placeholder = "Select an option...",
	searchable = false,
	clearable = false,
	maxHeight = "260px",
	className = "",
	disabled = false,
	size = "md",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [focusedIndex, setFocusedIndex] = useState(-1);
	
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const selectedOption = options.find((opt) => opt.value === value);

	const filteredOptions = options.filter((opt) => {
		const labelMatch = opt.label.toLowerCase().includes(searchQuery.toLowerCase());
		const subLabelMatch = opt.subLabel?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
		return labelMatch || subLabelMatch;
	});

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Reset search and focus index when dropdown toggles
	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			setFocusedIndex(value ? filteredOptions.findIndex((opt) => opt.value === value) : 0);
			if (searchable) {
				setTimeout(() => searchInputRef.current?.focus(), 50);
			}
		} else {
			setFocusedIndex(-1);
		}
	}, [isOpen, value, searchable]);

	// Auto-scroll focused item into view
	useEffect(() => {
		if (focusedIndex >= 0 && listRef.current) {
			const list = listRef.current;
			const item = list.children[focusedIndex] as HTMLElement;
			if (item) {
				const listHeight = list.clientHeight;
				const itemTop = item.offsetTop;
				const itemHeight = item.clientHeight;

				if (itemTop + itemHeight > list.scrollTop + listHeight) {
					list.scrollTop = itemTop + itemHeight - listHeight;
				} else if (itemTop < list.scrollTop) {
					list.scrollTop = itemTop;
				}
			}
		}
	}, [focusedIndex]);

	const handleToggle = () => {
		if (!disabled) setIsOpen(!isOpen);
	};

	const handleSelect = (val: string) => {
		onChange(val);
		setIsOpen(false);
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		setIsOpen(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (!isOpen) {
					setIsOpen(true);
				} else {
					setFocusedIndex((prev) => (prev + 1) % filteredOptions.length);
				}
				break;
			case "ArrowUp":
				e.preventDefault();
				if (!isOpen) {
					setIsOpen(true);
				} else {
					setFocusedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
				}
				break;
			case "Enter":
				e.preventDefault();
				if (isOpen) {
					if (filteredOptions[focusedIndex]) {
						handleSelect(filteredOptions[focusedIndex].value);
					}
				} else {
					setIsOpen(true);
				}
				break;
			case "Escape":
			case "Tab":
				if (isOpen) {
					e.preventDefault();
					setIsOpen(false);
				}
				break;
			default:
				break;
		}
	};

	// Size-specific styles
	const triggerPadding = {
		sm: "h-7 px-2.5 text-xs rounded-md",
		md: "h-8 px-3 text-xs rounded-md",
		lg: "h-9 px-3.5 text-sm rounded-md",
	}[size];

	const optionPadding = {
		sm: "px-2.5 py-1.5 text-xs",
		md: "px-3 py-1.5 text-xs",
		lg: "px-3.5 py-2 text-sm",
	}[size];

	return (
		<div
			ref={containerRef}
			className={`relative w-full select-none font-sans ${className}`}
			onKeyDown={handleKeyDown}
		>
			{/* Trigger Button */}
			<div
				tabIndex={disabled ? -1 : 0}
				onClick={handleToggle}
				className={`w-full flex items-center justify-between border bg-[var(--bg-surface)] transition-colors duration-150 cursor-pointer ${triggerPadding} ${
					disabled
						? "opacity-50 cursor-not-allowed border-border-default text-text-muted"
						: isOpen
						? "border-accent text-text-primary"
						: "border-border-default hover:border-border-strong text-text-primary"
				}`}
			>
				<div className="flex-1 truncate pr-2">
					{selectedOption ? (
						<div className="flex items-center justify-between">
							<span className="font-medium text-text-primary">{selectedOption.label}</span>
							{selectedOption.subLabel && (
								<span className="text-[10px] ml-2 text-text-muted">{selectedOption.subLabel}</span>
							)}
						</div>
					) : (
						<span className="text-text-muted">{placeholder}</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 text-text-muted">
					{clearable && selectedOption && !disabled && (
						<button
							onClick={handleClear}
							type="button"
							className="p-0.5 hover:text-red-400 rounded transition duration-150"
						>
							<FaTimes size={9} />
						</button>
					)}
					<FaChevronDown
						size={9}
						className={`transition-transform duration-150 ${isOpen ? "rotate-180 text-accent" : ""}`}
					/>
				</div>
			</div>

			{/* Dropdown Panel */}
			{isOpen && (
				<div
					className="absolute z-[100] w-full mt-1 rounded-md border border-border-default bg-[var(--bg-elevated)] shadow-lg overflow-hidden"
				>
					{/* Search input if searchable */}
					{searchable && (
						<div className="flex items-center px-2.5 py-1.5 border-b border-border-default bg-[var(--bg-surface)]">
							<FaSearch className="text-text-muted mr-2" size={11} />
							<input
								ref={searchInputRef}
								type="text"
								aria-label="Filter options"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setFocusedIndex(0);
								}}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className="w-full bg-transparent outline-none border-none text-xs p-0 text-text-primary placeholder:text-text-muted"
							/>
						</div>
					)}

					{/* Options List */}
					<div
						ref={listRef}
						className="overflow-y-auto py-1 divide-y divide-transparent"
						style={{ maxHeight }}
					>
						{filteredOptions.length === 0 ? (
							<div className="px-3 py-2 text-xs text-center text-text-muted">
								No matches found
							</div>
						) : (
							filteredOptions.map((opt, index) => {
								const isSelected = opt.value === value;
								const isFocused = index === focusedIndex;

								return (
									<div
										key={opt.value}
										onClick={() => handleSelect(opt.value)}
										onMouseEnter={() => setFocusedIndex(index)}
										className={`flex items-center justify-between cursor-pointer transition-colors duration-100 ${optionPadding} ${
											isSelected
												? "bg-accent/10 text-accent font-medium"
												: isFocused
												? "bg-[var(--bg-hover)] text-text-primary"
												: "text-text-secondary hover:text-text-primary"
										}`}
									>
										<div className="flex items-center gap-2">
											<span className="w-3 flex items-center justify-center shrink-0">
												{isSelected && <FaCheck className="text-accent text-[10px]" />}
											</span>
											<span>{opt.label}</span>
										</div>
										{opt.subLabel && (
											<div className="text-[10px] ml-2 text-text-muted">
												{opt.subLabel}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default BeastCodeSelect;
