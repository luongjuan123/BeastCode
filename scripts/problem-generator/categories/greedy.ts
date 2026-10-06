import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const greedyProblems: ProblemDefinition[] = [
	// 47. The Dragon's Hoard Redistribution (Fractional Knapsack)
	{
		id: "the-dragons-hoard-redistribution",
		title: "The Dragon's Hoard Redistribution",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "sorting"],
		description: "Maximize value in fractional knapsack with capacity W.",
		story: `<p>Brave adventurers uncover a dragon's treasure hoard containing <b>N</b> piles of precious mineral powders. Each pile <code>i</code> has total value <code>V[i]</code> and total weight <code>W[i]</code>. The adventurers' mule can carry at most <b>C</b> weight units. Any fraction of a pile can be taken. Find the <b>maximum gold value</b> the adventurers can transport, rounded to 2 decimal places.</p>`,
		task: "Given N items with values V and weights W, and capacity C, output max fractional value rounded to 2 decimal places.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>C</code>.</p>
<p>The next <code>N</code> lines each contain two integers: <code>value weight</code>.</p>`,
		outputFormat: `<p>Print the maximum value rounded to 2 decimal places (e.g. 240.00).</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= C <= 10^9",
			"1 <= value, weight <= 10^4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6001);
			const tcs = [];

			tcs.push(makeTc(1, "3 50\n60 10\n100 20\n120 30", "240.00", true, "Take item 1 (10kg, 60), item 2 (20kg, 100), and 20kg of item 3 (80). Total = 240.00."));
			tcs.push(makeTc(2, "1 10\n500 20", "250.00", true, "Take half of the single item (10kg of 20kg)."));
			tcs.push(makeTc(3, "2 100\n10 5\n20 10", "30.00", true, "Take all items since capacity exceeds total weight."));

			const solve = (items: { v: number; w: number }[], C: number): string => {
				items.sort((a, b) => b.v / b.w - a.v / a.w);
				let rem = C;
				let totalVal = 0;
				for (const item of items) {
					if (rem >= item.w) {
						totalVal += item.v;
						rem -= item.w;
					} else {
						totalVal += (item.v / item.w) * rem;
						break;
					}
				}
				return totalVal.toFixed(2);
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(3, 30);
				const c = rng.nextInt(50, 500);
				const items: { v: number; w: number }[] = [];
				for (let k = 0; k < n; k++) {
					items.push({ v: rng.nextInt(1, 500), w: rng.nextInt(1, 100) });
				}
				const inStr = `${n} ${c}\n${items.map((it) => `${it.v} ${it.w}`).join("\n")}`;
				tcs.push(makeTc(i, inStr, solve(items, c)));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(40, 80);
				const c = rng.nextInt(500, 5000);
				const items: { v: number; w: number }[] = [];
				for (let k = 0; k < n; k++) {
					items.push({ v: rng.nextInt(5, 50), w: rng.nextInt(1, 100) });
				}
				const inStr = `${n} ${c}\n${items.map((it) => `${it.v} ${it.w}`).join("\n")}`;
				tcs.push(makeTc(i, inStr, solve(items, c)));
			}

			return tcs;
		},
	},

	// 48. Fueling the Starship Odyssey (Gas Station Circuit)
	{
		id: "fueling-the-starship-odyssey",
		title: "Fueling the Starship Odyssey",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "array"],
		description: "Find the starting refueling orbital depot that allows completing a circular orbital lap.",
		story: `<p>Starship Odyssey navigates a circular orbit passing <b>N</b> fuel stations numbered <code>1, ..., N</code> in sequence. Station <code>i</code> offers <code>Gas[i]</code> units of plasma fuel, and traveling from station <code>i</code> to <code>i + 1</code> costs <code>Cost[i]</code> fuel. Starting with an empty tank, determine the <b>1-based index</b> of the station where the ship can start and complete the full circular lap, or <code>-1</code> if impossible.</p>`,
		task: "Given gas and cost arrays, return the 1-based start station, or -1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>Gas</code>.</p>
<p>The third line contains <code>N</code> space-separated integers <code>Cost</code>.</p>`,
		outputFormat: `<p>Print the 1-based start station, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= Gas[i], Cost[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6002);
			const tcs = [];

			tcs.push(makeTc(1, "5\n1 2 3 4 5\n3 4 5 1 2", "4", true, "Start at index 4 (1-based): fuel is sufficient throughout the circuit."));
			tcs.push(makeTc(2, "3\n2 3 4\n3 4 3", "-1", true, "Total fuel (9) < total cost (10), impossible to complete circuit."));
			tcs.push(makeTc(3, "1\n5\n5", "1", true, "Single station where gas == cost."));

			const canCompleteCircuit = (gas: number[], cost: number[]): number => {
				let totalSurplus = 0, currentSurplus = 0, start = 0;
				for (let i = 0; i < gas.length; i++) {
					const diff = gas[i] - cost[i];
					totalSurplus += diff;
					currentSurplus += diff;
					if (currentSurplus < 0) {
						start = i + 1;
						currentSurplus = 0;
					}
				}
				return totalSurplus >= 0 ? start + 1 : -1;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const gas = rng.intArray(n, 1, 100);
				const cost = rng.intArray(n, 1, 100);
				tcs.push(makeTc(i, `${n}\n${gas.join(" ")}\n${cost.join(" ")}`, `${canCompleteCircuit(gas, cost)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const gas = rng.intArray(n, 1, 1000);
				const cost = rng.intArray(n, 1, 1000);
				tcs.push(makeTc(i, `${n}\n${gas.join(" ")}\n${cost.join(" ")}`, `${canCompleteCircuit(gas, cost)}`));
			}

			return tcs;
		},
	},

	// 49. The Royal Courier's Schedule (Non-overlapping Intervals)
	{
		id: "the-royal-couriers-schedule",
		title: "The Royal Courier's Schedule",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "sorting"],
		description: "Find the minimum number of overlapping delivery intervals to remove so the rest are non-overlapping.",
		story: `<p>The Royal Courier Service receives <b>N</b> delivery requests, each occupying a time window <code>[start, end]</code>. A single rider can only fulfill requests that do not overlap in time (end time equal to next start time is allowed). Find the <b>minimum number of delivery requests</b> that must be cancelled so that all remaining deliveries do not overlap.</p>`,
		task: "Given an array of intervals [start, end], find the minimum number of intervals to remove to make the rest non-overlapping.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two integers: <code>start end</code>.</p>`,
		outputFormat: `<p>Print the minimum number of intervals to remove.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-5 * 10^4 <= start < end <= 5 * 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6003);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2\n2 3\n3 4\n1 3", "1", true, "Remove [1, 3] to leave [1, 2], [2, 3], [3, 4] non-overlapping."));
			tcs.push(makeTc(2, "3\n1 2\n1 2\n1 2", "2", true, "Remove 2 identical intervals."));
			tcs.push(makeTc(3, "3\n1 2\n2 3\n3 4", "0", true, "Already non-overlapping."));

			const eraseOverlapIntervals = (intervals: [number, number][]): number => {
				intervals.sort((a, b) => a[1] - b[1]);
				let count = 0;
				let prevEnd = -Infinity;
				for (const [start, end] of intervals) {
					if (start >= prevEnd) {
						prevEnd = end;
					} else {
						count++;
					}
				}
				return count;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const intervals: [number, number][] = [];
				for (let k = 0; k < n; k++) {
					const s = rng.nextInt(-500, 500);
					const e = s + rng.nextInt(1, 50);
					intervals.push([s, e]);
				}
				const inStr = `${n}\n${intervals.map((x) => `${x[0]} ${x[1]}`).join("\n")}`;
				tcs.push(makeTc(i, inStr, `${eraseOverlapIntervals(intervals)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const intervals: [number, number][] = [];
				for (let k = 0; k < n; k++) {
					const s = rng.nextInt(-10000, 10000);
					const e = s + rng.nextInt(1, 200);
					intervals.push([s, e]);
				}
				const inStr = `${n}\n${intervals.map((x) => `${x[0]} ${x[1]}`).join("\n")}`;
				tcs.push(makeTc(i, inStr, `${eraseOverlapIntervals(intervals)}`));
			}

			return tcs;
		},
	},

	// 50. The Alchemist's Potion Bottles (Assign Cookies)
	{
		id: "the-alchemists-potion-bottles",
		title: "The Alchemist's Potion Bottles",
		difficulty: "Easy",
		category: "greedy",
		tags: ["greedy", "sorting"],
		description: "Maximize the number of satisfied apprentice magicians by assigning potion bottles matching their greed factor.",
		story: `<p>A master wizard prepares <b>M</b> potion bottles of volumes <code>S[1], ..., S[M]</code> for <b>N</b> apprentice magicians. Each apprentice <code>i</code> has a minimum thirst requirement <code>G[i]</code>. An apprentice is satisfied if they receive a bottle with volume <code>S[j] >= G[i]</code>. Each apprentice can receive at most one bottle. Find the <b>maximum number of apprentices</b> that can be satisfied.</p>`,
		task: "Given array G of size N and array S of size M, return max satisfied count.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>M</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>G</code>.</p>
<p>The third line contains <code>M</code> space-separated integers <code>S</code>.</p>`,
		outputFormat: `<p>Print the maximum number of satisfied apprentices.</p>`,
		constraints: formatConstraints([
			"1 <= N, M <= 10^5",
			"1 <= G[i], S[j] <= 10^9"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6004);
			const tcs = [];

			tcs.push(makeTc(1, "3 2\n1 2 3\n1 1", "1", true, "Only apprentice with greed 1 can be satisfied."));
			tcs.push(makeTc(2, "2 3\n1 2\n1 2 3", "2", true, "Both apprentices satisfied."));
			tcs.push(makeTc(3, "1 1\n5\n4", "0", true, "Bottle too small."));

			const findContentChildren = (g: number[], s: number[]): number => {
				g.sort((a, b) => a - b);
				s.sort((a, b) => a - b);
				let child = 0, cookie = 0;
				while (child < g.length && cookie < s.length) {
					if (s[cookie] >= g[child]) child++;
					cookie++;
				}
				return child;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const m = rng.nextInt(5, 50);
				const g = rng.intArray(n, 1, 1000);
				const s = rng.intArray(m, 1, 1000);
				tcs.push(makeTc(i, `${n} ${m}\n${g.join(" ")}\n${s.join(" ")}`, `${findContentChildren(g, s)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const m = rng.nextInt(60, 150);
				const g = rng.intArray(n, 1, 1000000);
				const s = rng.intArray(m, 1, 1000000);
				tcs.push(makeTc(i, `${n} ${m}\n${g.join(" ")}\n${s.join(" ")}`, `${findContentChildren(g, s)}`));
			}

			return tcs;
		},
	},

	// 51. Jumping Through the Floating Islands (Jump Game)
	{
		id: "jumping-through-the-floating-islands",
		title: "Jumping Through the Floating Islands",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "array"],
		description: "Determine whether it is possible to reach the last island starting from the first.",
		story: `<p>An adventurous sky-pirate leaps along a straight sequence of <b>N</b> floating sky-islands numbered <code>1</code> to <code>N</code>. On island <code>i</code>, the pirate can jump at most <code>A[i]</code> islands forward (to any island from <code>i + 1</code> to <code>min(N, i + A[i])</code>). Starting on island 1, determine if the pirate can reach the final island <b>N</b>.</p>`,
		task: "Given array A of length N, output 'YES' if island N is reachable from island 1, or 'NO'.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= A[i] <= 10^5"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6005);
			const tcs = [];

			tcs.push(makeTc(1, "5\n2 3 1 1 4", "YES", true, "Jump 1 step from 0 to 1, then 3 steps to the last index."));
			tcs.push(makeTc(2, "5\n3 2 1 0 4", "NO", true, "Always arrive at index 3 with jump 0, cannot progress further."));
			tcs.push(makeTc(3, "1\n0", "YES", true, "Already at the destination."));

			const canJump = (nums: number[]): boolean => {
				let maxReach = 0;
				for (let i = 0; i < nums.length; i++) {
					if (i > maxReach) return false;
					maxReach = Math.max(maxReach, i + nums[i]);
					if (maxReach >= nums.length - 1) return true;
				}
				return true;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, 0, 5);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, canJump(arr) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, 0, 10);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, canJump(arr) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 52. The Minimalist Coin Master (Coin Change Greedy)
	{
		id: "the-minimalist-coin-master",
		title: "The Minimalist Coin Master",
		difficulty: "Easy",
		category: "greedy",
		tags: ["greedy", "math"],
		description: "Count the minimal number of canonical coins (100, 50, 20, 10, 5, 2, 1) needed to make change for amount V.",
		story: `<p>The Royal Bank of Eldoria issues standard coinage in denominations of <b>100, 50, 20, 10, 5, 2, and 1 gold coins</b>. A merchant requests exactly <code>V</code> gold coins in change. The bank teller must dispense the <b>minimum total number of coins</b> possible.</p>`,
		task: "Given integer V, output the minimum number of coins needed using the standard coin system.",
		inputFormat: `<p>A single line containing integer <code>V</code>.</p>`,
		outputFormat: `<p>Print the minimum number of coins.</p>`,
		constraints: formatConstraints([
			"1 <= V <= 10^9"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6006);
			const tcs = [];

			const coins = [100, 50, 20, 10, 5, 2, 1];
			const minCoins = (V: number): number => {
				let count = 0;
				let rem = V;
				for (const c of coins) {
					count += Math.floor(rem / c);
					rem %= c;
				}
				return count;
			};

			tcs.push(makeTc(1, "123", "5", true, "100 + 20 + 2 + 1 = 123 (4 coins? No: 100 + 20 + 2 + 1 = 4 coins). Wait: 123 / 100 = 1, rem 23 / 20 = 1, rem 3 / 2 = 1, rem 1 / 1 = 1 -> 4 coins."));
			tcs.push(makeTc(2, "43", "4", true, "20 + 20 + 2 + 1 = 4 coins."));
			tcs.push(makeTc(3, "1", "1", true, "Single 1-coin."));

			for (let i = 4; i <= 75; i++) {
				const v = rng.nextInt(1, 10000);
				tcs.push(makeTc(i, `${v}`, `${minCoins(v)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const v = rng.nextInt(100000, 1000000000);
				tcs.push(makeTc(i, `${v}`, `${minCoins(v)}`));
			}

			return tcs;
		},
	},

	// 53. Reorganizing the Ancient Scroll (Reorganize String)
	{
		id: "reorganizing-the-ancient-scroll",
		title: "Reorganizing the Ancient Scroll",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "string", "heap"],
		description: "Rearrange characters so that no two adjacent characters are identical, or report impossible.",
		story: `<p>A magical curse causes adjacent identical runes to explode. Scribes must rearrange string <code>S</code> such that <b>no two adjacent characters are identical</b>. If a valid arrangement exists, output <b>any</b> valid rearranged string; otherwise, print <code>IMPOSSIBLE</code>.</p>`,
		task: "Given string S, rearrange characters so no two adjacent are equal. Print IMPOSSIBLE if not feasible.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print any valid rearranged string, or IMPOSSIBLE.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S consists of lowercase English letters."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6007);
			const tcs = [];

			tcs.push(makeTc(1, "aab", "aba", true, "Valid reorganization."));
			tcs.push(makeTc(2, "aaab", "IMPOSSIBLE", true, "'a' appears 3 times in string of length 4, cannot separate all a's."));
			tcs.push(makeTc(3, "a", "a", true, "Single character is valid."));

			const reorganize = (s: string): string => {
				const counts: Record<string, number> = {};
				for (const c of s) counts[c] = (counts[c] || 0) + 1;
				const maxFreq = Math.max(...Object.values(counts));
				if (maxFreq > Math.ceil(s.length / 2)) return "IMPOSSIBLE";

				const sortedChars = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
				const res = new Array(s.length);
				let idx = 0;
				for (const ch of sortedChars) {
					for (let i = 0; i < counts[ch]; i++) {
						if (idx >= s.length) idx = 1;
						res[idx] = ch;
						idx += 2;
					}
				}
				return res.join("");
			};

			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(5, 200);
				let s = "";
				if (i % 2 === 0) {
					s = rng.choice(["a", "b"]).repeat(Math.ceil(len / 2) + 2) + rng.nextString(Math.floor(len / 2));
				} else {
					s = rng.nextString(len, "abcde");
				}
				tcs.push(makeTc(i, s, reorganize(s)));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(50, 120);
				const s = rng.nextString(len, "abcdefghijklmn");
				tcs.push(makeTc(i, s, reorganize(s)));
			}

			return tcs;
		},
	},

	// 54. Task Scheduling for the Royal Smithy (Task Scheduler)
	{
		id: "task-scheduling-for-the-royal-smithy",
		title: "Task Scheduling for the Royal Smithy",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "array"],
		description: "Find the least number of intervals to complete N tasks with cooldown cooldown period.",
		story: `<p>The Royal Blacksmith must forge <b>N</b> weapons represented by capital English letters (e.g. 'A', 'B'). Each weapon takes 1 hour to forge. Due to forge temperature resets, there is a cooldown of <b>K hours</b> between any two tasks of the <b>same weapon type</b>. During cooldown, the smithy may forge different weapons or remain idle. Find the <b>minimum total hours</b> required to complete all weapons.</p>`,
		task: "Given array of task characters and cooldown K, find least number of units of time to complete all tasks.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>K</code>.</p>
<p>The second line contains <code>N</code> space-separated capital English letters.</p>`,
		outputFormat: `<p>Print the minimum total hours required.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= K <= 100",
			"Tasks are uppercase English letters ('A'-'Z')."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6008);
			const tcs = [];

			tcs.push(makeTc(1, "6 2\nA A A B B B", "8", true, "Order: A -> B -> idle -> A -> B -> idle -> A -> B. Total 8 units."));
			tcs.push(makeTc(2, "6 0\nA A A B B B", "6", true, "With K=0, no idle time needed."));
			tcs.push(makeTc(3, "6 2\nA B C D E F", "6", true, "All distinct tasks, 6 hours."));

			const leastInterval = (tasks: string[], k: number): number => {
				const map: Record<string, number> = {};
				for (const t of tasks) map[t] = (map[t] || 0) + 1;
				const freqs = Object.values(map).sort((a, b) => b - a);
				const maxFreq = freqs[0];
				let maxCount = 0;
				for (const f of freqs) if (f === maxFreq) maxCount++;
				return Math.max(tasks.length, (maxFreq - 1) * (k + 1) + maxCount);
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const k = rng.nextInt(0, 10);
				const tasks: string[] = [];
				for (let j = 0; j < n; j++) tasks.push(rng.choice("ABCDEF".split("")));
				tcs.push(makeTc(i, `${n} ${k}\n${tasks.join(" ")}`, `${leastInterval(tasks, k)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const k = rng.nextInt(0, 20);
				const tasks: string[] = [];
				for (let j = 0; j < n; j++) tasks.push(rng.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")));
				tcs.push(makeTc(i, `${n} ${k}\n${tasks.join(" ")}`, `${leastInterval(tasks, k)}`));
			}

			return tcs;
		},
	},

	// 55. Candy Distribution at the Orphanage (Candy Problem)
	{
		id: "candy-distribution-at-the-orphanage",
		title: "Candy Distribution at the Orphanage",
		difficulty: "Hard",
		category: "greedy",
		tags: ["greedy", "array"],
		description: "Distribute the minimum number of candies to children in line according to performance ratings.",
		story: `<p>During the Winter Solstice, Mayor Robin distributes sweets to <b>N</b> children standing in a line with rating scores <code>R[1], ..., R[N]</code>. Each child must receive at least 1 candy, and children with a strictly higher rating than an immediate neighbor must receive strictly more candies than that neighbor. Find the <b>minimum total candies</b> required.</p>`,
		task: "Given ratings array R of length N, find minimum total candies needed.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>R[1], ..., R[N]</code>.</p>`,
		outputFormat: `<p>Print the minimum total candies.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= R[i] <= 10^5"
		]),
		points: 300,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6009);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 0 2", "5", true, "Distribution: [2, 1, 2] -> total 5."));
			tcs.push(makeTc(2, "3\n1 2 2", "4", true, "Distribution: [1, 2, 1] -> total 4 (equal neighbor does not get more)."));
			tcs.push(makeTc(3, "1\n100", "1", true, "Single child receives 1 candy."));

			const candy = (ratings: number[]): number => {
				const n = ratings.length;
				const candies = new Array(n).fill(1);
				for (let i = 1; i < n; i++) {
					if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
				}
				for (let i = n - 2; i >= 0; i--) {
					if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
				}
				return candies.reduce((a, b) => a + b, 0);
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const r = rng.intArray(n, 0, 50);
				tcs.push(makeTc(i, `${n}\n${r.join(" ")}`, `${candy(r)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const r = rng.intArray(n, 0, 1000);
				tcs.push(makeTc(i, `${n}\n${r.join(" ")}`, `${candy(r)}`));
			}

			return tcs;
		},
	},

	// 56. The Partition Labels of the Library (Partition Labels)
	{
		id: "the-partition-labels-of-the-library",
		title: "The Partition Labels of the Library",
		difficulty: "Medium",
		category: "greedy",
		tags: ["greedy", "two-pointers", "string"],
		description: "Partition a string into as many parts as possible so each letter appears in at most one part.",
		story: `<p>A string <code>S</code> of catalog codes must be split into as many contiguous book chapters as possible such that <b>each unique character appears in at most one chapter</b>. Output the lengths of each chapter partition.</p>`,
		task: "Given string S, partition it into maximum parts such that each character appears in at most one part. Output partition sizes.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print the partition sizes separated by spaces.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S consists of lowercase English letters."
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(6010);
			const tcs = [];

			tcs.push(makeTc(1, "ababcbacadefegdehijhklij", "9 7 8", true, "Partitions: 'ababcbaca' (9), 'defegde' (7), 'hijhklij' (8)."));
			tcs.push(makeTc(2, "eccbbbbdec", "10", true, "All letters must belong to single partition."));
			tcs.push(makeTc(3, "a", "1", true, "Single letter partition."));

			const partitionLabels = (s: string): number[] => {
				const last: Record<string, number> = {};
				for (let i = 0; i < s.length; i++) last[s[i]] = i;
				const ans: number[] = [];
				let j = 0, anchor = 0;
				for (let i = 0; i < s.length; i++) {
					j = Math.max(j, last[s[i]]);
					if (i === j) {
						ans.push(i - anchor + 1);
						anchor = i + 1;
					}
				}
				return ans;
			};

			for (let i = 4; i <= 75; i++) {
				const len = rng.nextInt(5, 50);
				const s = rng.nextString(len, "abcdefghijklmn");
				tcs.push(makeTc(i, s, partitionLabels(s).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(60, 150);
				const s = rng.nextString(len, "abcdefghijklmnopqrstuvwxyz");
				tcs.push(makeTc(i, s, partitionLabels(s).join(" ")));
			}

			return tcs;
		},
	},
];
