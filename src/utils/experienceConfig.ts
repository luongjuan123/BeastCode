export interface ExperienceTier {
	name: string;
	threshold: number;
	colorClass: string;
	accentColor: string;
}

export interface ExperienceConfig {
	weights: {
		easy: number;
		medium: number;
		hard: number;
		ml: number;
		contestParticipation: number;
		contestWinner: number;
	};
	tiers: ExperienceTier[];
}

export const EXPERIENCE_CONFIG: ExperienceConfig = {
	weights: {
		easy: 1,
		medium: 3,
		hard: 7,
		ml: 10,
		contestParticipation: 5,
		contestWinner: 20,
	},
	tiers: [
		{ name: "Newbie", threshold: 0, colorClass: "bg-slate-500/10 border-slate-500/30 text-slate-400", accentColor: "#94a3b8" },
		{ name: "Beginner", threshold: 5, colorClass: "bg-green-500/10 border-green-500/30 text-green-400", accentColor: "#22c55e" },
		{ name: "Apprentice", threshold: 15, colorClass: "bg-teal-500/10 border-teal-500/30 text-teal-400", accentColor: "#14b8a6" },
		{ name: "Intermediate", threshold: 30, colorClass: "bg-blue-500/10 border-blue-500/30 text-blue-400", accentColor: "#3b82f6" },
		{ name: "Advanced", threshold: 50, colorClass: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400", accentColor: "#6366f1" },
		{ name: "Expert", threshold: 85, colorClass: "bg-purple-500/10 border-purple-500/30 text-purple-400", accentColor: "#a855f7" },
		{ name: "Master", threshold: 130, colorClass: "bg-pink-500/10 border-pink-500/30 text-pink-400", accentColor: "#ec4899" },
		{ name: "Grandmaster", threshold: 190, colorClass: "bg-red-500/10 border-red-500/30 text-red-400", accentColor: "#ef4444" },
		{ name: "Legend", threshold: 270, colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-400", accentColor: "#f59e0b" },
		{ name: "Mythic", threshold: 370, colorClass: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-pink-500/50 text-pink-300 font-extrabold animate-pulse", accentColor: "#d946ef" },
	],
};

export interface SolveStats {
	easySolved: number;
	mediumSolved: number;
	hardSolved: number;
	mlSolved: number;
	contestParticipation: number;
	contestWins: number;
}

export function calculateExperience(stats: SolveStats) {
	const score =
		stats.easySolved * EXPERIENCE_CONFIG.weights.easy +
		stats.mediumSolved * EXPERIENCE_CONFIG.weights.medium +
		stats.hardSolved * EXPERIENCE_CONFIG.weights.hard +
		stats.mlSolved * EXPERIENCE_CONFIG.weights.ml +
		stats.contestParticipation * EXPERIENCE_CONFIG.weights.contestParticipation +
		stats.contestWins * EXPERIENCE_CONFIG.weights.contestWinner;

	// Find the current tier
	let currentTier = EXPERIENCE_CONFIG.tiers[0];
	let nextTier: ExperienceTier | null = EXPERIENCE_CONFIG.tiers[1] || null;

	for (let i = 0; i < EXPERIENCE_CONFIG.tiers.length; i++) {
		if (score >= EXPERIENCE_CONFIG.tiers[i].threshold) {
			currentTier = EXPERIENCE_CONFIG.tiers[i];
			nextTier = EXPERIENCE_CONFIG.tiers[i + 1] || null;
		} else {
			break;
		}
	}

	const currentTierThreshold = currentTier.threshold;
	const nextTierThreshold = nextTier ? nextTier.threshold : currentTier.threshold + 100; // fallback if Mythic/maxed
	
	const pointsInCurrent = score - currentTierThreshold;
	const pointsNeededForNext = nextTierThreshold - currentTierThreshold;
	const percent = Math.min(100, Math.max(0, (pointsInCurrent / pointsNeededForNext) * 100));
	const pointsToNext = nextTier ? nextTier.threshold - score : 0;

	return {
		score,
		currentTier,
		nextTier,
		percent,
		pointsToNext,
	};
}
