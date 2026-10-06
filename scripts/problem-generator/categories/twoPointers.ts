import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const twoPointersProblems: ProblemDefinition[] = [
	// 31. Caravans Across the Great Dune (Two Sum Sorted - 1-based)
	{
		id: "caravans-across-the-great-dune",
		title: "Caravans Across the Great Dune",
		difficulty: "Easy",
		category: "array",
		tags: ["two-pointers", "array"],
		description: "Find two wagon cargo weights in a sorted manifest that add up to target capacity.",
		story: `<p>A caravan crossing the Sahara must balance two wagons to load onto a cargo barge. The wagon weights <code>A[1], A[2], ..., A[N]</code> are already sorted in non-decreasing order. The barge requires <b>exactly <code>T</code> tonnes</b> of weight. Find the 1-based indices of the two distinct wagons whose weights sum to <code>T</code>.</p>`,
		task: "Given sorted array A and target T, output two 1-based indices i and j (i < j) such that A[i] + A[j] == T. It is guaranteed that exactly one solution exists.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>T</code>.</p>
<p>The second line contains <code>N</code> space-separated integers in non-decreasing order.</p>`,
		outputFormat: `<p>Print two space-separated integers: <code>i j</code> (1-based).</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^5",
			"-10^9 <= A[i], T <= 10^9",
			"Exactly one valid solution exists."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4001);
			const tcs = [];

			tcs.push(makeTc(1, "4 9\n2 7 11 15", "1 2", true, "A[1] + A[2] = 2 + 7 = 9."));
			tcs.push(makeTc(2, "3 6\n2 3 4", "1 3", true, "A[1] + A[3] = 2 + 4 = 6."));
			tcs.push(makeTc(3, "2 -1\n-1 0", "1 2", true, "Negative weights."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -1000, 1000).sort((a, b) => a - b);
				const idx1 = rng.nextInt(0, n - 2);
				const idx2 = rng.nextInt(idx1 + 1, n - 1);
				const target = arr[idx1] + arr[idx2];
				tcs.push(makeTc(i, `${n} ${target}\n${arr.join(" ")}`, `${idx1 + 1} ${idx2 + 1}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -1000000, 1000000).sort((a, b) => a - b);
				const idx1 = rng.nextInt(0, n - 2);
				const idx2 = rng.nextInt(idx1 + 1, n - 1);
				const target = arr[idx1] + arr[idx2];
				tcs.push(makeTc(i, `${n} ${target}\n${arr.join(" ")}`, `${idx1 + 1} ${idx2 + 1}`));
			}

			return tcs;
		},
	},

	// 32. The Silk Road Checkpoints (Container With Most Water)
	{
		id: "the-silk-road-checkpoints",
		title: "The Silk Road Checkpoints",
		difficulty: "Medium",
		category: "array",
		tags: ["two-pointers", "greedy"],
		description: "Find two vertical reservoir walls that together with the x-axis store the maximum water volume.",
		story: `<p>Along the Oasis canal, <b>N</b> vertical stone floodgates are erected at coordinates <code>1, 2, ..., N</code> with heights <code>H[1], H[2], ..., H[N]</code>. Two chosen floodgates <code>i</code> and <code>j</code> (i < j) can store water with capacity <code>(j - i) * min(H[i], H[j])</code>. Determine the maximum water storage capacity possible.</p>`,
		task: "Given array H of length N, find the maximum area of water that can be contained.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>H[1], H[2], ..., H[N]</code>.</p>`,
		outputFormat: `<p>Print the maximum water area.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^5",
			"0 <= H[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4002);
			const tcs = [];

			tcs.push(makeTc(1, "9\n1 8 6 2 5 4 8 3 7", "49", true, "Between indices 2 (height 8) and 9 (height 7): distance 7, min height 7 -> 49."));
			tcs.push(makeTc(2, "2\n1 1", "1", true, "Distance 1, height 1 -> 1."));
			tcs.push(makeTc(3, "4\n4 3 2 1 4", "16", true, "Two outer walls of height 4 separated by distance 4 -> 16."));

			const maxArea = (h: number[]): number => {
				let l = 0, r = h.length - 1;
				let maxA = 0;
				while (l < r) {
					const area = (r - l) * Math.min(h[l], h[r]);
					if (area > maxA) maxA = area;
					if (h[l] < h[r]) l++;
					else r--;
				}
				return maxA;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const h = rng.intArray(n, 0, 1000);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${maxArea(h)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const h = rng.intArray(n, 0, 10000);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${maxArea(h)}`));
			}

			return tcs;
		},
	},

	// 33. Three Knights' Honor Quest (3Sum to Zero)
	{
		id: "three-knights-honor-quest",
		title: "Three Knights' Honor Quest",
		difficulty: "Medium",
		category: "array",
		tags: ["two-pointers", "sorting"],
		description: "Find the number of unique triplet combinations whose power values sum to exactly zero.",
		story: `<p>In the Court of Camelot, King Arthur seeks three champion knights from different noble houses whose moral alignment values <code>A[i] + A[j] + A[k] == 0</code> (with distinct indices <code>i < j < k</code>). Count how many <b>unique triplets</b> <code>(A[i], A[j], A[k])</code> exist that satisfy this condition.</p>`,
		task: "Given array A of length N, output the count of distinct value triplets [a, b, c] such that a + b + c == 0.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print a single integer: the number of distinct triplets that sum to 0.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 3000",
			"-10^5 <= A[i] <= 10^5"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4003);
			const tcs = [];

			tcs.push(makeTc(1, "6\n-1 0 1 2 -1 -4", "2", true, "Distinct triplets are [-1, -1, 2] and [-1, 0, 1]. Count = 2."));
			tcs.push(makeTc(2, "3\n0 1 1", "0", true, "No triplet sums to 0."));
			tcs.push(makeTc(3, "3\n0 0 0", "1", true, "[0, 0, 0] sums to 0."));

			const countThreeSum = (nums: number[]): number => {
				nums.sort((a, b) => a - b);
				let count = 0;
				for (let i = 0; i < nums.length - 2; i++) {
					if (i > 0 && nums[i] === nums[i - 1]) continue;
					let l = i + 1, r = nums.length - 1;
					while (l < r) {
						const sum = nums[i] + nums[l] + nums[r];
						if (sum === 0) {
							count++;
							while (l < r && nums[l] === nums[l + 1]) l++;
							while (l < r && nums[r] === nums[r - 1]) r--;
							l++;
							r--;
						} else if (sum < 0) {
							l++;
						} else {
							r--;
						}
					}
				}
				return count;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(10, 100);
				const arr = rng.intArray(n, -50, 50);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${countThreeSum(arr)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(40, 100);
				const arr = rng.intArray(n, -200, 200);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${countThreeSum(arr)}`));
			}

			return tcs;
		},
	},

	// 34. Night Watch Perimeter Patrol (Remove Duplicates from Sorted Array)
	{
		id: "night-watch-perimeter-patrol",
		title: "Night Watch Perimeter Patrol",
		difficulty: "Easy",
		category: "array",
		tags: ["two-pointers", "array"],
		description: "Remove duplicate watchposts from a sorted patrol log, outputting the count of unique posts.",
		story: `<p>The Night Watch commander receives a sorted list of <b>N</b> boundary milestone coordinates <code>A[1] <= A[2] <= ... <= A[N]</code> recorded by patrol scouts. Because multiple scouts visited the same milestones, duplicates exist. Output the number of <b>unique milestones</b>, followed by the unique list in sorted order.</p>`,
		task: "Given sorted array A of length N, output K (the number of unique elements) on line 1, and the K unique elements on line 2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers in non-decreasing order.</p>`,
		outputFormat: `<p>Line 1: integer <code>K</code>.</p>
<p>Line 2: <code>K</code> space-separated integers in ascending order.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i] <= 10^9"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4004);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 1 2", "2\n1 2", true, "Unique elements are 1 and 2."));
			tcs.push(makeTc(2, "10\n0 0 1 1 1 2 2 3 3 4", "5\n0 1 2 3 4", true, "5 unique elements: 0, 1, 2, 3, 4."));
			tcs.push(makeTc(3, "1\n100", "1\n100", true, "Single element."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -200, 200).sort((a, b) => a - b);
				const unique = Array.from(new Set(arr));
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${unique.length}\n${unique.join(" ")}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -10000, 10000).sort((a, b) => a - b);
				const unique = Array.from(new Set(arr));
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${unique.length}\n${unique.join(" ")}`));
			}

			return tcs;
		},
	},

	// 35. The Alchemist's Substance Blend (Minimum Size Subarray Sum)
	{
		id: "the-alchemists-substance-blend",
		title: "The Alchemist's Substance Blend",
		difficulty: "Medium",
		category: "array",
		tags: ["sliding-window", "two-pointers"],
		description: "Find the minimal length of a contiguous subarray whose sum is greater than or equal to target S.",
		story: `<p>In the Alchemical Crucible, a master wizard adds consecutive drops of glowing reagents with positive power ratings <code>A[1], A[2], ..., A[N]</code>. To trigger a reaction, the sum of power ratings of a <b>contiguous sequence of drops</b> must be <b>at least <code>S</code></b>. Find the <b>minimum number of drops</b> needed to achieve this, or <code>0</code> if impossible.</p>`,
		task: "Given integer S and array A of positive integers, return minimal length of subarray with sum >= S, or 0 if none.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>S</code>.</p>
<p>The second line contains <code>N</code> space-separated positive integers.</p>`,
		outputFormat: `<p>Print a single integer: minimum subarray length, or 0.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= S <= 10^9",
			"1 <= A[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4005);
			const tcs = [];

			tcs.push(makeTc(1, "6 7\n2 3 1 2 4 3", "2", true, "Subarray [4, 3] has sum 7 and minimal length 2."));
			tcs.push(makeTc(2, "3 4\n1 4 4", "1", true, "Single element [4] satisfies sum >= 4."));
			tcs.push(makeTc(3, "5 100\n1 1 1 1 1", "0", true, "Total sum is 5, cannot reach 100."));

			const minSubArrayLen = (target: number, nums: number[]): number => {
				let l = 0, sum = 0, minLen = Infinity;
				for (let r = 0; r < nums.length; r++) {
					sum += nums[r];
					while (sum >= target) {
						minLen = Math.min(minLen, r - l + 1);
						sum -= nums[l];
						l++;
					}
				}
				return minLen === Infinity ? 0 : minLen;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, 1, 100);
				const s = rng.nextInt(5, 50);
				tcs.push(makeTc(i, `${n} ${s}\n${arr.join(" ")}`, `${minSubArrayLen(s, arr)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, 1, 1000);
				const s = rng.nextInt(1000, 100000);
				tcs.push(makeTc(i, `${n} ${s}\n${arr.join(" ")}`, `${minSubArrayLen(s, arr)}`));
			}

			return tcs;
		},
	},

	// 36. Sort Colors of the Empire (Dutch National Flag)
	{
		id: "sort-colors-of-the-empire",
		title: "Sort Colors of the Empire",
		difficulty: "Medium",
		category: "array",
		tags: ["two-pointers", "sorting"],
		description: "Sort an array of 0s, 1s, and 2s representing empire colors in one pass.",
		story: `<p>The imperial guard carries banners of three sacred heraldic colors: <code>0</code> for Crimson, <code>1</code> for Pearl, and <code>2</code> for Azure. In the grand parade review, all banners must be organized so that all Crimson banners come first, followed by Pearl, and finally Azure.</p>`,
		task: "Given an array of N integers consisting only of 0, 1, and 2, output the sorted array.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers (each is 0, 1, or 2).</p>`,
		outputFormat: `<p>Print the <code>N</code> sorted integers separated by spaces.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"A[i] is 0, 1, or 2."
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4006);
			const tcs = [];

			tcs.push(makeTc(1, "6\n2 0 2 1 1 0", "0 0 1 1 2 2", true, "Sorted into 0s, 1s, 2s."));
			tcs.push(makeTc(2, "3\n2 0 1", "0 1 2", true, "All three colors present."));
			tcs.push(makeTc(3, "1\n0", "0", true, "Single color."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr: number[] = [];
				for (let k = 0; k < n; k++) arr.push(rng.choice([0, 1, 2]));
				const sorted = [...arr].sort((a, b) => a - b);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, sorted.join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr: number[] = [];
				for (let k = 0; k < n; k++) arr.push(rng.choice([0, 1, 2]));
				const sorted = [...arr].sort((a, b) => a - b);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, sorted.join(" ")));
			}

			return tcs;
		},
	},

	// 37. Merging the Royal Archives (Merge Two Sorted Arrays)
	{
		id: "merging-the-royal-archives",
		title: "Merging the Royal Archives",
		difficulty: "Easy",
		category: "array",
		tags: ["two-pointers", "sorting"],
		description: "Merge two separately sorted royal historical chronicles into one sorted sequence.",
		story: `<p>Following the unification of the Northern and Southern Kingdoms, royal scribes must interleave two chronological lists of treaty timestamps: List <code>A</code> of length <code>N</code> and List <code>B</code> of length <code>M</code>, both sorted in non-decreasing order.</p>`,
		task: "Given two sorted arrays A of length N and B of length M, output the merged sorted array of length N + M.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>M</code>.</p>
<p>The second line contains <code>N</code> space-separated sorted integers <code>A</code>.</p>
<p>The third line contains <code>M</code> space-separated sorted integers <code>B</code>.</p>`,
		outputFormat: `<p>Print <code>N + M</code> space-separated integers in non-decreasing order.</p>`,
		constraints: formatConstraints([
			"1 <= N, M <= 5 * 10^4",
			"-10^9 <= A[i], B[j] <= 10^9"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4007);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n1 2 3\n2 5 6", "1 2 2 3 5 6", true, "Merged list."));
			tcs.push(makeTc(2, "1 1\n1\n2", "1 2", true, "Two single elements."));
			tcs.push(makeTc(3, "2 3\n5 10\n1 2 3", "1 2 3 5 10", true, "Non-overlapping ranges."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(3, 30);
				const m = rng.nextInt(3, 30);
				const a = rng.intArray(n, -1000, 1000).sort((x, y) => x - y);
				const b = rng.intArray(m, -1000, 1000).sort((x, y) => x - y);
				const merged = a.concat(b).sort((x, y) => x - y);
				tcs.push(makeTc(i, `${n} ${m}\n${a.join(" ")}\n${b.join(" ")}`, merged.join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(40, 80);
				const m = rng.nextInt(40, 80);
				const a = rng.intArray(n, -1000000, 1000000).sort((x, y) => x - y);
				const b = rng.intArray(m, -1000000, 1000000).sort((x, y) => x - y);
				const merged = a.concat(b).sort((x, y) => x - y);
				tcs.push(makeTc(i, `${n} ${m}\n${a.join(" ")}\n${b.join(" ")}`, merged.join(" ")));
			}

			return tcs;
		},
	},

	// 38. Traversing the Mountain Interval (Interval Intersections)
	{
		id: "traversing-the-mountain-interval",
		title: "Traversing the Mountain Interval",
		difficulty: "Medium",
		category: "array",
		tags: ["two-pointers"],
		description: "Find the intersection intervals of two disjoint sorted interval lists.",
		story: `<p>Two ranger squadrons patrol high-altitude passes. Squadron 1 patrols disjoint time intervals <code>A[1], ..., A[N]</code>, while Squadron 2 patrols disjoint intervals <code>B[1], ..., B[M]</code>. Both lists are sorted by start time. Determine all time intervals during which <b>both squadrons were simultaneously on patrol</b>.</p>`,
		task: "Given two lists of closed intervals A and B, return the intersection of these two interval lists.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>M</code>.</p>
<p>The next <code>N</code> lines each contain <code>start end</code> for list A.</p>
<p>The next <code>M</code> lines each contain <code>start end</code> for list B.</p>`,
		outputFormat: `<p>The first line contains <code>K</code>, the number of intersection intervals.</p>
<p>The next <code>K</code> lines each contain <code>start end</code> of an intersection interval.</p>`,
		constraints: formatConstraints([
			"0 <= N, M <= 1000",
			"0 <= start <= end <= 10^9"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(4008);
			const tcs = [];

			tcs.push(makeTc(1, "4 4\n0 2\n5 10\n13 23\n24 25\n1 5\n8 12\n15 24\n25 26", "6\n1 2\n5 5\n8 10\n15 23\n24 24\n25 25", true, "Overlapping sections: [1,2], [5,5], [8,10], [15,23], [24,24], [25,25]."));
			tcs.push(makeTc(2, "1 1\n1 3\n5 9", "0", true, "No overlap."));

			const intersect = (A: [number, number][], B: [number, number][]): [number, number][] => {
				const ans: [number, number][] = [];
				let i = 0, j = 0;
				while (i < A.length && j < B.length) {
					const lo = Math.max(A[i][0], B[j][0]);
					const hi = Math.min(A[i][1], B[j][1]);
					if (lo <= hi) ans.push([lo, hi]);
					if (A[i][1] < B[j][1]) i++;
					else j--;
					// avoid infinite loop
					if (A[i] && B[j] && A[i][1] === B[j][1]) {
						i++;
						j++;
					}
				}
				return ans;
			};

			const solve = (A: [number, number][], B: [number, number][]): string => {
				const ans: [number, number][] = [];
				let i = 0, j = 0;
				while (i < A.length && j < B.length) {
					const lo = Math.max(A[i][0], B[j][0]);
					const hi = Math.min(A[i][1], B[j][1]);
					if (lo <= hi) ans.push([lo, hi]);
					if (A[i][1] < B[j][1]) i++;
					else j++;
				}
				if (ans.length === 0) return "0";
				return `${ans.length}\n${ans.map((x) => `${x[0]} ${x[1]}`).join("\n")}`;
			};

			for (let idx = 3; idx <= 100; idx++) {
				const n = rng.nextInt(1, 40);
				const m = rng.nextInt(1, 40);
				const A: [number, number][] = [];
				let cur = rng.nextInt(0, 10);
				for (let k = 0; k < n; k++) {
					const span = rng.nextInt(1, 20);
					A.push([cur, cur + span]);
					cur += span + rng.nextInt(1, 10);
				}
				const B: [number, number][] = [];
				cur = rng.nextInt(0, 10);
				for (let k = 0; k < m; k++) {
					const span = rng.nextInt(1, 20);
					B.push([cur, cur + span]);
					cur += span + rng.nextInt(1, 10);
				}
				const inStr = `${n} ${m}\n${A.map((x) => `${x[0]} ${x[1]}`).join("\n")}\n${B.map((x) => `${x[0]} ${x[1]}`).join("\n")}`;
				tcs.push(makeTc(idx, inStr, solve(A, B)));
			}

			return tcs;
		},
	},
];
