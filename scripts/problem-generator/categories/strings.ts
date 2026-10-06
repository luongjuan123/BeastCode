import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const stringProblems: ProblemDefinition[] = [
	// 11. The Ancient Cipher of Karnak (Valid Palindrome)
	{
		id: "the-ancient-cipher-of-karnak",
		title: "The Ancient Cipher of Karnak",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "two-pointers"],
		description: "Determine whether an ancient inscription is a palindrome, considering only alphanumeric characters and ignoring case.",
		story: `<p>In the subterranean crypt of Karnak, an obsidian door bears a carved phrase. Legend states the door unlocks only if the inscription reads identically forward and backward, considering only letters and digits while ignoring punctuation, spaces, and character casing.</p>`,
		task: "Given string S, print 'YES' if it is a palindrome after stripping non-alphanumeric characters and converting to lowercase; otherwise print 'NO'.",
		inputFormat: `<p>A single line containing the string <code>S</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S contains printable ASCII characters."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2001);
			const tcs = [];

			tcs.push(makeTc(1, "A man, a plan, a canal: Panama", "YES", true, "Ignoring punctuation and case gives 'amanaplanacanalpanama', which is a palindrome."));
			tcs.push(makeTc(2, "race a car", "NO", true, "'raceacar' is not a palindrome."));
			tcs.push(makeTc(3, " .,. ", "YES", true, "An inscription with only punctuation filters to empty, trivially a palindrome."));

			const isPal = (s: string): boolean => {
				const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, "");
				let l = 0, r = cleaned.length - 1;
				while (l < r) {
					if (cleaned[l] !== cleaned[r]) return false;
					l++;
					r--;
				}
				return true;
			};

			// Edge cases
			tcs.push(makeTc(4, "0P", "NO"));
			tcs.push(makeTc(5, "a.", "YES"));
			tcs.push(makeTc(6, ".,,,.", "YES"));
			tcs.push(makeTc(7, "Was it a car or a cat I saw?", "YES"));
			tcs.push(makeTc(8, "No 'x' in Nixon", "YES"));

			for (let i = 9; i <= 75; i++) {
				const len = rng.nextInt(5, 50);
				let raw = "";
				if (i % 2 === 0) {
					// generate palindrome
					const half = rng.nextString(Math.floor(len / 2));
					const pal = half + (len % 2 === 1 ? rng.choice(["a", "b", "c"]) : "") + half.split("").reverse().join("");
					// insert random punctuation
					for (const ch of pal) {
						if (rng.next() < 0.2) raw += rng.choice([" ", ",", ".", "!", ":", ";", "-"]);
						raw += rng.next() < 0.5 ? ch.toUpperCase() : ch;
					}
				} else {
					raw = rng.nextString(len);
				}
				tcs.push(makeTc(i, raw, isPal(raw) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(60, 150);
				const half = rng.nextString(Math.floor(len / 2));
				let raw = half + half.split("").reverse().join("");
				if (i % 2 === 1) {
					raw = raw.substring(0, raw.length - 1) + "z";
				}
				tcs.push(makeTc(i, raw, isPal(raw) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 12. Scroll of the Whispering Monks (Run-Length Encoding)
	{
		id: "scroll-of-the-whispering-monks",
		title: "Scroll of the Whispering Monks",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "simulation"],
		description: "Compress consecutive identical characters using run-length encoding.",
		story: `<p>The Whispering Monks of Mount Hallow record liturgical chants onto precious papyrus scrolls. To save parchment, repetitive syllables are compressed: consecutive identical lowercase letters are replaced by the letter followed by the run count (e.g. <code>aaa</code> becomes <code>a3</code>).</p>`,
		task: "Given a string S of lowercase English letters, output its run-length compressed string.",
		inputFormat: `<p>A single line containing the string <code>S</code>.</p>`,
		outputFormat: `<p>Print the compressed string.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S consists solely of lowercase English letters."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2002);
			const tcs = [];

			tcs.push(makeTc(1, "aabcccccaaa", "a2b1c5a3", true, "Consecutive characters are grouped and counted."));
			tcs.push(makeTc(2, "abcd", "a1b1c1d1", true, "Single occurrences have count 1."));
			tcs.push(makeTc(3, "z", "z1", true, "Single character string."));

			const rle = (s: string): string => {
				let res = "";
				let count = 1;
				for (let i = 0; i < s.length; i++) {
					if (i + 1 < s.length && s[i] === s[i + 1]) {
						count++;
					} else {
						res += s[i] + count;
						count = 1;
					}
				}
				return res;
			};

			for (let i = 4; i <= 75; i++) {
				const groups = rng.nextInt(3, 100);
				let s = "";
				for (let g = 0; g < groups; g++) {
					const ch = rng.choice("abcdefghijklmnopqrstuvwxyz".split(""));
					const repeat = rng.nextInt(1, 20);
					s += ch.repeat(repeat);
				}
				tcs.push(makeTc(i, s, rle(s)));
			}

			for (let i = 76; i <= 100; i++) {
				const groups = rng.nextInt(30, 80);
				let s = "";
				for (let g = 0; g < groups; g++) {
					const ch = rng.choice("abcdefghijklmnopqrstuvwxyz".split(""));
					const repeat = rng.nextInt(1, 10);
					s += ch.repeat(repeat);
				}
				tcs.push(makeTc(i, s, rle(s)));
			}

			return tcs;
		},
	},

	// 13. The Scribe's Longest Unique Substring (Longest Substring Without Repeating)
	{
		id: "the-scribes-longest-unique-substring",
		title: "The Scribe's Longest Unique Substring",
		difficulty: "Medium",
		category: "string",
		tags: ["string", "sliding-window"],
		description: "Find the length of the longest contiguous substring without repeating characters.",
		story: `<p>The Royal Scribe is tasked with etching runic phrases onto a magic ring. According to magical law, runes lose their power if any character appears more than once in the active inscription. Find the length of the longest contiguous substring of <code>S</code> that contains <b>no duplicate characters</b>.</p>`,
		task: "Given string S, output the maximum length of a substring without repeating characters.",
		inputFormat: `<p>A single line containing the string <code>S</code>.</p>`,
		outputFormat: `<p>Print a single integer: the length of the longest unique substring.</p>`,
		constraints: formatConstraints([
			"0 <= length of S <= 10^5",
			"S consists of English letters, digits, and symbols."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2003);
			const tcs = [];

			tcs.push(makeTc(1, "abcabcbb", "3", true, "The answer is 'abc', with the length of 3."));
			tcs.push(makeTc(2, "bbbbb", "1", true, "The answer is 'b', with the length of 1."));
			tcs.push(makeTc(3, "pwwkew", "3", true, "The answer is 'wke', with the length of 3. Notice 'pwke' is a subsequence, not substring."));

			const lengthOfLongestSubstring = (s: string): number => {
				const map = new Map<string, number>();
				let maxLen = 0, left = 0;
				for (let right = 0; right < s.length; right++) {
					const ch = s[right];
					if (map.has(ch) && map.get(ch)! >= left) {
						left = map.get(ch)! + 1;
					}
					map.set(ch, right);
					maxLen = Math.max(maxLen, right - left + 1);
				}
				return maxLen;
			};

			tcs.push(makeTc(4, "", "0"));
			tcs.push(makeTc(5, "abcdefghijklmnopqrstuvwxyz", "26"));
			tcs.push(makeTc(6, "aab", "2"));
			tcs.push(makeTc(7, "cdd", "2"));

			for (let i = 8; i <= 75; i++) {
				const len = rng.nextInt(5, 50);
				const s = rng.nextString(len, "abcdefghijklmn");
				tcs.push(makeTc(i, s, `${lengthOfLongestSubstring(s)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(60, 150);
				const s = rng.nextString(len, "abcdefghijklmnopqrstuvwxyz0123456789");
				tcs.push(makeTc(i, s, `${lengthOfLongestSubstring(s)}`));
			}

			return tcs;
		},
	},

	// 14. Runes of Alchemical Transmutation (Valid Anagram)
	{
		id: "runes-of-alchemical-transmutation",
		title: "Runes of Alchemical Transmutation",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "sorting"],
		description: "Determine if two runic strings are anagrams of each other.",
		story: `<p>In the School of Alchemy, an elemental formula <code>S</code> can be transmuted into another formula <code>T</code> if and only if both formulas contain the exact same magical elements with the exact same frequencies, regardless of arrangement.</p>`,
		task: "Given two strings S and T, print 'YES' if T is an anagram of S, or 'NO' otherwise.",
		inputFormat: `<p>The first line contains string <code>S</code>.</p>
<p>The second line contains string <code>T</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= length of S, T <= 10^5",
			"S and T consist of lowercase English letters."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2004);
			const tcs = [];

			tcs.push(makeTc(1, "anagram\nnagaram", "YES", true, "Both contain 3 a's, 1 n, 1 g, 1 r, 1 m."));
			tcs.push(makeTc(2, "rat\ncar", "NO", true, "Different character sets."));
			tcs.push(makeTc(3, "a\na", "YES", true, "Identical single characters."));

			const isAnagram = (s: string, t: string): boolean => {
				if (s.length !== t.length) return false;
				const counts: Record<string, number> = {};
				for (const c of s) counts[c] = (counts[c] || 0) + 1;
				for (const c of t) {
					if (!counts[c]) return false;
					counts[c]--;
				}
				return true;
			};

			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(5, 50);
				const s = rng.nextString(len);
				let t = "";
				if (i % 2 === 0) {
					t = rng.shuffle(s.split("")).join("");
				} else {
					t = rng.nextString(len);
				}
				tcs.push(makeTc(i, `${s}\n${t}`, isAnagram(s, t) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(60, 150);
				const s = rng.nextString(len);
				let t = "";
				if (i % 2 === 0) {
					t = rng.shuffle(s.split("")).join("");
				} else {
					t = rng.nextString(len);
				}
				tcs.push(makeTc(i, `${s}\n${t}`, isAnagram(s, t) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 15. The Archmage's Common Incantation (Longest Common Prefix)
	{
		id: "the-archmages-common-incantation",
		title: "The Archmage's Common Incantation",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "simulation"],
		description: "Find the longest common prefix among an array of N magical spell incantations.",
		story: `<p>Archmage Ignis gathers <b>N</b> spell scrolls. To coordinate a ritual, all mages must begin chanting the exact same starting verse. Find the <b>longest common prefix</b> shared by all <b>N</b> spell strings. If no common prefix exists, print <code>NONE</code>.</p>`,
		task: "Given N strings, find their longest common prefix. If empty, print NONE.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain a non-empty string of lowercase English letters.</p>`,
		outputFormat: `<p>Print the longest common prefix, or NONE if empty.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"1 <= length of each string <= 1000"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2005);
			const tcs = [];

			tcs.push(makeTc(1, "3\nflower\nflow\nflight", "fl", true, "Prefix 'fl' is shared by all three strings."));
			tcs.push(makeTc(2, "3\ndog\nracecar\ncar", "NONE", true, "No common prefix exists, output NONE."));
			tcs.push(makeTc(3, "1\nabracadabra", "abracadabra", true, "Single string is its own prefix."));

			const lcp = (strs: string[]): string => {
				if (strs.length === 0) return "NONE";
				let prefix = strs[0];
				for (let i = 1; i < strs.length; i++) {
					while (strs[i].indexOf(prefix) !== 0) {
						prefix = prefix.substring(0, prefix.length - 1);
						if (prefix === "") return "NONE";
					}
				}
				return prefix === "" ? "NONE" : prefix;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(2, 50);
				const hasPrefix = i % 2 === 0;
				const pref = hasPrefix ? rng.nextString(rng.nextInt(1, 8)) : "";
				const arr: string[] = [];
				for (let k = 0; k < n; k++) {
					arr.push(pref + rng.nextString(rng.nextInt(1, 20)));
				}
				tcs.push(makeTc(i, `${n}\n${arr.join("\n")}`, lcp(arr)));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(20, 60);
				const pref = rng.nextString(rng.nextInt(0, 10));
				const arr: string[] = [];
				for (let k = 0; k < n; k++) {
					arr.push(pref + rng.nextString(rng.nextInt(5, 50)));
				}
				tcs.push(makeTc(i, `${n}\n${arr.join("\n")}`, lcp(arr)));
			}

			return tcs;
		},
	},

	// 16. Message in the Stellar Bottle (Reverse Words in a String)
	{
		id: "message-in-the-stellar-bottle",
		title: "Message in the Stellar Bottle",
		difficulty: "Medium",
		category: "string",
		tags: ["string", "two-pointers"],
		description: "Reverse the order of words in a space-delimited string while stripping extra whitespace.",
		story: `<p>A communication probe from the deep Andromeda galaxy transmits a transmission stream where word tokens are reversed due to gravitational lensing. Decode the transmission by reversing the order of words and normalizing spaces between words to a single space.</p>`,
		task: "Given string S containing words and spaces, reverse the sequence of words separated by a single space, removing leading, trailing, and duplicate spaces.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print the reversed words string.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S contains English letters, digits, and spaces."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2006);
			const tcs = [];

			tcs.push(makeTc(1, "the sky is blue", "blue is sky the", true, "Words reversed."));
			tcs.push(makeTc(2, "  hello world  ", "world hello", true, "Leading and trailing spaces stripped."));
			tcs.push(makeTc(3, "a good   example", "example good a", true, "Multiple consecutive spaces reduced to single space."));

			const revWords = (s: string): string => {
				return s.trim().split(/\s+/).reverse().join(" ");
			};

			for (let i = 4; i <= 75; i++) {
				const wordCount = rng.nextInt(2, 30);
				const words = [];
				for (let k = 0; k < wordCount; k++) {
					words.push(rng.nextString(rng.nextInt(2, 10)));
				}
				// sprinkle spaces
				const raw = "  " + words.join("   ") + " ";
				tcs.push(makeTc(i, raw, revWords(raw)));
			}

			for (let i = 76; i <= 100; i++) {
				const wordCount = rng.nextInt(30, 80);
				const words = [];
				for (let k = 0; k < wordCount; k++) {
					words.push(rng.nextString(rng.nextInt(3, 8)));
				}
				const raw = words.join(" ");
				tcs.push(makeTc(i, raw, revWords(raw)));
			}

			return tcs;
		},
	},

	// 17. The King's Roman Numeral Decree (Roman to Integer)
	{
		id: "the-kings-roman-numeral-decree",
		title: "The King's Roman Numeral Decree",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "math"],
		description: "Convert a standard Roman numeral string into its integer value.",
		story: `<p>In the royal imperial registry, old property deeds are marked with Roman numerals (I, V, X, L, C, D, M). Help the archivists convert each numeral into its decimal integer value.</p>`,
		task: "Given a valid Roman numeral string S, convert it to an integer.",
		inputFormat: `<p>A single line containing the Roman numeral string <code>S</code>.</p>`,
		outputFormat: `<p>Print the corresponding integer.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 15",
			"S contains only characters ('I', 'V', 'X', 'L', 'C', 'D', 'M')",
			"The integer value is guaranteed to be in the range [1, 3999]."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2007);
			const tcs = [];

			tcs.push(makeTc(1, "III", "3", true, "III = 3."));
			tcs.push(makeTc(2, "LVIII", "58", true, "L = 50, V = 5, III = 3."));
			tcs.push(makeTc(3, "MCMXCIV", "1994", true, "M = 1000, CM = 900, XC = 90, IV = 4."));

			const toRoman = (num: number): string => {
				const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
				const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
				let res = "";
				for (let i = 0; i < val.length; i++) {
					while (num >= val[i]) {
						num -= val[i];
						res += syms[i];
					}
				}
				return res;
			};

			const numbersToTest = [1, 4, 9, 40, 90, 400, 900, 3999, 10, 50, 100, 500, 1000];
			for (let i = 0; i < numbersToTest.length; i++) {
				const n = numbersToTest[i];
				tcs.push(makeTc(4 + i, toRoman(n), `${n}`));
			}

			let tcIdx = 4 + numbersToTest.length;
			while (tcIdx <= 100) {
				const n = rng.nextInt(1, 3999);
				tcs.push(makeTc(tcIdx, toRoman(n), `${n}`));
				tcIdx++;
			}

			return tcs;
		},
	},

	// 18. Astral Message Frequency Sort (Sort Characters by Frequency)
	{
		id: "astral-message-frequency-sort",
		title: "Astral Message Frequency Sort",
		difficulty: "Medium",
		category: "string",
		tags: ["string", "sorting"],
		description: "Sort characters in decreasing order based on the frequency of each character.",
		story: `<p>The SETI listening post intercepts an encrypted cosmic pulsar burst. The decryption protocol requires sorting the symbols in <b>decreasing order of frequency</b>. If two characters have identical frequency, sort them alphabetically.</p>`,
		task: "Given string S, sort its characters in decreasing order of frequency. Tie-break by ASCII alphabetical order.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print the sorted string.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S consists of lowercase English letters."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2008);
			const tcs = [];

			tcs.push(makeTc(1, "tree", "eert", true, "'e' appears twice. 'r' and 't' appear once each and are sorted alphabetically."));
			tcs.push(makeTc(2, "cccaaa", "aaaccc", true, "'a' and 'c' both appear 3 times; 'a' comes before 'c'."));
			tcs.push(makeTc(3, "Aabb", "bbaA", true, "Frequency order."));

			const freqSort = (s: string): string => {
				const map: Record<string, number> = {};
				for (const c of s) map[c] = (map[c] || 0) + 1;
				const unique = Object.keys(map).sort((a, b) => {
					if (map[b] !== map[a]) return map[b] - map[a];
					return a.localeCompare(b);
				});
				let res = "";
				for (const c of unique) res += c.repeat(map[c]);
				return res;
			};

			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(5, 50);
				const s = rng.nextString(len, "abcdefghijklmn");
				tcs.push(makeTc(i, s, freqSort(s)));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(60, 150);
				const s = rng.nextString(len, "abcdefghijklmnopqrstuvwxyz");
				tcs.push(makeTc(i, s, freqSort(s)));
			}

			return tcs;
		},
	},

	// 19. The Goblin's Word Pattern (Bijection Pattern Matching)
	{
		id: "the-goblins-word-pattern",
		title: "The Goblin's Word Pattern",
		difficulty: "Easy",
		category: "string",
		tags: ["string", "hash-table"],
		description: "Determine if a string of words follows the exact bijection pattern of characters.",
		story: `<p>In the Misty Hills, goblin drums beat out a rhythmic pattern of symbols (e.g. <code>abba</code>) accompanied by chanted spoken words (e.g. <code>dog cat cat dog</code>). To authenticate the message, there must exist a strict one-to-one bijection between each pattern character and non-empty word.</p>`,
		task: "Given pattern string P and word string S, print 'YES' if S follows pattern P, or 'NO' otherwise.",
		inputFormat: `<p>The first line contains pattern string <code>P</code>.</p>
<p>The second line contains words string <code>S</code> separated by spaces.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= length of P <= 3000",
			"1 <= length of S <= 30000",
			"P contains lowercase letters; S contains lowercase words separated by single spaces."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2009);
			const tcs = [];

			tcs.push(makeTc(1, "abba\ndog cat cat dog", "YES", true, "'a' maps to 'dog', 'b' maps to 'cat'."));
			tcs.push(makeTc(2, "abba\ndog cat cat fish", "NO", true, "'a' maps to both 'dog' and 'fish'."));
			tcs.push(makeTc(3, "aaaa\ndog cat cat dog", "NO", true, "Pattern 'a' cannot map to distinct words."));

			const wordPattern = (pattern: string, s: string): boolean => {
				const words = s.split(" ");
				if (pattern.length !== words.length) return false;
				const p2w = new Map<string, string>();
				const w2p = new Map<string, string>();
				for (let i = 0; i < pattern.length; i++) {
					const p = pattern[i];
					const w = words[i];
					if (p2w.has(p) && p2w.get(p) !== w) return false;
					if (w2p.has(w) && w2p.get(w) !== p) return false;
					p2w.set(p, w);
					w2p.set(w, p);
				}
				return true;
			};

			const vocab = ["dragon", "elf", "dwarf", "goblin", "orc", "wizard", "knight"];
			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(3, 50);
				const p = rng.nextString(len, "abcde");
				let words: string[];
				if (i % 2 === 0) {
					// build valid
					const map: Record<string, string> = {};
					const used = new Set<string>();
					for (const ch of p) {
						if (!map[ch]) {
							const w = vocab.find((v) => !used.has(v)) || rng.nextString(4);
							map[ch] = w;
							used.add(w);
						}
					}
					words = p.split("").map((ch) => map[ch]);
				} else {
					words = [];
					for (let k = 0; k < len; k++) words.push(rng.choice(vocab));
				}
				const s = words.join(" ");
				tcs.push(makeTc(i, `${p}\n${s}`, wordPattern(p, s) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(40, 100);
				const p = rng.nextString(len, "abcdefg");
				const words: string[] = [];
				for (let k = 0; k < len; k++) words.push(rng.choice(vocab));
				const s = words.join(" ");
				tcs.push(makeTc(i, `${p}\n${s}`, wordPattern(p, s) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 20. The Forbidden Palindromic Inscription (Longest Palindromic Substring)
	{
		id: "the-forbidden-palindromic-inscription",
		title: "The Forbidden Palindromic Inscription",
		difficulty: "Medium",
		category: "string",
		tags: ["string", "dynamic-programming"],
		description: "Find the maximum length of a contiguous palindromic substring.",
		story: `<p>A sealed grimoire in the Forbidden Library of Dalaran requires deciphering the central palindromic incantation. Find the <b>length</b> of the longest contiguous substring that reads identically forward and backward.</p>`,
		task: "Given string S, output the length of the longest contiguous palindromic substring.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print a single integer: length of the longest palindromic substring.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 3000",
			"S consists of lowercase English letters."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2010);
			const tcs = [];

			tcs.push(makeTc(1, "babad", "3", true, "Longest palindromic substring is 'bab' or 'aba', length 3."));
			tcs.push(makeTc(2, "cbbd", "2", true, "'bb' has length 2."));
			tcs.push(makeTc(3, "a", "1", true, "Single character has length 1."));

			const longestPal = (s: string): number => {
				let maxLen = 0;
				for (let i = 0; i < s.length; i++) {
					// Odd
					let l = i, r = i;
					while (l >= 0 && r < s.length && s[l] === s[r]) {
						maxLen = Math.max(maxLen, r - l + 1);
						l--;
						r++;
					}
					// Even
					l = i;
					r = i + 1;
					while (l >= 0 && r < s.length && s[l] === s[r]) {
						maxLen = Math.max(maxLen, r - l + 1);
						l--;
						r++;
					}
				}
				return maxLen;
			};

			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(5, 300);
				let s = rng.nextString(len, "abcde");
				// Sometimes insert big palindrome in the middle
				if (i % 3 === 0) {
					const half = rng.nextString(rng.nextInt(10, 50), "abc");
					const p = half + half.split("").reverse().join("");
					const pos = rng.nextInt(0, s.length);
					s = s.slice(0, pos) + p + s.slice(pos);
				}
				tcs.push(makeTc(i, s, `${longestPal(s)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(50, 120);
				const s = rng.nextString(len, "abcdef");
				tcs.push(makeTc(i, s, `${longestPal(s)}`));
			}

			return tcs;
		},
	},
];
