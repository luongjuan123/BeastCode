/**
 * This route now redirects to the unified Admin Dashboard.
 * Contest management is handled inside the SPA at /admin?page=contests
 */
import { useEffect } from "react";
import { useRouter } from "next/router";

const ContestsRedirect = () => {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin?page=contests");
	}, [router]);
	return null;
};

export default ContestsRedirect;
