import { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "@/firebase/firebase";
import { ChatAttachment } from "@/types/chat";

interface CachedBlob {
	blobUrl: string;
	mimeType: string;
	refCount: number;
	timestamp: number;
}

// Bounded in-memory cache to prevent repeated network transfers when scrolling or switching tabs
const mediaBlobCache = new Map<string, CachedBlob>();
const MAX_CACHE_SIZE = 60;

function cleanupCache() {
	if (mediaBlobCache.size <= MAX_CACHE_SIZE) return;
	// Evict unreferenced oldest entries first
	const entries = Array.from(mediaBlobCache.entries());
	entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

	for (const [id, cached] of entries) {
		if (mediaBlobCache.size <= MAX_CACHE_SIZE) break;
		if (cached.refCount <= 0) {
			try {
				URL.revokeObjectURL(cached.blobUrl);
			} catch (_) {}
			mediaBlobCache.delete(id);
		}
	}
}

export function useAuthorizedChatMedia(attachment?: ChatAttachment | null) {
	const [blobUrl, setBlobUrl] = useState<string | null>(() => {
		if (attachment?.url && (attachment.url.startsWith("blob:") || attachment.url.startsWith("data:"))) {
			return attachment.url;
		}
		if (attachment?.id && mediaBlobCache.has(attachment.id)) {
			return mediaBlobCache.get(attachment.id)!.blobUrl;
		}
		return null;
	});
	const [loading, setLoading] = useState<boolean>(
		!blobUrl && !!attachment?.url && !attachment.url.startsWith("blob:") && !attachment.url.startsWith("data:")
	);
	const [error, setError] = useState<string | null>(null);

	const activeAttachmentIdRef = useRef<string | null>(attachment?.id || null);
	activeAttachmentIdRef.current = attachment?.id || null;

	const loadMedia = useCallback(
		async (forceRefresh = false) => {
			if (!attachment || !attachment.url) {
				setBlobUrl(null);
				setLoading(false);
				setError(null);
				return;
			}

			// Local blob or data URIs (e.g. optimistic uploads) require zero network fetches
			if (attachment.url.startsWith("blob:") || attachment.url.startsWith("data:")) {
				setBlobUrl(attachment.url);
				setLoading(false);
				setError(null);
				return;
			}

			const mediaId = attachment.id || attachment.url;

			// Check in-memory cache
			if (!forceRefresh && mediaBlobCache.has(mediaId)) {
				const cached = mediaBlobCache.get(mediaId)!;
				cached.refCount++;
				cached.timestamp = Date.now();
				setBlobUrl(cached.blobUrl);
				setLoading(false);
				setError(null);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const user = auth.currentUser;
				if (!user) {
					// User not yet initialized, wait briefly
					await new Promise((r) => setTimeout(r, 400));
				}

				let idToken = await auth.currentUser?.getIdToken();
				if (!idToken) {
					throw new Error("Authentication required to view attachment");
				}

				let res = await fetch(attachment.url, {
					headers: {
						Authorization: `Bearer ${idToken}`,
					},
				});

				// If 401, retry once with refreshed token
				if (res.status === 401 && auth.currentUser) {
					idToken = await auth.currentUser.getIdToken(true);
					res = await fetch(attachment.url, {
						headers: {
							Authorization: `Bearer ${idToken}`,
						},
					});
				}

				if (!res.ok) {
					if (res.status === 403) {
						throw new Error("Access denied: You are not a participant in this conversation");
					} else if (res.status === 404) {
						throw new Error("Attachment not found or deleted");
					}
					throw new Error(`Media fetch failed with status ${res.status}`);
				}

				const contentType = res.headers.get("content-type") || "";
				// Ensure response is actually media / binary, not an error page or JSON
				if (contentType.includes("application/json") || contentType.includes("text/html")) {
					throw new Error("Invalid media response received from server");
				}

				const blob = await res.blob();
				const objectUrl = URL.createObjectURL(blob);

				// Cache new object URL
				mediaBlobCache.set(mediaId, {
					blobUrl: objectUrl,
					mimeType: contentType,
					refCount: 1,
					timestamp: Date.now(),
				});
				cleanupCache();

				// Ensure this response matches the current component instance
				if (activeAttachmentIdRef.current === (attachment.id || null)) {
					setBlobUrl(objectUrl);
					setLoading(false);
					setError(null);
				}
			} catch (err: any) {
				if (activeAttachmentIdRef.current === (attachment.id || null)) {
					console.warn("[useAuthorizedChatMedia error]:", err.message);
					setError(err.message || "Failed to load media");
					setLoading(false);
				}
			}
		},
		[attachment]
	);

	useEffect(() => {
		const mediaId = attachment?.id || attachment?.url;
		if (mediaId && mediaBlobCache.has(mediaId)) {
			const cached = mediaBlobCache.get(mediaId)!;
			cached.refCount++;
			cached.timestamp = Date.now();
			setBlobUrl(cached.blobUrl);
			setLoading(false);
			setError(null);
		} else if (attachment?.url) {
			loadMedia();
		} else {
			setBlobUrl(null);
			setLoading(false);
			setError(null);
		}

		return () => {
			if (mediaId && mediaBlobCache.has(mediaId)) {
				const cached = mediaBlobCache.get(mediaId)!;
				cached.refCount = Math.max(0, cached.refCount - 1);
			}
		};
	}, [attachment?.id, attachment?.url, loadMedia]);

	return {
		blobUrl,
		loading,
		error,
		retry: () => loadMedia(true),
	};
}

/**
 * Downloads an authorized private attachment directly using an authenticated fetch
 */
export async function downloadAuthorizedMedia(attachment: ChatAttachment): Promise<void> {
	if (!attachment.url) return;

	try {
		const user = auth.currentUser;
		if (!user) throw new Error("Please sign in to download");

		let idToken = await user.getIdToken();
		let res = await fetch(attachment.url, {
			headers: {
				Authorization: `Bearer ${idToken}`,
			},
		});

		if (res.status === 401) {
			idToken = await user.getIdToken(true);
			res = await fetch(attachment.url, {
				headers: {
					Authorization: `Bearer ${idToken}`,
				},
			});
		}

		if (!res.ok) {
			throw new Error(`Download failed with status ${res.status}`);
		}

		const blob = await res.blob();
		const downloadUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = downloadUrl;
		anchor.download = attachment.name || "attachment";
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);

		setTimeout(() => {
			try {
				URL.revokeObjectURL(downloadUrl);
			} catch (_) {}
		}, 2000);
	} catch (err: any) {
		console.error("[downloadAuthorizedMedia error]:", err);
		alert(`Failed to download: ${err.message}`);
	}
}
