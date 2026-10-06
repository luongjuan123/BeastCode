import { useEffect, useState } from "react";
import { auth } from "@/firebase/firebase";

export interface ProblemStanding {
	solved: boolean;
	score: number;
	penalty: number;
	incorrectAttempts: number;
	solvedTime?: number;
}

export interface ParticipantStanding {
	uid: string;
	username: string;
	totalScore: number;
	totalPenalty: number;
	problemResults: Record<string, ProblemStanding>;
	rank: number;
}

export function useContestStandings(contestId: string | undefined) {
	const [standings, setStandings] = useState<ParticipantStanding[]>([]);
	const [isFrozen, setIsFrozen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!contestId) return;

		let active = true;
		let intervalId: NodeJS.Timeout;

		const fetchStandings = async () => {
			try {
				let idToken = "";
				const currentUser = auth.currentUser;
				if (currentUser) {
					idToken = await currentUser.getIdToken();
				}

				const url = `/api/contests/${contestId}/standings${idToken ? `?idToken=${encodeURIComponent(idToken)}` : ""}`;
				const res = await fetch(url);
				if (!res.ok) {
					throw new Error(`Error fetching standings: ${res.statusText}`);
				}
				const data = await res.json();
				if (active && data.success) {
					setStandings(data.standings || []);
					setIsFrozen(!!data.isFrozen);
					setError(null);
				}
			} catch (err: any) {
				console.error("useContestStandings error:", err);
				if (active) {
					setError(err.message || "Failed to load standings.");
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		// Fetch immediately
		fetchStandings();

		// Poll every 10 seconds
		intervalId = setInterval(fetchStandings, 10000);

		return () => {
			active = false;
			clearInterval(intervalId);
		};
	}, [contestId]);

	return { standings, isFrozen, loading, error };
}
