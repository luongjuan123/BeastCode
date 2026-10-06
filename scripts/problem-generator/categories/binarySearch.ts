import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const binarySearchProblems: ProblemDefinition[] = [
	// 39. Searching the Royal Archives (Classic Binary Search)
	{
		id: "searching-the-royal-archives",
		title: "Searching the Royal Archives",
		difficulty: "Easy",
		category: "binary-search",
		tags: ["binary-search", "array"],
		description: "Find the 1-based index of a target archive roll in a sorted array, or -1 if not found.",
		story: `<p>The Great Library of Alexandria stores <b>N</b> scrolls cataloged strictly by their integer identifier numbers in ascending order: <code>A[1] < A[2] < ... < A[N]</code>. Chief Librarian Hypatia must determine the <b>1-based position</b> of scroll <code>T</code>, or report <code>-1</code> if it does not exist.</p>`,
		task: "Given sorted array A of distinct integers and target T, output 1-based index of T, or -1.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>T</code>.</p>
<p>The second line contains <code>N</code> space-separated integers in ascending order.</p>`,
		outputFormat: `<p>Print the 1-based index of T, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i], T <= 10^9"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5001);
			const tcs = [];

			tcs.push(makeTc(1, "6 9\n-1 0 3 5 9 12", "5", true, "9 is at index 5."));
			tcs.push(makeTc(2, "6 2\n-1 0 3 5 9 12", "-1", true, "2 is not present."));
			tcs.push(makeTc(3, "1 5\n5", "1", true, "Single element matches target."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = Array.from(new Set(rng.intArray(n * 2, -1000, 1000))).sort((a, b) => a - b).slice(0, n);
				const present = i % 2 === 0;
				const target = present ? rng.choice(arr) : rng.nextInt(-1500, 1500);
				const idx = arr.indexOf(target);
				tcs.push(makeTc(i, `${arr.length} ${target}\n${arr.join(" ")}`, `${idx !== -1 ? idx + 1 : -1}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = Array.from(new Set(rng.intArray(n * 2, -1000000, 1000000))).sort((a, b) => a - b).slice(0, n);
				const present = i % 2 === 0;
				const target = present ? rng.choice(arr) : rng.nextInt(-1500000, 1500000);
				const idx = arr.indexOf(target);
				tcs.push(makeTc(i, `${arr.length} ${target}\n${arr.join(" ")}`, `${idx !== -1 ? idx + 1 : -1}`));
			}

			return tcs;
		},
	},

	// 40. The Deepest Mine Shaft (First and Last Position of Element)
	{
		id: "the-deepest-mine-shaft",
		title: "The Deepest Mine Shaft",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search", "array"],
		description: "Find the starting and ending 1-based positions of a target mineral value in a sorted array.",
		story: `<p>In the Mithril mines of Moria, core sample depths are recorded in non-decreasing order: <code>A[1] <= A[2] <= ... <= A[N]</code>. Mining surveyors must identify the <b>first</b> and <b>last</b> 1-based index containing mineral purity <code>T</code>. If <code>T</code> is absent, output <code>-1 -1</code>.</p>`,
		task: "Given sorted array A of length N and target T, output first and last 1-based index of T.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>T</code>.</p>
<p>The second line contains <code>N</code> space-separated integers in non-decreasing order.</p>`,
		outputFormat: `<p>Print two integers: <code>first last</code> (1-based), or <code>-1 -1</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i], T <= 10^9"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5002);
			const tcs = [];

			tcs.push(makeTc(1, "6 8\n5 7 7 8 8 10", "4 5", true, "8 appears from index 4 to 5."));
			tcs.push(makeTc(2, "6 6\n5 7 7 8 8 10", "-1 -1", true, "6 is not in the array."));
			tcs.push(makeTc(3, "1 0\n0", "1 1", true, "Single element match."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -100, 100).sort((a, b) => a - b);
				const target = i % 2 === 0 ? rng.choice(arr) : rng.nextInt(-200, 200);
				const first = arr.indexOf(target);
				const last = arr.lastIndexOf(target);
				const out = first !== -1 ? `${first + 1} ${last + 1}` : "-1 -1";
				tcs.push(makeTc(i, `${n} ${target}\n${arr.join(" ")}`, out));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -1000, 1000).sort((a, b) => a - b);
				const target = i % 2 === 0 ? rng.choice(arr) : rng.nextInt(-2000, 2000);
				const first = arr.indexOf(target);
				const last = arr.lastIndexOf(target);
				const out = first !== -1 ? `${first + 1} ${last + 1}` : "-1 -1";
				tcs.push(makeTc(i, `${n} ${target}\n${arr.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 41. Calibrating the Siege Catapult (Search in Rotated Sorted Array)
	{
		id: "calibrating-the-siege-catapult",
		title: "Calibrating the Siege Catapult",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search", "array"],
		description: "Search for a target value in an array of distinct integers that has been cyclically rotated.",
		story: `<p>A siege trebuchet range dial was originally calibrated with <b>N</b> distinct values in ascending order, but an engineer accidentally rotated the circular dial by an unknown pivot. Find the 1-based index of target angle <code>T</code>, or <code>-1</code> if missing.</p>`,
		task: "Given an array of distinct integers rotated at some unknown pivot, return the 1-based index of T, or -1.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>T</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the 1-based index of T, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i], T <= 10^9",
			"All elements in A are distinct."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5003);
			const tcs = [];

			tcs.push(makeTc(1, "7 0\n4 5 6 7 0 1 2", "5", true, "0 is at index 5."));
			tcs.push(makeTc(2, "7 3\n4 5 6 7 0 1 2", "-1", true, "3 is not in the array."));
			tcs.push(makeTc(3, "1 0\n0", "1", true, "Single element match."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = Array.from(new Set(rng.intArray(n * 2, -1000, 1000))).sort((a, b) => a - b).slice(0, n);
				const rot = rng.nextInt(0, n - 1);
				const rotated = arr.slice(rot).concat(arr.slice(0, rot));
				const target = i % 2 === 0 ? rng.choice(rotated) : rng.nextInt(-1500, 1500);
				const idx = rotated.indexOf(target);
				tcs.push(makeTc(i, `${n} ${target}\n${rotated.join(" ")}`, `${idx !== -1 ? idx + 1 : -1}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = Array.from(new Set(rng.intArray(n * 2, -1000000, 1000000))).sort((a, b) => a - b).slice(0, n);
				const rot = rng.nextInt(0, n - 1);
				const rotated = arr.slice(rot).concat(arr.slice(0, rot));
				const target = i % 2 === 0 ? rng.choice(rotated) : rng.nextInt(-1500000, 1500000);
				const idx = rotated.indexOf(target);
				tcs.push(makeTc(i, `${n} ${target}\n${rotated.join(" ")}`, `${idx !== -1 ? idx + 1 : -1}`));
			}

			return tcs;
		},
	},

	// 42. The Archer's Peak Elevation (Find Peak Element)
	{
		id: "the-archers-peak-elevation",
		title: "The Archer's Peak Elevation",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search", "array"],
		description: "Find any local peak element that is strictly greater than its neighbors in O(log N) time.",
		story: `<p>A high-altitude sniper scout inspects a jagged mountain crest of <b>N</b> ridge points <code>A[1], A[2], ..., A[N]</code> where <code>A[i] != A[i+1]</code>. A vantage peak is any index <code>i</code> where <code>A[i] > A[i-1]</code> and <code>A[i] > A[i+1]</code> (treating outside boundaries as -infinity). Find the 1-based index of <b>any</b> vantage peak.</p>`,
		task: "Given an array A where adjacent elements are never equal, return the 1-based index of any peak element.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the 1-based index of any peak element.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-2^31 <= A[i] <= 2^31 - 1",
			"A[i] != A[i+1] for all valid i."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5004);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2 3 1", "3", true, "Index 3 (value 3) is strictly greater than neighbors 2 and 1."));
			tcs.push(makeTc(2, "7\n1 2 1 3 5 6 4", "2", true, "Index 2 (value 2) is a valid peak (as is index 6)."));
			tcs.push(makeTc(3, "1\n10", "1", true, "Single element is always a peak."));

			const findPeak = (nums: number[]): number => {
				let l = 0, r = nums.length - 1;
				while (l < r) {
					const mid = Math.floor((l + r) / 2);
					if (nums[mid] > nums[mid + 1]) r = mid;
					else l = mid + 1;
				}
				return l + 1;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr: number[] = [rng.nextInt(-500, 500)];
				while (arr.length < n) {
					const nextVal = rng.nextInt(-500, 500);
					if (nextVal !== arr[arr.length - 1]) arr.push(nextVal);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${findPeak(arr)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr: number[] = [rng.nextInt(-1000000, 1000000)];
				while (arr.length < n) {
					const nextVal = rng.nextInt(-1000000, 1000000);
					if (nextVal !== arr[arr.length - 1]) arr.push(nextVal);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${findPeak(arr)}`));
			}

			return tcs;
		},
	},

	// 43. Dragon Smaug's Feast (Koko Eating Bananas)
	{
		id: "dragon-smaugs-feast",
		title: "Dragon Smaug's Feast",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search", "greedy"],
		description: "Find the minimum hourly eating speed K to consume all sheep piles within H hours.",
		story: `<p>Dragon Smaug hoards <b>N</b> flocks of sheep with counts <code>P[1], P[2], ..., P[N]</code>. The dragon has <b>H</b> hours before the sun rises. Each hour, Smaug chooses a flock and eats up to <code>K</code> sheep. If the flock has fewer than <code>K</code> sheep, Smaug eats them all and waits until the next hour. Find the <b>minimum integer speed <code>K</code></b> to finish all sheep within <code>H</code> hours.</p>`,
		task: "Given piles array P and integer H (H >= P.length), find minimum integer K to eat all piles within H hours.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>H</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>P[1], ..., P[N]</code>.</p>`,
		outputFormat: `<p>Print the minimum integer K.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"N <= H <= 10^9",
			"1 <= P[i] <= 10^9"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5005);
			const tcs = [];

			tcs.push(makeTc(1, "4 8\n3 6 7 11", "4", true, "With speed 4: ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 hours."));
			tcs.push(makeTc(2, "5 5\n30 11 23 4 20", "30", true, "When H == N, K must equal max(P)."));
			tcs.push(makeTc(3, "5 6\n30 11 23 4 20", "23", true, "With speed 23: 2+1+1+1+1 = 6 hours."));

			const minEatingSpeed = (piles: number[], H: number): number => {
				let l = 1, r = Math.max(...piles);
				while (l < r) {
					const mid = Math.floor((l + r) / 2);
					let hours = 0;
					for (const p of piles) {
						hours += Math.ceil(p / mid);
					}
					if (hours <= H) r = mid;
					else l = mid + 1;
				}
				return l;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const piles = rng.intArray(n, 1, 1000);
				const h = rng.nextInt(n, n * 5);
				tcs.push(makeTc(i, `${n} ${h}\n${piles.join(" ")}`, `${minEatingSpeed(piles, h)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const piles = rng.intArray(n, 1, 100000);
				const h = rng.nextInt(n, n * 3);
				tcs.push(makeTc(i, `${n} ${h}\n${piles.join(" ")}`, `${minEatingSpeed(piles, h)}`));
			}

			return tcs;
		},
	},

	// 44. Capacity of the Desert Caravan (Ship Within Days)
	{
		id: "capacity-of-the-desert-caravan",
		title: "Capacity of the Desert Caravan",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search", "greedy"],
		description: "Determine the least transport wagon capacity to deliver all cargo in D days.",
		story: `<p>A desert trading guild must transport <b>N</b> packages with weights <code>W[1], W[2], ..., W[N]</code> in strict chronological order across the dunes. The guild has <b>D</b> days. Each day, camels carry packages until their weight capacity is reached. Find the <b>minimum integer capacity</b> of the caravan to deliver all packages within <code>D</code> days.</p>`,
		task: "Given weights array W and days D, find minimum capacity to transport all packages in order within D days.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>D</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>W[1], ..., W[N]</code>.</p>`,
		outputFormat: `<p>Print the minimum capacity.</p>`,
		constraints: formatConstraints([
			"1 <= D <= N <= 10^5",
			"1 <= W[i] <= 500"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5006);
			const tcs = [];

			tcs.push(makeTc(1, "10 5\n1 2 3 4 5 6 7 8 9 10", "15", true, "Day 1: 1..5 (15), Day 2: 6,7 (13), Day 3: 8 (8), Day 4: 9 (9), Day 5: 10 (10). Capacity 15."));
			tcs.push(makeTc(2, "6 3\n3 2 2 4 1 4", "6", true, "Capacity 6: [3,2], [2,4], [1,4]."));
			tcs.push(makeTc(3, "3 1\n10 20 30", "60", true, "In 1 day, must hold entire sum."));

			const shipWithinDays = (weights: number[], D: number): number => {
				let l = Math.max(...weights);
				let r = weights.reduce((a, b) => a + b, 0);
				while (l < r) {
					const mid = Math.floor((l + r) / 2);
					let daysNeeded = 1, currentLoad = 0;
					for (const w of weights) {
						if (currentLoad + w > mid) {
							daysNeeded++;
							currentLoad = 0;
						}
						currentLoad += w;
					}
					if (daysNeeded <= D) r = mid;
					else l = mid + 1;
				}
				return l;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const d = rng.nextInt(1, n);
				const w = rng.intArray(n, 1, 100);
				tcs.push(makeTc(i, `${n} ${d}\n${w.join(" ")}`, `${shipWithinDays(w, d)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const d = rng.nextInt(1, Math.min(n, 500));
				const w = rng.intArray(n, 1, 500);
				tcs.push(makeTc(i, `${n} ${d}\n${w.join(" ")}`, `${shipWithinDays(w, d)}`));
			}

			return tcs;
		},
	},

	// 45. The Royal Lumberjack's Harvest (EKO Woodcutting)
	{
		id: "the-royal-lumberjacks-harvest",
		title: "The Royal Lumberjack's Harvest",
		difficulty: "Medium",
		category: "binary-search",
		tags: ["binary-search"],
		description: "Find the maximum sawblade height H to harvest at least M meters of timber from N trees.",
		story: `<p>Lumberjack Mirko operates a horizontal sawmill blade to fell timber for the royal fleet. There are <b>N</b> trees with heights <code>H[1], H[2], ..., H[N]</code>. The blade cuts horizontally at height <code>H</code>, collecting wood from each tree of length <code>max(0, H[i] - H)</code>. Mirko needs to collect <b>at least <code>M</code> meters of wood</b> while setting <code>H</code> as high as possible to conserve the forest.</p>`,
		task: "Given N trees and required wood M, find maximum integer blade height H.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>M</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>H[1], ..., H[N]</code>.</p>`,
		outputFormat: `<p>Print the maximum integer saw height H.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= M <= 2 * 10^9",
			"1 <= H[i] <= 10^9",
			"The sum of all tree heights is >= M."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5007);
			const tcs = [];

			tcs.push(makeTc(1, "4 7\n20 15 10 17", "15", true, "At height 15, we cut (20-15) + (15-15) + 0 + (17-15) = 5 + 0 + 0 + 2 = 7 meters of wood."));
			tcs.push(makeTc(2, "5 20\n4 42 40 26 46", "36", true, "At height 36: cuts are 6 + 4 + 0 + 10 = 20 meters."));
			tcs.push(makeTc(3, "1 5\n10", "5", true, "Single tree of height 10 cut at 5 yields 5 meters."));

			const eko = (trees: bigint[], M: bigint): bigint => {
				let l = 0n, r = 1000000000n;
				let ans = 0n;
				while (l <= r) {
					const mid = (l + r) / 2n;
					let wood = 0n;
					for (const t of trees) {
						if (t > mid) wood += t - mid;
					}
					if (wood >= M) {
						ans = mid;
						l = mid + 1n;
					} else {
						r = mid - 1n;
					}
				}
				return ans;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const trees = rng.intArray(n, 1, 10000).map((x) => BigInt(x));
				const total = trees.reduce((a, b) => a + b, 0n);
				const m = total / 2n + 1n;
				tcs.push(makeTc(i, `${n} ${m}\n${trees.join(" ")}`, `${eko(trees, m)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const trees = rng.intArray(n, 1, 1000000).map((x) => BigInt(x));
				const total = trees.reduce((a, b) => a + b, 0n);
				const m = total / 3n + 1n;
				tcs.push(makeTc(i, `${n} ${m}\n${trees.join(" ")}`, `${eko(trees, m)}`));
			}

			return tcs;
		},
	},

	// 46. Aggressive Horses of the Steppes (Aggressive Cows / Stall Allocation)
	{
		id: "aggressive-horses-of-the-steppes",
		title: "Aggressive Horses of the Steppes",
		difficulty: "Hard",
		category: "binary-search",
		tags: ["binary-search", "greedy"],
		description: "Assign C aggressive horses to N stall positions to maximize the minimum distance between any two horses.",
		story: `<p>A nomadic clan stables <b>C</b> aggressive wild horses in a barn with <b>N</b> stalls located along a straight road at coordinates <code>X[1], X[2], ..., X[N]</code>. The horses will attack each other if placed too close together. Assign all <b>C</b> horses to stalls such that the <b>minimum distance between any two horses is maximized</b>.</p>`,
		task: "Given coordinates of N stalls and C horses, find the largest minimum distance possible between any two horses.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>C</code>.</p>
<p>The second line contains <code>N</code> space-separated integers, the coordinates of the stalls.</p>`,
		outputFormat: `<p>Print the maximum possible minimum distance.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^5",
			"2 <= C <= N",
			"0 <= X[i] <= 10^9"
		]),
		points: 300,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(5008);
			const tcs = [];

			tcs.push(makeTc(1, "5 3\n1 2 8 4 9", "3", true, "Stalls sorted: [1, 2, 4, 8, 9]. Placing horses at 1, 4, 8 gives min distance 3."));
			tcs.push(makeTc(2, "3 2\n1 5 10", "9", true, "Place at 1 and 10 -> distance 9."));
			tcs.push(makeTc(3, "4 4\n1 2 3 4", "1", true, "Horses in all 4 stalls have distance 1."));

			const aggressiveHorses = (X: number[], C: number): number => {
				X.sort((a, b) => a - b);
				let l = 1, r = X[X.length - 1] - X[0];
				let ans = 1;
				while (l <= r) {
					const mid = Math.floor((l + r) / 2);
					let count = 1;
					let last = X[0];
					for (let i = 1; i < X.length; i++) {
						if (X[i] - last >= mid) {
							count++;
							last = X[i];
						}
					}
					if (count >= C) {
						ans = mid;
						l = mid + 1;
					} else {
						r = mid - 1;
					}
				}
				return ans;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const c = rng.nextInt(2, Math.min(n, 50));
				const X = rng.intArray(n, 0, 10000);
				tcs.push(makeTc(i, `${n} ${c}\n${X.join(" ")}`, `${aggressiveHorses(X, c)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const c = rng.nextInt(2, Math.min(n, 1000));
				const X = rng.intArray(n, 0, 1000000);
				tcs.push(makeTc(i, `${n} ${c}\n${X.join(" ")}`, `${aggressiveHorses(X, c)}`));
			}

			return tcs;
		},
	},
];
