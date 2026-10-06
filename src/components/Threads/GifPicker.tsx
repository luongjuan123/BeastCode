import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaSearch, FaTimes, FaSpinner, FaHeart, FaRegHeart, FaFire, FaFolder, FaHistory } from "react-icons/fa";

interface GifPickerProps {
	onSelect: (url: string) => void;
	onClose: () => void;
}

const CATEGORIES = [
	{ id: "coding", label: "Coding", query: "coding developer" },
	{ id: "typing", label: "Typing", query: "typing keyboard" },
	{ id: "debugging", label: "Debugging", query: "debugging computer" },
	{ id: "mindblown", label: "Mindblown", query: "mind blown" },
	{ id: "congrats", label: "Congrats", query: "congrats celebration" },
	{ id: "funny", label: "Funny", query: "funny meme" },
	{ id: "sad", label: "Sad", query: "sad crying" },
	{ id: "fire", label: "Fire", query: "fire coding" },
];

const GIPHY_API_KEY = "dc6zaTOxFJmzC"; // Public beta API key

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
	const [activeTab, setActiveTab] = useState<"trending" | "categories" | "favorites" | "recent">("trending");
	const [searchQuery, setSearchQuery] = useState("");
	const [gifs, setGifs] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [favorites, setFavorites] = useState<string[]>([]);
	const [recents, setRecents] = useState<string[]>([]);
	const [focusedIdx, setFocusedIdx] = useState<number>(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	// Load favorites & recents from localStorage on mount
	useEffect(() => {
		try {
			const favs = localStorage.getItem("beastcode_favorite_gifs");
			if (favs) setFavorites(JSON.parse(favs));

			const recs = localStorage.getItem("beastcode_recent_gifs");
			if (recs) setRecents(JSON.parse(recs));
		} catch (e) {
			console.error("Error reading localStorage:", e);
		}
	}, []);

	// Handle saving favorites
	const toggleFavorite = (url: string, e: React.MouseEvent) => {
		e.stopPropagation();
		let updated: string[];
		if (favorites.includes(url)) {
			updated = favorites.filter((fav) => fav !== url);
		} else {
			updated = [url, ...favorites].slice(0, 50); // limit to 50
		}
		setFavorites(updated);
		localStorage.setItem("beastcode_favorite_gifs", JSON.stringify(updated));
	};

	// Save recent GIF selection
	const saveRecent = (url: string) => {
		const updated = [url, ...recents.filter((r) => r !== url)].slice(0, 30);
		setRecents(updated);
		localStorage.setItem("beastcode_recent_gifs", JSON.stringify(updated));
	};

	// Fetch GIF search or trending
	const fetchGifs = useCallback(async (queryStr: string = "") => {
		setLoading(true);
		try {
			const isSearch = queryStr.trim().length > 0;
			const endpoint = isSearch ? "search" : "trending";
			const params = isSearch
				? `&q=${encodeURIComponent(queryStr.trim())}&limit=24&rating=g`
				: `&limit=24&rating=g`;

			const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?api_key=${GIPHY_API_KEY}${params}`);
			const json = await res.json();
			if (json.data && json.data.length > 0) {
				const urls = json.data.map((item: any) => item.images.fixed_height.url);
				setGifs(urls);
			} else {
				setGifs([]);
			}
		} catch (e) {
			console.error("Giphy API error:", e);
			setGifs([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Trigger fetch based on search query or tab change
	useEffect(() => {
		if (searchQuery.trim() !== "") {
			const delayDebounce = setTimeout(() => {
				fetchGifs(searchQuery);
			}, 400);
			return () => clearTimeout(delayDebounce);
		} else {
			if (activeTab === "trending") {
				fetchGifs();
			} else if (activeTab === "favorites") {
				setGifs(favorites);
			} else if (activeTab === "recent") {
				setGifs(recents);
			}
		}
	}, [searchQuery, activeTab, fetchGifs, favorites, recents]);

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

	// Keyboard accessibility navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowRight") {
				setFocusedIdx((prev) => (prev < gifs.length - 1 ? prev + 1 : prev));
			} else if (e.key === "ArrowLeft") {
				setFocusedIdx((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (e.key === "ArrowDown") {
				setFocusedIdx((prev) => (prev + 2 < gifs.length ? prev + 2 : prev));
			} else if (e.key === "ArrowUp") {
				setFocusedIdx((prev) => (prev - 2 >= 0 ? prev - 2 : prev));
			} else if (e.key === "Enter" && focusedIdx >= 0) {
				const selected = gifs[focusedIdx];
				if (selected) {
					saveRecent(selected);
					onSelect(selected);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [gifs, focusedIdx, onSelect, onClose, recents]);

	// Set focus style on keyboard selection
	useEffect(() => {
		if (focusedIdx >= 0 && gridRef.current) {
			const activeEl = gridRef.current.children[focusedIdx] as HTMLElement;
			if (activeEl) {
				activeEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [focusedIdx]);

	return (
		<div
			ref={containerRef}
			className="absolute z-50 rounded-lg shadow-2xl p-4 w-80 max-w-sm right-0 mt-2 animate-fade-in border border-border-default"
			style={{ background: "var(--bg-elevated)" }}
		>
			{/* Header */}
			<div className="flex justify-between items-center mb-3 select-none">
				<span className="text-xs font-black tracking-widest text-[var(--text-primary)] uppercase">
					GIF Library
				</span>
				<button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition p-1 rounded hover:bg-[var(--bg-hover)]">
					<FaTimes size={13} />
				</button>
			</div>

			{/* Search */}
			<div className="relative flex items-center rounded-md px-3 py-2 mb-3 transition" style={{ background: "var(--bg-dark-fill-3)", border: "1px solid var(--border-default)" }}>
				<FaSearch className="text-[var(--text-muted)] mr-2 shrink-0" size={12} />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value);
						if (focusedIdx !== -1) setFocusedIdx(-1);
					}}
					placeholder="Search GIFs..."
					className="bg-transparent text-xs text-[var(--text-primary)] outline-none flex-1 placeholder:text-[var(--text-muted)] !border-0 !p-0 !ring-0 !shadow-none"
				/>
				{searchQuery && (
					<button
						onClick={() => setSearchQuery("")}
						className="text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-1"
					>
						<FaTimes size={10} />
					</button>
				)}
				{loading && <FaSpinner className="animate-spin text-[var(--brand-orange)] shrink-0" size={12} />}
			</div>

			{/* Tabs */}
			{searchQuery.trim() === "" && (
				<div
					className="flex items-center justify-between gap-1 p-1 rounded-md border transition-all duration-300 w-full mb-3"
					style={{
						backgroundColor: "var(--bg-dark-layer-1)",
						borderColor: "var(--border-subtle)",
					}}
				>
					{[
						{ id: "trending", label: "Trending", icon: <FaFire size={10} /> },
						{ id: "categories", label: "Categories", icon: <FaFolder size={10} /> },
						{ id: "favorites", label: "Favorites", icon: <FaHeart size={10} /> },
						{ id: "recent", label: "Recents", icon: <FaHistory size={10} /> },
					].map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => { setActiveTab(tab.id as any); setFocusedIdx(-1); }}
								className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-bold transition-all duration-300 border select-none cursor-pointer ${
									isActive
										? "border-border-accent glow-sm font-extrabold"
										: "border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-fill-3"
								}`}
								style={{
									backgroundColor: isActive ? "var(--bg-surface)" : "transparent",
									color: isActive ? "var(--brand-orange)" : "var(--text-secondary)",
								}}
							>
								{tab.icon} {tab.label}
							</button>
						);
					})}
				</div>
			)}

			{/* Categories list */}
			{activeTab === "categories" && searchQuery.trim() === "" ? (
				<div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto scrollbar-thin pr-1 select-none">
					{CATEGORIES.map((cat) => (
						<button
							key={cat.id}
							onClick={() => {
								setSearchQuery(cat.query);
								fetchGifs(cat.query);
							}}
							className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs text-left font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-orange)]/40 shadow-sm"
						>
							{cat.label}
						</button>
					))}
				</div>
			) : (
				/* Grid of GIFs */
				<div
					ref={gridRef}
					className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto scrollbar-thin pr-1"
				>
					{gifs.map((url, idx) => {
						const isFav = favorites.includes(url);
						const isFocused = idx === focusedIdx;

						return (
							<div
								key={idx}
								onClick={() => {
									saveRecent(url);
									onSelect(url);
								}}
								onMouseEnter={() => setFocusedIdx(idx)}
								className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-[var(--bg-dark-fill-3)] border transition-all duration-200 group ${
									isFocused ? "border-[var(--brand-orange)] scale-[1.02] shadow-md shadow-[var(--brand-glow)]" : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
								}`}
							>
								<img
									src={url}
									alt="GIF"
									className="w-full h-full object-cover rounded-xl"
									loading="lazy"
								/>

								{/* Hover actions */}
								<div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition duration-150 z-10">
									<button
										onClick={(e) => toggleFavorite(url, e)}
										className="p-1.5 rounded-lg backdrop-blur-md bg-black/45 text-white hover:scale-110 transition shadow-md"
										title={isFav ? "Remove from Favorites" : "Add to Favorites"}
									>
										{isFav ? <FaHeart className="text-red-500" size={11} /> : <FaRegHeart size={11} />}
									</button>
								</div>
							</div>
						);
					})}

					{!loading && gifs.length === 0 && (
						<div className="col-span-2 text-center text-xs text-[var(--text-muted)] py-10 italic">
							{activeTab === "favorites"
								? "No favorite GIFs saved yet. Click the heart on any GIF to save it!"
								: activeTab === "recent"
								? "No recently used GIFs found."
								: "No GIFs found matching search query."}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default GifPicker;
