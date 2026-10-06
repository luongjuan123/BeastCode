import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import { auth } from "@/firebase/firebase";
import Topbar from "@/components/Topbar/Topbar";
import { ChatShell } from "@/components/Chat/ChatShell";

export default function ConversationDetailPage() {
	const router = useRouter();
	const { cid } = router.query;
	const [user, loading] = useAuthState(auth);
	const setAuthModal = useSetRecoilState(authModalState);

	if (loading) {
		return (
			<div className="min-h-screen bg-bg-base flex flex-col">
				<Topbar />
				<div className="flex-1 flex items-center justify-center">
					<div className="w-6 h-6 border-2 border-accent-brand border-t-transparent rounded-full animate-spin"></div>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="min-h-screen bg-bg-base flex flex-col">
				<Topbar />
				<div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
					<div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center text-lg mb-3 text-accent-brand">
						#
					</div>
					<h1 className="text-lg font-semibold text-text-primary mb-1">Authentication Required</h1>
					<p className="text-xs text-text-muted max-w-sm mb-5 font-mono">
						Please sign in to your developer account to access technical channels and team messages.
					</p>
					<button
						type="button"
						onClick={() => setAuthModal((prev) => ({ ...prev, isOpen: true, type: "login" }))}
						className="px-4 py-2 rounded-md bg-accent-brand hover:bg-accent-hover text-bg-base text-xs font-mono font-medium transition-colors"
					>
						Sign In
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-bg-base flex flex-col overflow-hidden">
			<Head>
				<title>Messages | BeastCode</title>
				<meta name="description" content="Real-time messaging for coders and organizations on BeastCode." />
			</Head>

			<Topbar />
			<main className="flex-1 overflow-hidden">
				<ChatShell initialConversationId={cid as string} />
			</main>
		</div>
	);
}
