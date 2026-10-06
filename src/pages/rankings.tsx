import AppShell from "@/components/UI/AppShell";
import Leaderboard from "@/components/Leaderboard/Leaderboard";
import useHasMounted from "@/hooks/useHasMounted";

export default function RankingsPage() {
	const hasMounted = useHasMounted();

	if (!hasMounted) return null;

	return (
		<AppShell activeNav="Rankings" maxWidth="wide">
			<Leaderboard />
		</AppShell>
	);
}
