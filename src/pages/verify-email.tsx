import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LegacyVerifyEmailRedirect() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/auth/verify-email");
	}, [router]);

	return null;
}
