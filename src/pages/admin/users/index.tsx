import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Route /admin/users redirects directly to the unified Admin Dashboard with Moderation & Accounts tab active.
 */
export default function AdminUsersRedirect() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/admin?tab=moderation&subtab=users");
	}, [router]);

	return null;
}
