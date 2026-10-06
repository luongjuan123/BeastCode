/**
 * This route now redirects to the unified Admin Dashboard.
 * Moderation is handled inside the SPA at /admin?page=moderation
 */
import { useEffect } from "react";
import { useRouter } from "next/router";

const ModerationRedirect = () => {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin?page=moderation");
	}, [router]);
	return null;
};

export default ModerationRedirect;
