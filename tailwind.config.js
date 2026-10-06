/** @type {import('tailwindcss').Config} */
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
				"dark-layer-1": "var(--bg-dark-layer-1, #0f1210)",
				"dark-layer-2": "var(--bg-dark-layer-2, #080909)",
				"dark-surface": "var(--bg-surface, #0f1210)",
				"dark-elevated": "var(--bg-elevated, #151816)",
				"dark-hover": "var(--bg-hover, #1c211e)",
				"bg-surface": "var(--bg-surface, #0f1210)",
				"bg-dark-layer-1": "var(--bg-dark-layer-1, #0f1210)",
				"bg-dark-layer-2": "var(--bg-dark-layer-2, #080909)",
				"bg-base": "var(--bg-base, #080909)",

				/* Text Hierarchy */
				"text-primary": "var(--text-primary, #f1f3ef)",
				"text-secondary": "var(--text-secondary, #a6aca5)",
				"text-muted": "var(--text-muted, #6f766f)",
				"dark-gray-6": "#6f766f",
				"dark-gray-7": "var(--text-secondary, #a6aca5)",
				"dark-gray-8": "var(--text-primary, #f1f3ef)",
				"dark-label-2": "rgba(241, 243, 239, 0.75)",
				"gray-8": "#151816",

				/* Technical Borders */
				"border-subtle": "var(--border-subtle, #1a1e1b)",
				"border-default": "var(--border-default, #242824)",
				"border-strong": "var(--border-strong, #323833)",
				"border-accent": "var(--border-accent, rgba(34, 197, 94, 0.4))",
				"dark-divider-border-2": "var(--border-default, #242824)",

				/* Fills */
				"dark-fill-2": "var(--bg-dark-fill-2, rgba(34, 197, 94, 0.08))",
				"dark-fill-3": "var(--bg-dark-fill-3, rgba(34, 197, 94, 0.04))",

				/* Restrained Technical Accent (mapped to brand tokens for safety) */
				accent: "var(--accent, #22c55e)",
				"accent-muted": "var(--accent-muted, rgba(34, 197, 94, 0.08))",
				"brand-green": "var(--accent, #22c55e)",
				"brand-orange": "var(--accent, #22c55e)",
				"brand-orange-s": "var(--accent-hover, #16a34a)",
				"brand-orange-hover": "var(--accent-hover, #16a34a)",

				/* Semantic Signals (Muted, Professional) */
				"color-success": "var(--color-success, #22c55e)",
				"color-warning": "var(--color-warning, #f59e0b)",
				"color-error": "var(--color-error, #ef4444)",
				"color-info": "var(--color-info, #64748b)",
				"bc-success": "var(--color-success, #22c55e)",
				"bc-warning": "var(--color-warning, #f59e0b)",
				"bc-error": "var(--color-error, #ef4444)",
				"bc-info": "var(--color-info, #64748b)",
				"bc-primary": "var(--text-primary, #f1f3ef)",
				"bc-secondary": "var(--text-secondary, #a6aca5)",
				"bc-muted": "var(--text-muted, #6f766f)",
				"bc-accent": "var(--accent, #22c55e)",
				"dark-green-s": "var(--color-success, #22c55e)",
				"dark-blue-s": "var(--color-info, #38bdf8)",
				"dark-yellow": "#f59e0b",
				"dark-pink": "#ec4899",
				olive: "#10b981",

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
