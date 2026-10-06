import { useEffect, useState } from "react";
import { ThreadTag } from "@/utils/types/tag";

let cachedTags: ThreadTag[] | null = null;
let activeListeners: Set<(tags: ThreadTag[]) => void> = new Set();
let isFetching = false;

export const useThreadTags = () => {
	const [tags, setTags] = useState<ThreadTag[]>(cachedTags || []);

	useEffect(() => {
		if (cachedTags) {
			setTags(cachedTags);
			return;
		}

		const listener = (newTags: ThreadTag[]) => {
			setTags(newTags);
		};
		activeListeners.add(listener);

		if (!isFetching) {
			isFetching = true;
			fetch("/api/thread-tags")
				.then(res => res.json())
				.then(data => {
					if (data.success && data.tags) {
						cachedTags = data.tags;
						activeListeners.forEach(l => l(data.tags));
					}
				})
				.catch(err => {
					console.error("Error loading thread tags cache:", err);
				})
				.finally(() => {
					isFetching = false;
				});
		}

		return () => {
			activeListeners.delete(listener);
		};
	}, []);

	const getTag = (tagId: string): ThreadTag | null => {
		return tags.find(t => t.id === tagId) || null;
	};

	return { tags, getTag, loading: tags.length === 0 && isFetching };
};
