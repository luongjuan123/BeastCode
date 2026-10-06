import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const dpProblems: ProblemDefinition[] = [
	// 81. The Archmage's Climbing Steps (Climbing Stairs DP)
	{
		id: "the-archmages-climbing-steps",
		title: "The Archmage's Climbing Steps",
		difficulty: "Easy",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "math"],
		description: "Find the number of distinct ways to climb an N-step tower taking 1 or 2 steps at a time mod 10^9+7.",
		story: `<p>The Spire of Whispers has <code>N</code> steps. Each stride, an archmage can ascend either <code>1</code> step or <code>2</code> steps. To predict the mystical resonance of the climb, compute the total number of distinct ways to reach the top modulo <code>10^9 + 7</code>.</p>`,
		task: "Return the number of distinct ways to reach the N-th step modulo 1,000,000,007.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print the number of ways modulo 10^9+7.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10001);
			const tcs = [];
			const MOD = 1000000007;

			tcs.push(makeTc(1, "2", "2", true, "1 step + 1 step, or 2 steps."));
			tcs.push(makeTc(2, "3", "3", true, "1+1+1, 1+2, 2+1."));
			tcs.push(makeTc(3, "4", "5", true, "5 distinct combinations."));

			const climbStairs = (n: number): number => {
				if (n <= 2) return n;
				let a = 1;
				let b = 2;
				for (let i = 3; i <= n; i++) {
					const c = (a + b) % MOD;
					a = b;
					b = c;
				}
				return b;
			};

			for (let i = 4; i <= 60; i++) {
				const n = rng.nextInt(5, 50);
				tcs.push(makeTc(i, n.toString(), climbStairs(n).toString()));
			}

			for (let i = 61; i <= 100; i++) {
				const n = rng.nextInt(501, 100000);
				tcs.push(makeTc(i, n.toString(), climbStairs(n).toString()));
			}

			return tcs;
		},
	},

	// 82. The Dragon Vault Coin Combinations (Coin Change II)
	{
		id: "the-dragon-vault-coin-combinations",
		title: "The Dragon Vault Coin Combinations",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "knapsack"],
		description: "Count the number of distinct combinations of coins that make up a target sum S.",
		story: `<p>A sleeping dragon hoards coins in <code>N</code> distinct denominations. A merchant wants to assemble an exact payment of sum <code>S</code> using any number of these coins. Order of coins does not matter.</p>`,
		task: "Compute the number of distinct combinations that make up sum S. Assume an infinite supply of each coin denomination.",
		inputFormat: `<p>The first line contains integers <code>N</code> (number of denominations) and <code>S</code> (target amount).</p>
<p>The second line contains <code>N</code> space-separated distinct integers <code>coins[0] ... coins[N-1]</code>.</p>`,
		outputFormat: `<p>Print the total number of combinations.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"0 <= S <= 5000",
			"1 <= coins[i] <= 5000"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10002);
			const tcs = [];

			tcs.push(makeTc(1, "3 5\n1 2 5", "4", true, "5=5, 5=2+2+1, 5=2+1+1+1, 5=1+1+1+1+1 (4 ways)."));
			tcs.push(makeTc(2, "1 3\n2", "0", true, "Target 3 cannot be formed using only denomination 2."));
			tcs.push(makeTc(3, "1 0\n10", "1", true, "Target 0 has 1 combination (empty set)."));

			const change = (amount: number, coins: number[]): string => {
				const dp: bigint[] = new Array(amount + 1).fill(0n);
				dp[0] = 1n;
				for (const coin of coins) {
					for (let i = coin; i <= amount; i++) {
						dp[i] += dp[i - coin];
					}
				}
				return dp[amount].toString();
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(2, 8);
				const s = rng.nextInt(1, 300);
				const coinsSet = new Set<number>();
				while (coinsSet.size < n) {
					coinsSet.add(rng.nextInt(1, 30));
				}
				const coins = Array.from(coinsSet);
				const ans = change(s, coins);
				tcs.push(makeTc(i, `${n} ${s}\n${coins.join(" ")}`, ans));
			}

			return tcs;
		},
	},

	// 83. The Vault of the Dwarven King (0/1 Knapsack)
	{
		id: "the-vault-of-the-dwarven-king",
		title: "The Vault of the Dwarven King",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "knapsack"],
		description: "Select items within a weight capacity W to maximize the total value collected.",
		story: `<p>In the ruins of Karak-Vorn, an explorer finds <code>N</code> relics. The <code>i</code>-th relic has weight <code>W[i]</code> and monetary value <code>V[i]</code>. The explorer's enchanted rucksack can carry at most weight <code>C</code>.</p>`,
		task: "Determine the maximum value of relics the explorer can carry without exceeding capacity C.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>C</code>.</p>
<p>The second line contains <code>N</code> space-separated integers (weights).</p>
<p>The third line contains <code>N</code> space-separated integers (values).</p>`,
		outputFormat: `<p>Print the maximum achievable value.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 300",
			"1 <= C <= 2000",
			"1 <= W[i] <= 2000",
			"1 <= V[i] <= 10^5"
		]),
		points: 160,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10003);
			const tcs = [];

			tcs.push(makeTc(1, "3 50\n10 20 30\n60 100 120", "220", true, "Take items with weights 20 and 30 for value 100 + 120 = 220."));
			tcs.push(makeTc(2, "1 10\n15\n100", "0", true, "Single item too heavy for capacity."));
			tcs.push(makeTc(3, "2 10\n5 5\n40 50", "90", true, "Take both items."));

			const knapsack = (N: number, C: number, weights: number[], values: number[]): number => {
				const dp = new Array(C + 1).fill(0);
				for (let i = 0; i < N; i++) {
					const w = weights[i];
					const v = values[i];
					for (let cap = C; cap >= w; cap--) {
						dp[cap] = Math.max(dp[cap], dp[cap - w] + v);
					}
				}
				return dp[C];
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const c = rng.nextInt(20, 500);
				const weights = rng.intArray(n, 1, 100);
				const values = rng.intArray(n, 1, 500);
				const ans = knapsack(n, c, weights, values);
				tcs.push(makeTc(i, `${n} ${c}\n${weights.join(" ")}\n${values.join(" ")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 84. The Longest Ascension of Stars (Longest Increasing Subsequence)
	{
		id: "the-longest-ascension-of-stars",
		title: "The Longest Ascension of Stars",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "binary-search"],
		description: "Find the length of the longest strictly increasing subsequence in an array of star magnitudes.",
		story: `<p>Star charts depict <code>N</code> celestial bodies with stellar luminance <code>nums[0] ... nums[N-1]</code>. An astronomer seeks the longest sequence of stars whose brightness strictly increases in temporal observation order.</p>`,
		task: "Return the length of the longest strictly increasing subsequence (LIS).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the integer length of the LIS.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 2500",
			"-10^4 <= nums[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10004);
			const tcs = [];

			tcs.push(makeTc(1, "8\n10 9 2 5 3 7 101 18", "4", true, "LIS is [2, 3, 7, 101] or [2, 5, 7, 101] of length 4."));
			tcs.push(makeTc(2, "6\n0 1 0 3 2 3", "4", true, "LIS is [0, 1, 2, 3] of length 4."));
			tcs.push(makeTc(3, "7\n7 7 7 7 7 7 7", "1", true, "All equal, strictly increasing length is 1."));

			const lengthOfLIS = (nums: number[]): number => {
				const tails: number[] = [];
				for (const x of nums) {
					let l = 0, r = tails.length;
					while (l < r) {
						const mid = (l + r) >> 1;
						if (tails[mid] < x) l = mid + 1;
						else r = mid;
					}
					if (l === tails.length) tails.push(x);
					else tails[l] = x;
				}
				return tails.length;
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const nums = rng.intArray(n, -500, 500);
				const ans = lengthOfLIS(nums);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 85. The Scribe's Edit Scrolls (Edit Distance / Levenshtein)
	{
		id: "the-scribes-edit-scrolls",
		title: "The Scribe's Edit Scrolls",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "string"],
		description: "Compute the minimum number of single-character operations to transform word1 into word2.",
		story: `<p>In the Great Library of Alexandria, an ancient scribe must correct corrupted codices. Allowed operations on a word are: <b>insert</b> a character, <b>delete</b> a character, or <b>replace</b> a character. Each operation takes 1 unit of mana.</p>`,
		task: "Return the minimum number of operations required to convert word1 to word2.",
		inputFormat: `<p>The first line contains string <code>word1</code>.</p>
<p>The second line contains string <code>word2</code>.</p>`,
		outputFormat: `<p>Print the minimum operations.</p>`,
		constraints: formatConstraints([
			"0 <= word1.length, word2.length <= 500",
			"word1 and word2 consist of lowercase English letters"
		]),
		points: 160,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10005);
			const tcs = [];

			tcs.push(makeTc(1, "horse\nros", "3", true, "horse -> rorse (replace 'h' with 'r') -> rose (remove 'r') -> ros (remove 'e')."));
			tcs.push(makeTc(2, "intention\nexecution", "5", true, "5 edits: delete 'i', replace 'n' with 'e', replace 't' with 'x', replace 'e' with 'c', insert 'u'."));
			tcs.push(makeTc(3, "cat\ncat", "0", true, "Identical words require 0 edits."));

			const minDistance = (w1: string, w2: string): number => {
				const m = w1.length, n = w2.length;
				const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
				for (let i = 0; i <= m; i++) dp[i][0] = i;
				for (let j = 0; j <= n; j++) dp[0][j] = j;

				for (let i = 1; i <= m; i++) {
					for (let j = 1; j <= n; j++) {
						if (w1[i - 1] === w2[j - 1]) {
							dp[i][j] = dp[i - 1][j - 1];
						} else {
							dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
						}
					}
				}
				return dp[m][n];
			};

			for (let i = 4; i <= 100; i++) {
				const len1 = rng.nextInt(3, 40);
				const len2 = rng.nextInt(3, 40);
				const w1 = rng.nextString(len1, "abcdefghi");
				const w2 = rng.nextString(len2, "abcdefghi");
				const ans = minDistance(w1, w2);
				tcs.push(makeTc(i, `${w1}\n${w2}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 86. The Wandering Monk's Paths (Unique Paths Modulo 10^9+7)
	{
		id: "the-wandering-monks-paths",
		title: "The Wandering Monk's Paths",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "math", "combinatorics"],
		description: "Compute the number of unique paths on an M x N grid moving only right or down modulo 10^9+7.",
		story: `<p>A meditating pilgrim travels from the Northwest mountain peak <code>(0,0)</code> to the Southeast sanctuary <code>(M-1, N-1)</code> on an <code>M &times; N</code> landscape. At each junction, the monk may only step <b>right</b> or <b>down</b>.</p>`,
		task: "Find the total number of unique paths modulo 1,000,000,007.",
		inputFormat: `<p>A single line containing integers <code>M</code> and <code>N</code>.</p>`,
		outputFormat: `<p>Print the number of paths modulo 10^9+7.</p>`,
		constraints: formatConstraints([
			"1 <= M, N <= 1000"
		]),
		points: 130,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10006);
			const tcs = [];
			const MOD = 1000000007;

			tcs.push(makeTc(1, "3 7", "28", true, "On a 3x7 grid there are 28 unique routes."));
			tcs.push(makeTc(2, "3 2", "3", true, "Down-Right-Down, Down-Down-Right, Right-Down-Down."));
			tcs.push(makeTc(3, "1 1", "1", true, "Single cell, 1 path."));

			const uniquePaths = (m: number, n: number): number => {
				const dp = new Array(n).fill(1);
				for (let i = 1; i < m; i++) {
					for (let j = 1; j < n; j++) {
						dp[j] = (dp[j] + dp[j - 1]) % MOD;
					}
				}
				return dp[n - 1];
			};

			for (let i = 4; i <= 100; i++) {
				const m = rng.nextInt(2, 400);
				const n = rng.nextInt(2, 400);
				const ans = uniquePaths(m, n);
				tcs.push(makeTc(i, `${m} ${n}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 87. Decoding the Oracle Prophecy (Decode Ways)
	{
		id: "decoding-the-oracle-prophecy",
		title: "Decoding the Oracle Prophecy",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "string"],
		description: "Find the number of ways to decode a digit string where '1'->'A', ..., '26'->'Z'.",
		story: `<p>The Oracle of Delphi speaks prophecies in encoded numerical sequences. Letters <code>'A'</code> through <code>'Z'</code> are mapped to <code>'1'</code> through <code>'26'</code>. Given a message string <code>S</code> of digits, determine how many valid English alphabetic words it could represent.</p>`,
		task: "Return the number of ways to decode S. If impossible to decode, return 0.",
		inputFormat: `<p>A single line containing digit string <code>S</code>.</p>`,
		outputFormat: `<p>Print the total number of ways to decode.</p>`,
		constraints: formatConstraints([
			"1 <= S.length <= 100",
			"S contains only digits"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10007);
			const tcs = [];

			tcs.push(makeTc(1, "12", "2", true, "Decoded as 'AB' (1, 2) or 'L' (12)."));
			tcs.push(makeTc(2, "226", "3", true, "Decoded as 'BZ' (2, 26), 'VF' (22, 6), or 'BBF' (2, 2, 6)."));
			tcs.push(makeTc(3, "06", "0", true, "Leading zeros are invalid."));

			const numDecodings = (s: string): number => {
				if (!s || s[0] === "0") return 0;
				const n = s.length;
				const dp = new Array(n + 1).fill(0);
				dp[0] = 1;
				dp[1] = 1;

				for (let i = 2; i <= n; i++) {
					const oneDigit = parseInt(s.slice(i - 1, i), 10);
					const twoDigits = parseInt(s.slice(i - 2, i), 10);
					if (oneDigit >= 1 && oneDigit <= 9) dp[i] += dp[i - 1];
					if (twoDigits >= 10 && twoDigits <= 26) dp[i] += dp[i - 2];
				}
				return dp[n];
			};

			for (let i = 4; i <= 100; i++) {
				const len = rng.nextInt(3, 30);
				let str = "";
				for (let j = 0; j < len; j++) {
					// Bias towards valid digits 1-9 with occasional 0
					str += rng.nextInt(1, 100) < 15 ? "0" : rng.nextInt(1, 9).toString();
				}
				const ans = numDecodings(str);
				tcs.push(makeTc(i, str, ans.toString()));
			}

			return tcs;
		},
	},

	// 88. The Empress' Maximal Square (Maximal Square in 2D Matrix)
	{
		id: "the-empress-maximal-square",
		title: "The Empress' Maximal Square",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "matrix"],
		description: "Find the area of the largest square consisting solely of '1's in a binary matrix.",
		story: `<p>The imperial palace courtyard is an <code>R &times; C</code> matrix paved with marble tiles (<code>1</code>) and gravel tiles (<code>0</code>). The Empress wishes to pitch a square ceremonial pavilion containing exclusively marble tiles.</p>`,
		task: "Find and return the area of the largest square of 1s in the matrix.",
		inputFormat: `<p>The first line contains integers <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain a string of <code>C</code> characters (<code>'0'</code> or <code>'1'</code>).</p>`,
		outputFormat: `<p>Print the maximum square area.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 100",
			"Matrix contains only '0' and '1'"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10008);
			const tcs = [];

			tcs.push(makeTc(1, "4 5\n10100\n10111\n11111\n10010", "4", true, "Maximal square of 1s is 2x2, area = 4."));
			tcs.push(makeTc(2, "2 2\n01\n10", "1", true, "Maximal square is 1x1, area = 1."));
			tcs.push(makeTc(3, "1 1\n0", "0", true, "No 1s, area = 0."));

			const maximalSquare = (R: number, C: number, matrix: string[][]): number => {
				const dp: number[][] = Array.from({ length: R }, () => new Array(C).fill(0));
				let maxSide = 0;
				for (let r = 0; r < R; r++) {
					for (let c = 0; c < C; c++) {
						if (matrix[r][c] === "1") {
							if (r === 0 || c === 0) {
								dp[r][c] = 1;
							} else {
								dp[r][c] = 1 + Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]);
							}
							maxSide = Math.max(maxSide, dp[r][c]);
						}
					}
				}
				return maxSide * maxSide;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(3, 30);
				const C = rng.nextInt(3, 30);
				const oneRate = rng.nextInt(30, 80);
				const mat: string[] = [];
				for (let r = 0; r < R; r++) {
					let row = "";
					for (let c = 0; c < C; c++) {
						row += rng.nextInt(1, 100) <= oneRate ? "1" : "0";
					}
					mat.push(row);
				}
				const grid = mat.map((r) => r.split(""));
				const ans = maximalSquare(R, C, grid);
				tcs.push(makeTc(i, `${R} ${C}\n${mat.join("\n")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 89. The Cunning Thief of Baghdad (House Robber DP)
	{
		id: "the-cunning-thief-of-baghdad",
		title: "The Cunning Thief of Baghdad",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "array"],
		description: "Determine the maximum amount of money you can rob tonight without alerting adjacent security systems.",
		story: `<p>A master thief plans to rob houses along a bazaar street. Each house has a hidden amount of gold <code>nums[i]</code>. Adjacent houses have connected security alarms and will alert the guard if two adjacent houses are burglarized on the same night.</p>`,
		task: "Return the maximum amount of money you can rob tonight without alerting the police.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the maximum loot.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= nums[i] <= 1000"
		]),
		points: 120,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10009);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2 3 1", "4", true, "Rob house 1 (money 1) and house 3 (money 3). Total = 4."));
			tcs.push(makeTc(2, "5\n2 7 9 3 1", "12", true, "Rob house 1 (2), house 3 (9), house 5 (1). Total = 12."));
			tcs.push(makeTc(3, "1\n50", "50", true, "Single house."));

			const rob = (nums: number[]): number => {
				let rob1 = 0;
				let rob2 = 0;
				for (const n of nums) {
					const temp = Math.max(n + rob1, rob2);
					rob1 = rob2;
					rob2 = temp;
				}
				return rob2;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const nums = rng.intArray(n, 0, 500);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, rob(nums).toString()));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const nums = rng.intArray(n, 0, 1000);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, rob(nums).toString()));
			}

			return tcs;
		},
	},

	// 90. The Ancient Lexicon Word Break (Word Break DP)
	{
		id: "the-ancient-lexicon-word-break",
		title: "The Ancient Lexicon Word Break",
		difficulty: "Medium",
		category: "dynamic-programming",
		tags: ["dynamic-programming", "string", "trie"],
		description: "Determine if a continuous string S can be partitioned into words from a given dictionary.",
		story: `<p>In ancient runic inscriptions, spaces were not carved between words. An epigrapher receives an unspaced inscription <code>S</code> and a dictionary of allowed words <code>wordDict</code>. They must verify if the inscription is a concatenation of dictionary words.</p>`,
		task: "Print 'YES' if string S can be segmented into words from wordDict, or 'NO' otherwise.",
		inputFormat: `<p>The first line contains string <code>S</code>.</p>
<p>The second line contains integer <code>K</code> (number of dictionary words).</p>
<p>The third line contains <code>K</code> space-separated words.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= S.length <= 300",
			"1 <= K <= 1000",
			"1 <= wordDict[i].length <= 20",
			"S and wordDict[i] consist of lowercase English letters"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(10010);
			const tcs = [];

			tcs.push(makeTc(1, "leetcode\n2\nleet code", "YES", true, "'leetcode' can be segmented as 'leet code'."));
			tcs.push(makeTc(2, "applepenapple\n2\napple pen", "YES", true, "'applepenapple' segmented as 'apple pen apple'."));
			tcs.push(makeTc(3, "catsandog\n5\ncats dog sand and cat", "NO", true, "'og' is not in dictionary."));

			const wordBreak = (s: string, dict: string[]): boolean => {
				const wordSet = new Set(dict);
				const dp = new Array(s.length + 1).fill(false);
				dp[0] = true;

				for (let i = 1; i <= s.length; i++) {
					for (let j = 0; j < i; j++) {
						if (dp[j] && wordSet.has(s.slice(j, i))) {
							dp[i] = true;
							break;
						}
					}
				}
				return dp[s.length];
			};

			const pool = ["cat", "dog", "sand", "and", "apple", "pen", "leet", "code", "star", "ship", "sea", "son", "sun", "war", "ring"];

			for (let i = 4; i <= 100; i++) {
				const dictSize = rng.nextInt(4, 10);
				const dict = rng.shuffle(pool).slice(0, dictSize);
				let s = "";
				const valid = rng.nextInt(1, 100) > 40;
				if (valid) {
					const wordCount = rng.nextInt(2, 6);
					for (let w = 0; w < wordCount; w++) {
						s += rng.choice(dict);
					}
				} else {
					s = rng.nextString(rng.nextInt(6, 20), "abcdefghijklmnopqrstuvwxyz");
				}

				const ans = wordBreak(s, dict) ? "YES" : "NO";
				tcs.push(makeTc(i, `${s}\n${dict.length}\n${dict.join(" ")}`, ans));
			}

			return tcs;
		},
	},
];
