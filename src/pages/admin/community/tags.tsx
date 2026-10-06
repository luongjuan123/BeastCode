/**
 * This route now redirects to the unified Admin Dashboard.
 * Community (Thread) Tags are handled inside the SPA at /admin?page=thread-tags
 */
import { useEffect } from "react";
import { useRouter } from "next/router";

const ThreadTagsRedirect = () => {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin?page=thread-tags");
	}, [router]);
	return null;
};

export default ThreadTagsRedirect;
