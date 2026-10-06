import AppShell from "@/components/UI/AppShell";
import ThreadsBoard from "@/components/Threads/Threads";
import useHasMounted from "@/hooks/useHasMounted";

export default function ThreadsPage() {
	const hasMounted = useHasMounted();
	if (!hasMounted) return null;

	return (
		<AppShell activeNav="Threads" maxWidth="wide">
			<div className="w-full">
				<ThreadsBoard />
			</div>
		</AppShell>
	);
}
