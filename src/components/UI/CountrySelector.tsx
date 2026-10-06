import React, { useState, useEffect, useRef, useMemo } from "react";
import { FaChevronDown, FaSearch, FaGlobe } from "react-icons/fa";
import { COUNTRIES, Country } from "@/utils/countryData";

interface CountrySelectorProps {
	value: string; // ISO-3166 Alpha-2 Code (e.g. "US", "VN") or "" for global
	onChange: (code: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	showGlobal?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
	value,
	onChange,
	placeholder = "Select Country",
	disabled = false,
	className = "",
	showGlobal = false,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [focusedIndex, setFocusedIndex] = useState(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const selectedCountry = useMemo(() => {
		if (!value) return null;
		const upper = value.toUpperCase();
		return COUNTRIES.find((c) => c.code === upper) || null;
	}, [value]);

	const filteredCountries = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return COUNTRIES;
		return COUNTRIES.filter(
			(c) =>
				c.name.toLowerCase().includes(query) ||
				c.code.toLowerCase().includes(query)
		);
	}, [searchQuery]);

	// Unified options list including Global option if requested
	const options = useMemo(() => {
		const list = [...filteredCountries];
		if (showGlobal && (!searchQuery || "global".includes(searchQuery.toLowerCase()))) {
			list.unshift({ code: "", name: "Global (All Countries)" });
		}
		return list;
	}, [filteredCountries, showGlobal, searchQuery]);

	// Close when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Handle focus/search on open
	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			const currentIdx = value
				? options.findIndex((c) => c.code === value.toUpperCase())
				: (showGlobal ? 0 : -1);
			setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
			setTimeout(() => {
				searchInputRef.current?.focus();
			}, 50);
		} else {
			setFocusedIndex(-1);
		}
	}, [isOpen, value, options, showGlobal]);

	// Auto-scroll focused element into view
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

	const handleSelect = (code: string) => {
		onChange(code.toUpperCase());
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
					setFocusedIndex((prev) => (prev + 1) % options.length);
				}
				break;
			case "ArrowUp":
				e.preventDefault();
				if (!isOpen) {
					setIsOpen(true);
				} else {
					setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
				}
				break;
			case "Enter":
				e.preventDefault();
				if (isOpen) {
					if (options[focusedIndex]) {
						handleSelect(options[focusedIndex].code);
					}
				} else {
					setIsOpen(true);
				}
				break;
			case "Escape":
				e.preventDefault();
				setIsOpen(false);
				break;
			case "Tab":
				if (isOpen) {
					setIsOpen(false);
				}
				break;
			default:
				break;
		}
	};

	return (
		<div
			ref={containerRef}
			className={`relative w-full select-none font-sans text-sm ${className}`}
			onKeyDown={handleKeyDown}
		>
			{/* Selector Button */}
			<div
				tabIndex={disabled ? -1 : 0}
				onClick={handleToggle}
				className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors cursor-pointer ${
					disabled ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-500/50"
				} ${isOpen ? "border-emerald-500/60" : ""}`}
				style={{
					background: "var(--bg-elevated)",
					borderColor: isOpen ? "var(--border-accent)" : "var(--border-default)",
					color: selectedCountry ? "var(--text-primary)" : "var(--text-muted)",
				}}
			>
				<div className="flex-1 flex items-center gap-2 truncate pr-2">
					{selectedCountry ? (
						<>
							<img
								src={`https://flagcdn.com/16x12/${selectedCountry.code.toLowerCase()}.png`}
								width="16"
								height="12"
								alt={selectedCountry.name}
								className="rounded-sm object-cover shrink-0"
								onError={(e) => {
									e.currentTarget.style.display = "none";
								}}
							/>
							<span className="font-semibold text-sm text-text-primary" style={{ color: "var(--text-primary)" }}>
								{selectedCountry.name}
							</span>
							<span className="text-xs font-semibold text-text-muted ml-auto font-mono uppercase" style={{ color: "var(--text-muted)" }}>
								{selectedCountry.code}
							</span>
						</>
					) : (
						<div className="flex items-center gap-1.5 text-gray-500">
							<FaGlobe size={13} className="text-text-muted" style={{ color: "var(--text-muted)" }} />
							<span className="font-semibold" style={{ color: "var(--text-muted)" }}>{placeholder}</span>
						</div>
					)}
				</div>
				<div className="flex items-center text-gray-500">
					<FaChevronDown
						size={10}
						className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
					/>
				</div>
			</div>

			{/* Dropdown Options */}
			{isOpen && (
				<div
					className="absolute z-[100] w-full mt-2 rounded-md border shadow-xl overflow-hidden animate-scale-up"
					style={{
						background: "var(--bg-elevated)",
						borderColor: "var(--border-subtle)",
						boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
					}}
				>
					{/* Search Field */}
					<div
						className="flex items-center px-3 py-2 border-b"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						<FaSearch className="text-gray-500 mr-2" size={12} />
						<input
							ref={searchInputRef}
							type="text"
							placeholder="Search by country name or code..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setFocusedIndex(0);
							}}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
							className="w-full bg-transparent outline-none border-none text-xs p-1"
							style={{ color: "var(--text-primary)" }}
						/>
					</div>

					{/* Options List */}
					<div
						ref={listRef}
						className="overflow-y-auto scrollbar-thin py-1"
						style={{ maxHeight: "250px" }}
					>
						{options.length === 0 ? (
							<div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
								No results found
							</div>
						) : (
							options.map((c, index) => {
								const isSelected = (!value && !c.code) || (value && value.toUpperCase() === c.code);
								const isFocused = index === focusedIndex;

								return (
									<div
										key={c.code || "global"}
										onClick={() => handleSelect(c.code)}
										onMouseEnter={() => setFocusedIndex(index)}
										className="px-4 py-2 flex items-center gap-3.5 cursor-pointer transition-colors duration-150"
										style={{
											background: isSelected
												? "var(--brand-glow)"
												: isFocused
												? "var(--bg-dark-fill-3)"
												: "transparent",
											color: isSelected
												? "var(--brand-orange)"
												: isFocused
												? "var(--text-primary)"
												: "var(--text-secondary)",
										}}
									>
										{c.code ? (
											<img
												src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`}
												width="16"
												height="12"
												alt={c.name}
												className="rounded-sm object-cover shrink-0"
												onError={(e) => {
													e.currentTarget.style.display = "none";
												}}
											/>
										) : (
											<FaGlobe size={13} className="shrink-0" style={{ color: isSelected ? "var(--brand-orange)" : "var(--text-muted)" }} />
										)}
										<div className="font-semibold text-xs truncate">{c.name}</div>
										{c.code && (
											<div
												className="text-[10px] ml-auto font-mono uppercase opacity-80"
												style={{ color: isSelected ? "var(--brand-orange)" : "var(--text-muted)" }}
											>
												{c.code}
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

export default CountrySelector;
