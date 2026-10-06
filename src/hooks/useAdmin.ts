import { useEffect, useState, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export function useAdmin() {
	const [user, loadingAuth] = useAuthState(auth);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);
	const activeUidRef = useRef<string | null>(null);

	useEffect(() => {
		let isCancelled = false;
		const currentUid = user?.uid || null;
		activeUidRef.current = currentUid;

		// Synchronously reset state whenever user changes or logs out
		setIsAdmin(false);

		if (loadingAuth) {
			setLoading(true);
			return;
		}

		if (!user || !currentUid) {
			setLoading(false);
			return;
		}

		setLoading(true);

		const verifyAdminStatus = async () => {
			try {
				// 1. Check verified custom claims on Firebase ID token
				const tokenResult = await user.getIdTokenResult(false);
				if (isCancelled || activeUidRef.current !== currentUid) return;

				if (
					tokenResult.claims.admin === true ||
					tokenResult.claims.role === "super_admin" ||
					tokenResult.claims.role === "admin"
				) {
					setIsAdmin(true);
					setLoading(false);
					return;
				}

				// 2. Check authoritative /platformAdmins/{uid} collection in Firestore
				const adminDocRef = doc(firestore, "platformAdmins", currentUid);
				const adminDocSnap = await getDoc(adminDocRef);
				if (isCancelled || activeUidRef.current !== currentUid) return;

				if (adminDocSnap.exists()) {
					const data = adminDocSnap.data();
					if (data.active === true) {
						setIsAdmin(true);
						setLoading(false);
						return;
					}
				}

				// User is not an admin
				setIsAdmin(false);
			} catch (err) {
				console.error("[useAdmin] Error verifying platform admin status:", err);
				if (!isCancelled && activeUidRef.current === currentUid) {
					setIsAdmin(false);
				}
			} finally {
				if (!isCancelled && activeUidRef.current === currentUid) {
					setLoading(false);
				}
			}
		};

		verifyAdminStatus();

		return () => {
			isCancelled = true;
		};
	}, [user, loadingAuth]);

	return [isAdmin, loading || loadingAuth] as const;
}
