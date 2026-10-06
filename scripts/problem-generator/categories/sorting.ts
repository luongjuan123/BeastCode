import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const sortingProblems: ProblemDefinition[] = [
	// 96. Merging the Royal Summons Intervals (Merge Intervals)
	{
		id: "merging-the-royal-summons-intervals",
		title: "Merging the Royal Summons Intervals",
		difficulty: "Medium",
		category: "sorting",
		tags: ["sorting", "intervals", "array"],
		description: "Merge all overlapping intervals representing royal summons into non-overlapping spans.",
		story: `<p>The Royal Herald posts an array of summons time intervals <code>[start, end]</code> for palace banquets. Multiple noble houses have overlapping attendance times. Merge all overlapping summons so that each guest attends a continuous unified duration.</p>`,
		task: "Merge all overlapping intervals and output the merged intervals in ascending order by start time.",
		inputFormat: `<p>The first line contains integer <code>N</code> (number of intervals).</p>
<p>The next <code>N</code> lines each contain two integers <code>start end</code>.</p>`,
		outputFormat: `<p>The first line prints <code>M</code> (count of merged intervals).</p>
<p>The next <code>M</code> lines each print <code>start end</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^4",
			"0 <= start <= end <= 10^5"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(12001);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 3\n2 6\n8 10\n15 18", "3\n1 6\n8 10\n15 18", true, "Intervals [1,3] and [2,6] overlap, merging into [1,6]."));
			tcs.push(makeTc(2, "2\n1 4\n4 5", "1\n1 5", true, "Intervals [1,4] and [4,5] touch at 4, merging into [1,5]."));
			tcs.push(makeTc(3, "1\n5 10", "1\n5 10", true, "Single interval."));

			const mergeIntervals = (intervals: [number, number][]): [number, number][] => {
				if (intervals.length <= 1) return intervals;
				intervals.sort((a, b) => a[0] - b[0]);
				const merged: [number, number][] = [intervals[0]];
				for (let i = 1; i < intervals.length; i++) {
					const curr = intervals[i];
					const prev = merged[merged.length - 1];
					if (curr[0] <= prev[1]) {
						prev[1] = Math.max(prev[1], curr[1]);
					} else {
						merged.push(curr);
					}
				}
				return merged;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(3, 100);
				const intervals: [number, number][] = [];
				for (let j = 0; j < n; j++) {
					const s = rng.nextInt(0, 1000);
					const e = s + rng.nextInt(0, 50);
					intervals.push([s, e]);
				}
				const inStr = `${n}\n` + intervals.map(([s, e]) => `${s} ${e}`).join("\n");
				const merged = mergeIntervals(intervals.map(([s, e]) => [s, e]));
				const outStr = `${merged.length}\n` + merged.map(([s, e]) => `${s} ${e}`).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(30, 80);
				const intervals: [number, number][] = [];
				for (let j = 0; j < n; j++) {
					const s = rng.nextInt(0, 50000);
					const e = s + rng.nextInt(0, 200);
					intervals.push([s, e]);
				}
				const inStr = `${n}\n` + intervals.map(([s, e]) => `${s} ${e}`).join("\n");
				const merged = mergeIntervals(intervals.map(([s, e]) => [s, e]));
				const outStr = `${merged.length}\n` + merged.map(([s, e]) => `${s} ${e}`).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 97. Top K Favored Relics (Top K Frequent Elements)
	{
		id: "top-k-favored-relics",
		title: "Top K Favored Relics",
		difficulty: "Medium",
		category: "sorting",
		tags: ["sorting", "hash-table", "heap"],
		description: "Find the K most frequent relic IDs in an expedition inventory.",
		story: `<p>Excavators unearth <code>N</code> relics labeled with integer catalog IDs. Some ancient artifacts appear much more frequently than others. The curator requests a list of the <code>K</code> most frequent relic IDs. In case of ties, smaller relic IDs come first.</p>`,
		task: "Given an array of integers nums and an integer k, return the k most frequent elements in descending order of frequency (break ties by ascending value).",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>K</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the <code>K</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"1 <= K <= N <= 10^5",
			"-10^4 <= nums[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(12002);
			const tcs = [];

			tcs.push(makeTc(1, "6 2\n1 1 1 2 2 3", "1 2", true, "1 appears 3 times, 2 appears 2 times."));
			tcs.push(makeTc(2, "1 1\n1", "1", true, "Single element."));
			tcs.push(makeTc(3, "4 2\n1 2 3 4", "1 2", true, "All appear once; tiebroken by ascending value: 1, 2."));

			const topKFrequent = (nums: number[], k: number): number[] => {
				const map = new Map<number, number>();
				for (const x of nums) {
					map.set(x, (map.get(x) || 0) + 1);
				}
				const entries = Array.from(map.entries());
				entries.sort((a, b) => {
					if (b[1] !== a[1]) return b[1] - a[1];
					return a[0] - b[0];
				});
				return entries.slice(0, k).map((e) => e[0]);
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const nums: number[] = [];
				const pool = rng.intArray(rng.nextInt(3, 20), -100, 100);
				for (let j = 0; j < n; j++) {
					nums.push(rng.choice(pool));
				}
				const distinctCount = new Set(nums).size;
				const k = rng.nextInt(1, Math.min(distinctCount, 10));
				const ans = topKFrequent(nums, k);
				tcs.push(makeTc(i, `${n} ${k}\n${nums.join(" ")}`, ans.join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const nums: number[] = [];
				const pool = rng.intArray(rng.nextInt(10, 50), -5000, 5000);
				for (let j = 0; j < n; j++) {
					nums.push(rng.choice(pool));
				}
				const distinctCount = new Set(nums).size;
				const k = rng.nextInt(1, Math.min(distinctCount, 15));
				const ans = topKFrequent(nums, k);
				tcs.push(makeTc(i, `${n} ${k}\n${nums.join(" ")}`, ans.join(" ")));
			}

			return tcs;
		},
	},

	// 98. Sort Knights by Chivalric Parity (Sort Array by Parity Stable)
	{
		id: "sort-knights-by-chivalric-parity",
		title: "Sort Knights by Chivalric Parity",
		difficulty: "Easy",
		category: "sorting",
		tags: ["sorting", "array"],
		description: "Reorder an array so all even numbers appear before all odd numbers, preserving original relative order.",
		story: `<p>During the Grand Tournament inspection, knights assemble with badge numbers <code>nums[0] ... nums[N-1]</code>. The Grand Marshall commands that all knights with even badge numbers step to the front, followed by all knights with odd badge numbers, strictly preserving their original relative ordering within each group.</p>`,
		task: "Sort the array stably so all even integers precede odd integers.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the <code>N</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= nums[i] <= 10^5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(12003);
			const tcs = [];

			tcs.push(makeTc(1, "4\n3 1 2 4", "2 4 3 1", true, "Evens [2, 4] then odds [3, 1] in original order."));
			tcs.push(makeTc(2, "1\n0", "0", true, "Single element."));
			tcs.push(makeTc(3, "3\n2 4 6", "2 4 6", true, "All evens already."));

			const sortByParity = (nums: number[]): number[] => {
				const evens = nums.filter((x) => x % 2 === 0);
				const odds = nums.filter((x) => x % 2 !== 0);
				return evens.concat(odds);
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const nums = rng.intArray(n, 0, 1000);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, sortByParity(nums).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const nums = rng.intArray(n, 0, 10000);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, sortByParity(nums).join(" ")));
			}

			return tcs;
		},
	},

	// 99. The Grand Architect's Largest Number (Largest Number Custom Comparator)
	{
		id: "the-grand-architects-largest-number",
		title: "The Grand Architect's Largest Number",
		difficulty: "Medium",
		category: "sorting",
		tags: ["sorting", "string", "greedy"],
		description: "Arrange a list of non-negative integers such that they form the largest possible concatenated number.",
		story: `<p>The Grand Architect inscribes tower coordinates by joining stone blocks engraved with non-negative numbers <code>nums[0] ... nums[N-1]</code>. To maximize the tower's mystical height, arrange these numerical blocks in order to concatenate into the largest possible numerical string.</p>`,
		task: "Given a list of non-negative integers nums, arrange them such that they form the largest number and return it as a string.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the largest concatenated number string.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"0 <= nums[i] <= 10^9"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(12004);
			const tcs = [];

			tcs.push(makeTc(1, "2\n10 2", "210", true, "'2' + '10' = '210' > '102'."));
			tcs.push(makeTc(2, "5\n3 30 34 5 9", "9534330", true, "Largest arrangement is 9534330."));
			tcs.push(makeTc(3, "3\n0 0 0", "0", true, "Leading zeros should collapse to '0'."));

			const largestNumber = (nums: number[]): string => {
				const strs = nums.map(String);
				strs.sort((a, b) => (b + a).localeCompare(a + b));
				if (strs[0] === "0") return "0";
				return strs.join("");
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(3, 25);
				const nums = rng.intArray(n, 0, 500);
				const ans = largestNumber(nums);
				tcs.push(makeTc(i, `${n}\n${nums.join(" ")}`, ans));
			}

			return tcs;
		},
	},

	// 100. The Guild Hall Meeting Chambers (Meeting Rooms II)
	{
		id: "the-guild-hall-meeting-chambers",
		title: "The Guild Hall Meeting Chambers",
		difficulty: "Medium",
		category: "sorting",
		tags: ["sorting", "greedy", "heap", "two-pointers"],
		description: "Find the minimum number of meeting chambers required to host all guild council sessions.",
		story: `<p>In the Grand Guildhall of Ironhaven, <code>N</code> guild factions schedule their quarterly councils, each with interval <code>[start, end]</code>. No two councils can share the same chamber at overlapping times (a meeting ending at time <code>T</code> frees the room for a meeting starting at <code>T</code>).</p>`,
		task: "Determine the minimum number of conference chambers needed to accommodate all meetings.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two integers <code>start end</code>.</p>`,
		outputFormat: `<p>Print the minimum number of chambers.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^4",
			"0 <= start < end <= 10^6"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(12005);
			const tcs = [];

			tcs.push(makeTc(1, "3\n0 30\n5 10\n15 20", "2", true, "Room 1 hosts [0, 30], Room 2 hosts [5, 10] then [15, 20]. Min rooms = 2."));
			tcs.push(makeTc(2, "2\n7 10\n2 4", "1", true, "No overlap, 1 room suffices."));
			tcs.push(makeTc(3, "3\n1 5\n5 10\n10 15", "1", true, "Touching intervals do not conflict."));

			const minMeetingRooms = (intervals: [number, number][]): number => {
				const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);
				const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);
				let rooms = 0;
				let endPtr = 0;
				for (let i = 0; i < starts.length; i++) {
					if (starts[i] < ends[endPtr]) {
						rooms++;
					} else {
						endPtr++;
					}
				}
				return rooms;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(3, 100);
				const intervals: [number, number][] = [];
				for (let j = 0; j < n; j++) {
					const s = rng.nextInt(0, 500);
					const e = s + rng.nextInt(1, 40);
					intervals.push([s, e]);
				}
				const ans = minMeetingRooms(intervals);
				const inStr = `${n}\n` + intervals.map(([s, e]) => `${s} ${e}`).join("\n");
				tcs.push(makeTc(i, inStr, ans.toString()));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(30, 80);
				const intervals: [number, number][] = [];
				for (let j = 0; j < n; j++) {
					const s = rng.nextInt(0, 10000);
					const e = s + rng.nextInt(1, 200);
					intervals.push([s, e]);
				}
				const ans = minMeetingRooms(intervals);
				const inStr = `${n}\n` + intervals.map(([s, e]) => `${s} ${e}`).join("\n");
				tcs.push(makeTc(i, inStr, ans.toString()));
			}

			return tcs;
		},
	},
];
