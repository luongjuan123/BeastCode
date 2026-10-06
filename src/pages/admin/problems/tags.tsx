/**
 * This route now redirects to the unified Admin Dashboard.
 * Problem Tags are managed inside the SPA at /admin?page=problem-tags
 */
import { useEffect } from "react";
import { useRouter } from "next/router";

const ProblemTagsRedirect = () => {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin?page=problem-tags");
	}, [router]);
	return null;
};

export default ProblemTagsRedirect;
