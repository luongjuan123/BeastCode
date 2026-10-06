import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";

export type ContestStatus = "draft" | "scheduled" | "registration_open" | "running" | "frozen" | "ended" | "archived";

export interface ContestData {
	id: string;
	startTime: number;
	endTime: number;
	leaderboardFreeze: number;
	status: string; // The current status stored in Firestore
	registrationEnabled: boolean;
}

let serverTimeOffset = 0;
let isSynced = false;

/**
 * Initializes the server time offset by fetching from the /api/time endpoint.
 * This guarantees the client uses a clock synchronized with the server.
 */
export async function syncServerTime(): Promise<number> {
	if (typeof window === "undefined") return Date.now();
	try {
		const start = Date.now();
		const response = await fetch("/api/time");
		const data = await response.json();
		const end = Date.now();
		const latency = (end - start) / 2;
		serverTimeOffset = data.serverTime - (end - latency);
		isSynced = true;
	} catch (e) {
		console.error("Failed to synchronize server time offset:", e);
	}
	return getServerTime();
}

/**
 * Returns the current time corrected by the server offset.
 */
export function getServerTime(): number {
	return Date.now() + serverTimeOffset;
}

/**
 * Computes the deterministic contest state based on times, freeze rules,
 * and current server time.
 */
export function getContestStatus(contest: ContestData, now: number): ContestStatus {
	// Draft and Archived statuses take absolute priority as administrative overrides.
	if (contest.status === "draft") {
		return "draft";
	}
	if (contest.status === "archived") {
		return "archived";
	}

	if (now < contest.startTime) {
		if (contest.registrationEnabled !== false) {
			return "registration_open";
		}
		return "scheduled";
	}

	const freezeStart = contest.endTime - (contest.leaderboardFreeze * 60000);
	if (now >= contest.startTime && now < contest.endTime) {
		if (contest.leaderboardFreeze > 0 && now >= freezeStart) {
			return "frozen";
		}
		return "running";
	}

	// Default state if time has passed
	return "ended";
}

/**
 * Synchronizes the stored status in Firestore if it differs from the computed status.
 * Prevents overriding draft and archived statuses.
 */
export async function syncContestStatus(contestId: string, currentStoredStatus: string, computedStatus: ContestStatus): Promise<void> {
	if (currentStoredStatus === "draft" || currentStoredStatus === "archived") {
		return;
	}
	if (currentStoredStatus !== computedStatus) {
		try {
			const contestRef = doc(firestore, "contests", contestId);
			await updateDoc(contestRef, { status: computedStatus });
		} catch (error) {
			console.error(`Error syncing contest status for ${contestId}:`, error);
		}
	}
}

// Automatically trigger sync on import in client environment
if (typeof window !== "undefined" && !isSynced) {
	syncServerTime();
	// Periodically calibrate every 60 seconds to correct clock drift
	setInterval(() => {
		syncServerTime();
	}, 60000);
}
