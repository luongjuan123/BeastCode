/**
 * Sanitizes email inputs to resolve the common browser/autofill bug where the
 * typed prefix is appended to the autocomplete suggestion (e.g. dungbiter113654@gmail.comdungbiter).
 */
export const sanitizeAutofilledEmail = (email: string): string => {
	const trimmed = email.trim();
	const atIndex = trimmed.indexOf("@");
	if (atIndex === -1) return trimmed;

	const username = trimmed.substring(0, atIndex);
	const domainPart = trimmed.substring(atIndex + 1);

	// Find common TLDs followed by suffix
	const match = domainPart.match(/^([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,6})(.*)$/);
	if (match) {
		const domainAndSub = match[1];
		const tld = match[2];
		const suffix = match[3];

		if (suffix) {
			// Case-insensitive check if suffix matches prefix/suffix of username
			const lowerUsername = username.toLowerCase();
			const lowerSuffix = suffix.toLowerCase();

			if (
				lowerUsername.startsWith(lowerSuffix) ||
				lowerUsername.endsWith(lowerSuffix) ||
				lowerSuffix.startsWith(lowerUsername)
			) {
				return `${username}@${domainAndSub}.${tld}`;
			}
		}
	}

	return trimmed;
};
