import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";

export interface UserProfileData {
	avatarUrl?: string;
	displayName?: string;
}

// Module-level cache to share profile fetches across components and prevent duplicate requests
const profileCache: Record<string, UserProfileData> = {};
const pendingFetches: Record<string, Promise<UserProfileData> | null> = {};

export function useUserProfile(uid: string | undefined) {
	const [profile, setProfile] = useState<UserProfileData | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!uid) {
			setProfile(null);
			return;
		}

		// Return cached value immediately if available
		if (profileCache[uid]) {
			setProfile(profileCache[uid]);
			return;
		}

		let isMounted = true;
		setLoading(true);

		const fetchProfile = async () => {
			if (pendingFetches[uid]) {
				// Wait for the existing fetch to resolve
				try {
					const cachedData = await pendingFetches[uid];
					if (isMounted) {
						setProfile(cachedData);
					}
				} catch (e) {
					console.error("Error waiting for user profile fetch:", e);
				} finally {
					if (isMounted) setLoading(false);
				}
				return;
			}

			// Start a new fetch and store its promise
			const fetchPromise = (async () => {
				try {
					const userDocRef = doc(firestore, "users", uid);
					const userSnap = await getDoc(userDocRef);
					if (userSnap.exists()) {
						const data = userSnap.data();
						const profileData: UserProfileData = {
							avatarUrl: data.avatarUrl || data.photoURL || "",
							displayName: data.displayName || "",
						};
						profileCache[uid] = profileData;
						return profileData;
					}
				} catch (err) {
					console.error("Error fetching user profile:", err);
				}
				return {};
			})();

			pendingFetches[uid] = fetchPromise;

			try {
				const data = await fetchPromise;
				if (isMounted) {
					setProfile(data);
				}
			} finally {
				pendingFetches[uid] = null;
				if (isMounted) setLoading(false);
			}
		};

		fetchProfile();

		return () => {
			isMounted = false;
		};
	}, [uid]);

	return { profile, loading };
}
