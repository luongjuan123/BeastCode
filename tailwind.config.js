/** @type {import('tailwindcss').Config} */

function withOpacity(variableRgbName, fallbackRgb) {
	return ({ opacityValue }) => {
		if (opacityValue !== undefined) {
			return `rgba(var(${variableRgbName}, ${fallbackRgb}), ${opacityValue})`;
		}
		return `rgb(var(${variableRgbName}, ${fallbackRgb}))`;
	};
}

module.exports = {
	darkMode: "class",
	content: [
		"./app/**/*.{js,ts,jsx,tsx}",
		"./pages/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
				mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
			},
			colors: {
				/* Dark Technical Platform Surfaces */
				background: "#080909",
				"dark-layer-1": withOpacity("--bg-surface-rgb", "15, 18, 16"),
				"dark-layer-2": withOpacity("--bg-base-rgb", "8, 9, 9"),
				"dark-surface": withOpacity("--bg-surface-rgb", "15, 18, 16"),
				"dark-elevated": withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				"dark-hover": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				"bg-surface": withOpacity("--bg-surface-rgb", "15, 18, 16"),
				"bg-dark-layer-1": withOpacity("--bg-surface-rgb", "15, 18, 16"),
				"bg-dark-layer-2": withOpacity("--bg-base-rgb", "8, 9, 9"),
				"bg-base": withOpacity("--bg-base-rgb", "8, 9, 9"),
				"bg-page": withOpacity("--bg-base-rgb", "8, 9, 9"),
				surface: withOpacity("--bg-surface-rgb", "15, 18, 16"),
				"surface-elevated": withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				"bg-surface-elevated": withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				"bg-elevated": withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				elevated: withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				"surface-hover": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				"bg-surface-hover": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				"bg-hover": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				hover: withOpacity("--bg-hover-rgb", "28, 33, 30"),

				/* Text Hierarchy */
				"text-primary": withOpacity("--text-primary-rgb", "241, 243, 239"),
				"text-secondary": withOpacity("--text-secondary-rgb", "166, 172, 165"),
				"text-muted": withOpacity("--text-muted-rgb", "111, 118, 111"),
				"text-accent": withOpacity("--accent-rgb", "34, 197, 94"),
				"dark-gray-6": "#6f766f",
				"dark-gray-7": withOpacity("--text-secondary-rgb", "166, 172, 165"),
				"dark-gray-8": withOpacity("--text-primary-rgb", "241, 243, 239"),
				"dark-label-2": "rgba(241, 243, 239, 0.75)",
				"gray-8": "#151816",

				/* Technical Borders */
				"border-subtle": withOpacity("--border-subtle-rgb", "26, 30, 27"),
				"border-default": withOpacity("--border-default-rgb", "36, 40, 36"),
				"border-strong": withOpacity("--border-strong-rgb", "50, 56, 51"),
				"border-accent": withOpacity("--accent-rgb", "34, 197, 94"),
				"border-hover": withOpacity("--border-strong-rgb", "50, 56, 51"),
				"dark-divider-border-2": withOpacity("--border-default-rgb", "36, 40, 36"),

				/* Fills */
				"dark-fill-2": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				"dark-fill-3": withOpacity("--bg-elevated-rgb", "21, 24, 22"),
				"bg-dark-fill-2": withOpacity("--bg-hover-rgb", "28, 33, 30"),
				"bg-dark-fill-3": withOpacity("--bg-elevated-rgb", "21, 24, 22"),

				/* Restrained Technical Accent (mapped to brand tokens for safety) */
				accent: withOpacity("--accent-rgb", "34, 197, 94"),
				"accent-brand": withOpacity("--accent-rgb", "34, 197, 94"),
				"accent-hover": withOpacity("--accent-hover-rgb", "22, 163, 74"),
				"accent-muted": "var(--accent-muted, rgba(34, 197, 94, 0.08))",
				"accent-border": "var(--accent-border, rgba(34, 197, 94, 0.25))",
				"brand-green": withOpacity("--accent-rgb", "34, 197, 94"),
				"brand-orange": withOpacity("--accent-rgb", "34, 197, 94"),
				"brand-orange-s": withOpacity("--accent-hover-rgb", "22, 163, 74"),
				"brand-orange-hover": withOpacity("--accent-hover-rgb", "22, 163, 74"),
				"brand-glow": "rgba(34, 197, 94, 0.06)",

				/* Semantic Signals (Muted, Professional) */
				"color-success": withOpacity("--color-success-rgb", "34, 197, 94"),
				"color-warning": withOpacity("--color-warning-rgb", "245, 158, 11"),
				"color-error": withOpacity("--color-error-rgb", "239, 68, 68"),
				"color-info": withOpacity("--color-info-rgb", "100, 116, 139"),
				"bc-success": withOpacity("--color-success-rgb", "34, 197, 94"),
				"bc-warning": withOpacity("--color-warning-rgb", "245, 158, 11"),
				"bc-error": withOpacity("--color-error-rgb", "239, 68, 68"),
				"bc-info": withOpacity("--color-info-rgb", "100, 116, 139"),
				"bc-primary": withOpacity("--text-primary-rgb", "241, 243, 239"),
				"bc-secondary": withOpacity("--text-secondary-rgb", "166, 172, 165"),
				"bc-muted": withOpacity("--text-muted-rgb", "111, 118, 111"),
				"bc-accent": withOpacity("--accent-rgb", "34, 197, 94"),
				"dark-green-s": withOpacity("--color-success-rgb", "34, 197, 94"),
				"dark-blue-s": withOpacity("--color-info-rgb", "100, 116, 139"),
				"dark-yellow": "#f59e0b",
				"dark-pink": "#ec4899",
				olive: "#10b981",

				/* Color Semantic Aliases */
				"color-error-bg": "rgba(239, 68, 68, 0.08)",
				"color-error-border": "rgba(239, 68, 68, 0.25)",
				"color-success-bg": "rgba(34, 197, 94, 0.08)",
				"color-success-border": "rgba(34, 197, 94, 0.25)",
				"color-warning-bg": "rgba(245, 158, 11, 0.08)",
				"color-warning-border": "rgba(245, 158, 11, 0.25)",

				/* Extended Custom Palette for Component Consistency */
				"emerald-450": "#10b981",
				"emerald-455": "#34d399",
				"emerald-650": "#047857",
				"green-450": "#22c55e",
				"rose-450": "#f43f5e",
				"rose-455": "#fb7185",
				"red-650": "#b91c1c",
				"gray-550": "#4b5563",

				/* 950 Shades (Backported for Tailwind 3.2 compatibility) */
				"red-950": "#450a0a",
				"emerald-950": "#022c22",
				"rose-950": "#4c0519",

				/* Refined Grays */
				"gray-250": "#d1d5db",
				"gray-305": "#a6aca5",
				"gray-350": "#8d938c",
				"gray-450": "#6f766f",
				"gray-650": "#3f4540",
				"gray-750": "#242824",
				"gray-805": "#1a1e1b",
				"gray-850": "#151816",
				"gray-855": "#121514",
			},
			opacity: {
				15: "0.15",
				35: "0.35",
				45: "0.45",
				55: "0.55",
				85: "0.85",
			},
			fontSize: {
				md: "1rem",
			},
			spacing: {
				"px-safe": "max(1rem, env(safe-area-inset-left))",
			},
			borderRadius: {
				sm: "4px",
				DEFAULT: "6px",
				md: "6px",
				lg: "8px",
				xl: "10px",
				"2xl": "12px",
			},
			boxShadow: {
				sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
				md: "0 2px 6px rgba(0, 0, 0, 0.5)",
				lg: "0 4px 12px rgba(0, 0, 0, 0.6)",
				/* Neutralized glow shadows to avoid neon glow */
				glow: "0 1px 3px rgba(0, 0, 0, 0.4)",
				"glow-sm": "0 1px 2px rgba(0, 0, 0, 0.3)",
				"glow-md": "0 2px 6px rgba(0, 0, 0, 0.4)",
				"glow-lg": "0 4px 12px rgba(0, 0, 0, 0.5)",
				"glow-inner": "none",
				"glow-success": "none",
				"glow-error": "none",
			},
			dropShadow: {
				glow: "none",
				"glow-sm": "none",
				"glow-md": "none",
				"glow-success": "none",
				"glow-error": "none",
			},
			transitionTimingFunction: {
				smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
				spring: "cubic-bezier(0.16, 1, 0.3, 1)",
			},
			keyframes: {
				"fade-in": {
					from: { opacity: "0", transform: "translateY(4px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				shake: {
					"0%, 100%": { transform: "translateX(0)" },
					"20%, 60%": { transform: "translateX(-3px)" },
					"40%, 80%": { transform: "translateX(3px)" },
				},
			},
			animation: {
				"fade-in": "fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both",
				shake: "shake 0.25s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
			},
		},
	},
	plugins: [],
};
