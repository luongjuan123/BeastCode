import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import { ContestParticipantStanding } from "./types";

interface ContestSettings {
	startTime: number;
	endTime: number;
	duration: number; // in minutes
	leaderboardFreeze: number; // in minutes
	penaltyRules: {
		minutesPerIncorrect: number;
	};
}

export async function calculateStandingsRaw(
	contestId: string,
	freezeTime?: number
): Promise<{ standings: ContestParticipantStanding[]; contest: ContestSettings } | null> {
	const db = getAdminFirestore();

	// 1. Fetch contest settings
	const contestDoc = await db.collection("contests").doc(contestId).get();
	if (!contestDoc.exists) return null;
	const contest = contestDoc.data() as ContestSettings;

	// 2. Fetch all participants
	const participantsSnap = await db.collection("contest_participants")
		.where("contestId", "==", contestId)
		.get();
	const participants = participantsSnap.docs.map(doc => doc.data());

	// 3. Fetch submissions sorted by timestamp asc
	const submissionsSnap = await db.collection("contest_submissions")
		.where("contestId", "==", contestId)
		.orderBy("timestamp", "asc")
		.get();

	const submissions = submissionsSnap.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			problemId: data.problemId,
			uid: data.uid,
			status: data.status,
			timestamp: data.timestamp,
			score: data.score || 0
		};
	});

	// 4. Calculate standings
	const userMap: Record<string, ContestParticipantStanding> = {};

	// Initialize participants (filter out terminated ones)
	for (const p of participants) {
		if (p.status === "terminated") continue;
		userMap[p.uid] = {
			uid: p.uid,
			username: p.username || "Anonymous",
			totalScore: 0,
			totalPenalty: 0,
			problemResults: {}
		};
	}

	const penaltyK = contest.penaltyRules?.minutesPerIncorrect ?? 20;

	for (const sub of submissions) {
		// Filter out submissions for users not in the standings map (e.g. terminated)
		if (!userMap[sub.uid]) continue;

		// Check if submission is within participant's contest window
		const participant = participants.find(p => p.uid === sub.uid);
		const isVirtual = participant?.isVirtual === true;
		const participantStartTime = isVirtual && participant?.virtualStartTime
			? participant.virtualStartTime
			: contest.startTime;
		const participantEndTime = isVirtual && participant?.virtualStartTime
			? participant.virtualStartTime + contest.duration * 60000
			: contest.endTime;

		const isWithinWindow = sub.timestamp >= participantStartTime && sub.timestamp < participantEndTime;
		if (!isWithinWindow) continue;

		// If calculating frozen standings, ignore submissions made at or after freezeTime
		if (freezeTime && sub.timestamp >= freezeTime) {
			continue;
		}

		const row = userMap[sub.uid];
		const pid = sub.problemId;

		if (!row.problemResults[pid]) {
			row.problemResults[pid] = {
				solved: false,
				score: 0,
				penalty: 0,
				incorrectAttempts: 0
			};
		}

		const state = row.problemResults[pid];

		if (!state.solved) {
			if (sub.status === "passed") {
				state.solved = true;
				state.score = sub.score;
				const elapsedMinutes = Math.max(0, Math.floor((sub.timestamp - participantStartTime) / 60000));
				state.solvedTime = sub.timestamp;
				state.penalty = elapsedMinutes + (state.incorrectAttempts * penaltyK);

				row.totalScore += state.score;
				row.totalPenalty += state.penalty;
			} else {
				state.incorrectAttempts++;
			}
		}
	}

	const standings = Object.values(userMap);

	// Sort by points desc, then penalty asc, then username asc
	standings.sort((a, b) => {
		if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
		if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty;
		return a.username.localeCompare(b.username);
	});

	return { standings, contest };
}
