import { authModalState } from "@/atoms/authModalAtom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { useSetRecoilState } from "recoil";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { getSafeRedirectUrl } from "@/utils/sanitizeUrl";

type AuthPageProps = {};

const AuthPage: React.FC<AuthPageProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const [user, loading] = useAuthState(auth);
	const router = useRouter();

	useEffect(() => {
		if (loading || !router.isReady) return;

		const destination = getSafeRedirectUrl(router.query.prev);

		if (user) {
			if (!user.emailVerified) {
				router.replace("/auth/verify-email");
			} else {
				router.replace(destination);
			}
		} else {
			const typeParam = router.query.type as string;
			const targetType = typeParam && ["login", "register", "forgotPassword"].includes(typeParam)
				? (typeParam as "login" | "register" | "forgotPassword")
				: "login";

			setAuthModalState({ isOpen: true, type: targetType });
			router.replace(destination);
		}
	}, [user, loading, router.isReady, router.query.type, router.query.prev, router, setAuthModalState]);

	return null;
};

export default AuthPage;
