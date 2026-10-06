import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatProblemStatement, formatConstraints } from "../utils";

export const arrayProblems: ProblemDefinition[] = [
	// 1. The Guild's Treasury (Running Balance & Peak)
	{
		id: "the-guilds-treasury",
		title: "The Guild's Treasury",
		difficulty: "Easy",
		category: "array",
		tags: ["array", "simulation"],
		description: "Track daily deposits and withdrawals in the royal merchant guild to find the maximum treasury balance reached.",
		story: `<p>The grand Merchant Guild of Eldoria manages the kingdom's finances. Every day, the guild ledger records a transaction: positive integers represent royal trade tariffs and gold deposits, while negative integers represent infrastructure investments and mercenary upkeep.</p>
<p>Starting with an initial treasury of <b>0 gold coins</b>, Chief Treasurer Balthazar wants to find the <b>highest balance</b> the treasury ever attained at the conclusion of any day throughout the entire recorded fiscal period.</p>`,
		task: "Given the initial balance of 0 and an array of <code>N</code> daily transactions, output the maximum balance observed at the end of any day (or 0 if the treasury never entered positive balance).",
		inputFormat: `<p>The first line contains an integer <code>N</code>, the number of days.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>, denoting the transaction on each day.</p>`,
		outputFormat: `<p>Print a single integer: the peak gold balance recorded at any day's conclusion.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^4 <= A[i] <= 10^4"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1001);
			const tcs = [];

			// Samples
			tcs.push(makeTc(1, "5\n-2 5 -1 8 -3", "10", true, "Balances day by day: -2, 3, 2, 10, 7. The maximum balance attained is 10."));
			tcs.push(makeTc(2, "4\n-1 -3 -5 -2", "0", true, "Every transaction is a loss; starting balance 0 is the peak."));
			tcs.push(makeTc(3, "1\n50", "50", true, "Single deposit of 50 reaches peak 50."));

			// Edge cases
			tcs.push(makeTc(4, "1\n-100", "0"));
			tcs.push(makeTc(5, "2\n100 -100", "100"));
			tcs.push(makeTc(6, "2\n-50 50", "0"));
			tcs.push(makeTc(7, "3\n0 0 0", "0"));
			tcs.push(makeTc(8, "5\n10 20 30 40 50", "150"));
			tcs.push(makeTc(9, "5\n-10 -20 -30 -40 -50", "0"));
			tcs.push(makeTc(10, "10\n1 -1 1 -1 1 -1 1 -1 1 -1", "1"));

			// Random testcases (11 to 75)
			for (let i = 11; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -500, 500);
				let maxB = 0;
				let curr = 0;
				for (const x of arr) {
					curr += x;
					if (curr > maxB) maxB = curr;
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${maxB}`));
			}

			// Large stress cases (76 to 100)
			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -1000, 1000);
				let maxB = 0;
				let curr = 0;
				for (const x of arr) {
					curr += x;
					if (curr > maxB) maxB = curr;
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${maxB}`));
			}

			return tcs;
		},
	},

	// 2. Harvest of Eldoria (Maximum Subarray Sum - Kadane)
	{
		id: "harvest-of-eldoria",
		title: "Harvest of Eldoria",
		difficulty: "Medium",
		category: "array",
		tags: ["array", "dynamic-programming"],
		description: "Find the maximum harvest yield achievable from a contiguous sequence of farmland plots.",
		story: `<p>Along the River Aethelgard lie <b>N</b> contiguous plots of fertile royal farmland. Due to recent enchantments and localized locust swarms, each plot <code>i</code> produces an integer net yield <code>A[i]</code> bushels of enchanted wheat (where negative values represent plots damaged by locusts).</p>
<p>The Royal Overseer is permitted to harvest any <b>contiguous strip</b> of farmland containing at least one plot. Determine the maximum possible wheat yield the overseer can gather.</p>`,
		task: "Given an array of <code>N</code> integers, find the maximum sum of any non-empty contiguous subarray.",
		inputFormat: `<p>The first line contains an integer <code>N</code>, the number of farmland plots.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print a single integer: the maximum harvest yield from any non-empty contiguous subarray.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^4 <= A[i] <= 10^4"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1002);
			const tcs = [];

			tcs.push(makeTc(1, "9\n-2 1 -3 4 -1 2 1 -5 4", "6", true, "Subarray [4, -1, 2, 1] produces the maximum sum 6."));
			tcs.push(makeTc(2, "5\n1 2 3 4 5", "15", true, "All plots are fertile, so the entire array produces 15."));
			tcs.push(makeTc(3, "5\n-5 -2 -8 -1 -4", "-1", true, "When all values are negative, the single least negative plot [-1] is chosen."));

			// Edge cases
			tcs.push(makeTc(4, "1\n-9999", "-9999"));
			tcs.push(makeTc(5, "1\n10000", "10000"));
			tcs.push(makeTc(6, "2\n-10 20", "20"));
			tcs.push(makeTc(7, "2\n20 -10", "20"));
			tcs.push(makeTc(8, "4\n-10 0 -10 0", "0"));

			for (let i = 9; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -2000, 2000);
				let maxSoFar = arr[0];
				let currMax = arr[0];
				for (let j = 1; j < arr.length; j++) {
					currMax = Math.max(arr[j], currMax + arr[j]);
					maxSoFar = Math.max(maxSoFar, currMax);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${maxSoFar}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -1000, 1000);
				let maxSoFar = arr[0];
				let currMax = arr[0];
				for (let j = 1; j < arr.length; j++) {
					currMax = Math.max(arr[j], currMax + arr[j]);
					maxSoFar = Math.max(maxSoFar, currMax);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${maxSoFar}`));
			}

			return tcs;
		},
	},

	// 3. Shield Wall Formations (Difference Array / Range Addition)
	{
		id: "shield-wall-formations",
		title: "Shield Wall Formations",
		difficulty: "Medium",
		category: "array",
		tags: ["array", "simulation"],
		description: "Apply multiple defensive barrier spells across continuous segments of the battle wall.",
		story: `<p>During the siege of Fort Ironclad, the garrison forms a shield wall consisting of <b>N</b> wall segments numbered <code>1</code> through <code>N</code>. All segments initially have a defensive armor rating of <code>0</code>.</p>
<p>The Court Mages cast <b>Q</b> enchantment spells. Each spell <code>j</code> targets a contiguous range of wall segments from <code>L[j]</code> to <code>R[j]</code> (1-indexed, inclusive) and increases the armor rating of each targeted segment by <code>V[j]</code>.</p>
<p>After all <b>Q</b> spells have been cast, the garrison captain must inspect the final armor value of every wall segment from 1 to N.</p>`,
		task: "Given N segments initially 0, and Q update operations [L, R, V], compute the final armor values across all N segments.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>Q</code>.</p>
<p>The next <code>Q</code> lines each contain three integers <code>L R V</code>, describing an enchantment spell.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers: the final armor ratings of segments 1 through N.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= Q <= 10^5",
			"1 <= L <= R <= N",
			"-10^4 <= V <= 10^4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1003);
			const tcs = [];

			tcs.push(makeTc(1, "5 3\n1 3 10\n2 5 5\n3 4 -2", "10 15 13 3 5", true, "Segment updates: [10, 10, 10, 0, 0] -> [10, 15, 15, 5, 5] -> [10, 15, 13, 3, 5]."));
			tcs.push(makeTc(2, "3 1\n1 3 7", "7 7 7", true, "One spell covers all 3 segments with +7."));
			tcs.push(makeTc(3, "4 2\n2 2 100\n4 4 50", "0 100 0 50", true, "Spells affect isolated individual segments."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const q = rng.nextInt(5, 50);
				const diff = new Array(n + 2).fill(0);
				const ops: string[] = [];
				for (let k = 0; k < q; k++) {
					const l = rng.nextInt(1, n);
					const r = rng.nextInt(l, n);
					const v = rng.nextInt(-100, 100);
					diff[l] += v;
					diff[r + 1] -= v;
					ops.push(`${l} ${r} ${v}`);
				}
				const res: number[] = [];
				let running = 0;
				for (let idx = 1; idx <= n; idx++) {
					running += diff[idx];
					res.push(running);
				}
				tcs.push(makeTc(i, `${n} ${q}\n${ops.join("\n")}`, res.join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const q = rng.nextInt(60, 150);
				const diff = new Int32Array(n + 2);
				const ops: string[] = [];
				for (let k = 0; k < q; k++) {
					const l = rng.nextInt(1, n);
					const r = rng.nextInt(l, n);
					const v = rng.nextInt(-50, 50);
					diff[l] += v;
					diff[r + 1] -= v;
					ops.push(`${l} ${r} ${v}`);
				}
				const res: number[] = [];
				let running = 0;
				for (let idx = 1; idx <= n; idx++) {
					running += diff[idx];
					res.push(running);
				}
				tcs.push(makeTc(i, `${n} ${q}\n${ops.join("\n")}`, res.join(" ")));
			}

			return tcs;
		},
	},

	// 4. The Wandering Alchemist's Stash (Array Cyclic Rotation)
	{
		id: "the-wandering-alchemists-stash",
		title: "The Wandering Alchemist's Stash",
		difficulty: "Easy",
		category: "array",
		tags: ["array", "simulation"],
		description: "Rotate the alchemical potion shelf cyclically to the right by K slots.",
		story: `<p>In the caravan of Alchemist Zephyr, potions are arranged neatly on a circular rotating shelf with <b>N</b> slots. Each slot contains a numbered elixir bottle <code>A[1], A[2], ..., A[N]</code>.</p>
<p>Before dawn, Zephyr turns the mechanical hand-crank to rotate the shelf cyclically to the <b>right</b> by <code>K</code> positions (meaning each potion shifts forward by <code>K</code> spots, and items shifting past the end wrap around to the front).</p>`,
		task: "Given array A of length N and an integer K, output the array after rotating it cyclically to the right by K positions.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>K</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers representing the rotated shelf.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= K <= 10^9",
			"-10^9 <= A[i] <= 10^9"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1004);
			const tcs = [];

			tcs.push(makeTc(1, "5 2\n1 2 3 4 5", "4 5 1 2 3", true, "Rotating [1, 2, 3, 4, 5] right by 2 shifts 4 and 5 to the front."));
			tcs.push(makeTc(2, "4 4\n10 20 30 40", "10 20 30 40", true, "Rotating by N leaves array unchanged."));
			tcs.push(makeTc(3, "3 0\n7 8 9", "7 8 9", true, "Rotating by 0 leaves array unchanged."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const k = rng.nextInt(0, 1000000000);
				const arr = rng.intArray(n, -1000, 1000);
				const shift = k % n;
				const res = shift === 0 ? [...arr] : arr.slice(n - shift).concat(arr.slice(0, n - shift));
				tcs.push(makeTc(i, `${n} ${k}\n${arr.join(" ")}`, res.join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const k = rng.nextInt(0, 1000000000);
				const arr = rng.intArray(n, -1000000, 1000000);
				const shift = k % n;
				const res = shift === 0 ? [...arr] : arr.slice(n - shift).concat(arr.slice(0, n - shift));
				tcs.push(makeTc(i, `${n} ${k}\n${arr.join(" ")}`, res.join(" ")));
			}

			return tcs;
		},
	},

	// 5. Beacon Towers of Gondor (Equilibrium Pivot Index)
	{
		id: "beacon-towers-of-gondor",
		title: "Beacon Towers of Gondor",
		difficulty: "Easy",
		category: "array",
		tags: ["array", "prefix-sum"],
		description: "Find the pivot beacon tower where signal power of towers to the left matches the right.",
		story: `<p>A ridge line across the White Mountains features <b>N</b> signal beacon towers in a line. Each tower <code>i</code> (1-indexed from 1 to N) burns with a luminescence power rating <code>A[i]</code>.</p>
<p>General Faramir wants to place the central relay commander at a <b>pivot tower <code>p</code></b> such that the sum of power ratings of all towers strictly to the left of <code>p</code> is strictly equal to the sum of power ratings of all towers strictly to the right of <code>p</code>.</p>
<p>If no towers exist to the left, the left sum is 0; similarly, if no towers exist to the right, the right sum is 0. If multiple pivot towers satisfy the condition, choose the <b>smallest 1-based index</b>. If none exists, output <code>-1</code>.</p>`,
		task: "Find the smallest 1-based index p such that sum(A[1..p-1]) == sum(A[p+1..N]), or -1 if none.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print a single integer: the 1-based index of the pivot tower, or -1 if none exists.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^4 <= A[i] <= 10^4"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1005);
			const tcs = [];

			tcs.push(makeTc(1, "6\n1 7 3 6 5 6", "4", true, "At index 4 (value 6): left sum is 1+7+3 = 11, right sum is 5+6 = 11."));
			tcs.push(makeTc(2, "3\n1 2 3", "-1", true, "No index satisfies the equilibrium balance."));
			tcs.push(makeTc(3, "3\n2 1 -1", "1", true, "At index 1: left sum = 0, right sum = 1 + (-1) = 0."));

			const solve = (arr: number[]): number => {
				let total = arr.reduce((a, b) => a + b, 0);
				let leftSum = 0;
				for (let i = 0; i < arr.length; i++) {
					if (leftSum === total - leftSum - arr[i]) {
						return i + 1;
					}
					leftSum += arr[i];
				}
				return -1;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -50, 50);
				// Sometimes construct an intentional pivot
				if (i % 3 === 0 && n >= 3) {
					const pivot = rng.nextInt(1, n - 2);
					let left = 0;
					for (let k = 0; k < pivot; k++) left += arr[k];
					let right = 0;
					for (let k = pivot + 1; k < n - 1; k++) right += arr[k];
					arr[n - 1] = left - right;
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${solve(arr)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -100, 100);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${solve(arr)}`));
			}

			return tcs;
		},
	},

	// 6. The Lost Expedition Supplies (Missing Number)
	{
		id: "the-lost-expedition-supplies",
		title: "The Lost Expedition Supplies",
		difficulty: "Easy",
		category: "array",
		tags: ["array", "math"],
		description: "Identify the single missing supply crate from an expedition inventory of 1 to N.",
		story: `<p>The Royal Cartographers set out into the jungle with <b>N</b> supply crates sequentially numbered <code>1, 2, ..., N</code>. Upon reaching base camp, the inventory clerk lists <b>N - 1</b> distinct crates remaining.</p>
<p>One critical supply crate was lost during the river crossing. Determine the number of the lost crate.</p>`,
		task: "Given N and an array of N-1 distinct integers in range [1..N], output the missing integer.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The second line contains <code>N - 1</code> space-separated integers in arbitrary order.</p>`,
		outputFormat: `<p>Print a single integer: the identity of the missing crate.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^5",
			"All given integers are distinct and between 1 and N"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1006);
			const tcs = [];

			tcs.push(makeTc(1, "5\n2 3 1 5", "4", true, "Crates 1, 2, 3, 5 are present; crate 4 is missing."));
			tcs.push(makeTc(2, "2\n2", "1", true, "Only crate 2 is present, crate 1 was lost."));
			tcs.push(makeTc(3, "4\n1 2 3", "4", true, "Crate 4 was lost."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const missing = rng.nextInt(1, n);
				const arr: number[] = [];
				for (let x = 1; x <= n; x++) {
					if (x !== missing) arr.push(x);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${n}\n${shuffled.join(" ")}`, `${missing}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const missing = rng.nextInt(1, n);
				const arr: number[] = [];
				for (let x = 1; x <= n; x++) {
					if (x !== missing) arr.push(x);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${n}\n${shuffled.join(" ")}`, `${missing}`));
			}

			return tcs;
		},
	},

	// 7. Caravan Merchandise Majority (Boyer-Moore Voting)
	{
		id: "caravan-merchandise-majority",
		title: "Caravan Merchandise Majority",
		difficulty: "Easy",
		category: "array",
		tags: ["array", "greedy"],
		description: "Find the dominant trade cargo item that appears strictly more than N/2 times.",
		story: `<p>A massive trade caravan from the Silk Oases arrives at the capital with <b>N</b> crates of merchandise. Each crate is stamped with an integer merchandise guild seal <code>A[i]</code>.</p>
<p>The Guild Council rules state that if one specific guild owns <b>strictly more than <code>floor(N / 2)</code></b> crates, they are granted priority docking at the grand bazaar. It is guaranteed that such a dominant majority seal always exists in the manifest.</p>`,
		task: "Given an array of N integers with a guaranteed majority element appearing > N/2 times, find that element.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print the majority guild seal integer.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i] <= 10^9",
			"A majority element is guaranteed to exist."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1007);
			const tcs = [];

			tcs.push(makeTc(1, "7\n3 2 3 1 3 4 3", "3", true, "Item 3 appears 4 times in an array of size 7, which is > 7/2."));
			tcs.push(makeTc(2, "3\n10 20 10", "10", true, "Item 10 appears 2 times, which is > 3/2."));
			tcs.push(makeTc(3, "1\n999", "999", true, "Single item array."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const majorityCount = Math.floor(n / 2) + 1 + rng.nextInt(0, Math.floor((n - 1) / 2));
				const majVal = rng.nextInt(-1000, 1000);
				const arr = new Array(majorityCount).fill(majVal);
				while (arr.length < n) {
					const other = rng.nextInt(-1000, 1000);
					if (other !== majVal) arr.push(other);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${n}\n${shuffled.join(" ")}`, `${majVal}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const majorityCount = Math.floor(n / 2) + 1 + rng.nextInt(0, Math.floor((n - 1) / 2));
				const majVal = rng.nextInt(-1000000, 1000000);
				const arr = new Array(majorityCount).fill(majVal);
				while (arr.length < n) {
					const other = rng.nextInt(-1000000, 1000000);
					if (other !== majVal) arr.push(other);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${n}\n${shuffled.join(" ")}`, `${majVal}`));
			}

			return tcs;
		},
	},

	// 8. The Emperor's Spiral Tomb (2D Matrix Spiral Traversal)
	{
		id: "the-emperors-spiral-tomb",
		title: "The Emperor's Spiral Tomb",
		difficulty: "Medium",
		category: "array",
		tags: ["array", "simulation", "matrix"],
		description: "Traverse an R x C grid in clockwise spiral order.",
		story: `<p>Archaeologists have uncovered the entrance chamber to Emperor Zhao's ancient burial palace. The chamber floor is paved with an <b>R x C</b> grid of stone tiles, each carved with a runic number.</p>
<p>To safely bypass the dart traps, one must walk the tiles in a <b>clockwise spiral order</b>, starting from the top-left tile (1,1), moving east along the top wall, then south down the right wall, west along the bottom, north along the left, and spiraling inward toward the center.</p>`,
		task: "Given an R x C matrix of integers, output the elements in clockwise spiral order.",
		inputFormat: `<p>The first line contains two integers <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain <code>C</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the <code>R * C</code> integers in clockwise spiral order on a single line, separated by spaces.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 300",
			"1 <= R * C <= 10^5",
			"-10^4 <= Matrix[i][j] <= 10^4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1008);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n1 2 3\n4 5 6\n7 8 9", "1 2 3 6 9 8 7 4 5", true, "Clockwise spiral: top row (1,2,3), right column (6,9), bottom row (8,7), left column (4), center (5)."));
			tcs.push(makeTc(2, "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12", "1 2 3 4 8 12 11 10 9 5 6 7", true, "Clockwise traversal of a rectangular 3x4 grid."));
			tcs.push(makeTc(3, "1 1\n42", "42", true, "Single cell grid."));

			const spiral = (grid: number[][], R: number, C: number): number[] => {
				const res: number[] = [];
				let top = 0, bottom = R - 1, left = 0, right = C - 1;
				while (top <= bottom && left <= right) {
					for (let col = left; col <= right; col++) res.push(grid[top][col]);
					top++;
					for (let row = top; row <= bottom; row++) res.push(grid[row][right]);
					right--;
					if (top <= bottom) {
						for (let col = right; col >= left; col--) res.push(grid[bottom][col]);
						bottom--;
					}
					if (left <= right) {
						for (let row = bottom; row >= top; row--) res.push(grid[row][left]);
						left++;
					}
				}
				return res;
			};

			for (let i = 4; i <= 75; i++) {
				const r = rng.nextInt(1, 20);
				const c = rng.nextInt(1, 20);
				const grid: number[][] = [];
				for (let row = 0; row < r; row++) {
					grid.push(rng.intArray(c, -50, 50));
				}
				const matrixStr = grid.map((row) => row.join(" ")).join("\n");
				const out = spiral(grid, r, c).join(" ");
				tcs.push(makeTc(i, `${r} ${c}\n${matrixStr}`, out));
			}

			for (let i = 76; i <= 100; i++) {
				const r = rng.nextInt(5, 15);
				const c = rng.nextInt(5, 15);
				const grid: number[][] = [];
				for (let row = 0; row < r; row++) {
					grid.push(rng.intArray(c, -100, 100));
				}
				const matrixStr = grid.map((row) => row.join(" ")).join("\n");
				const out = spiral(grid, r, c).join(" ");
				tcs.push(makeTc(i, `${r} ${c}\n${matrixStr}`, out));
			}

			return tcs;
		},
	},

	// 9. Fortress Wall Water Trapping (Trapping Rain Water)
	{
		id: "fortress-wall-water-trapping",
		title: "Fortress Wall Water Trapping",
		difficulty: "Hard",
		category: "array",
		tags: ["array", "two-pointers", "dynamic-programming"],
		description: "Compute the total rainwater trapped between fortress stone crenellations of varying heights.",
		story: `<p>The Citadel of Stormwind features an outer battlements line composed of <b>N</b> adjacent stone pillars of unit width (1 meter). Each pillar <code>i</code> has an elevation height <code>H[i]</code>.</p>
<p>After a relentless night of torrential rain, pools of water accumulate in the hollows between the pillars. Determine the total volume (in cubic meters) of rainwater trapped across the entire fortress wall.</p>`,
		task: "Given an elevation map represented by array H, compute how much water it can trap after raining.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated non-negative integers <code>H[1], H[2], ..., H[N]</code>.</p>`,
		outputFormat: `<p>Print a single integer: total trapped water volume.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= H[i] <= 10^5"
		]),
		points: 300,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1009);
			const tcs = [];

			tcs.push(makeTc(1, "12\n0 1 0 2 1 0 1 3 2 1 2 1", "6", true, "Traps 1 unit between cols 1 & 3, 4 units between cols 3 & 7, and 1 unit between cols 7 & 10 for a total of 6."));
			tcs.push(makeTc(2, "6\n4 2 0 3 2 5", "9", true, "Traps 2 + 4 + 1 + 2 = 9 units."));
			tcs.push(makeTc(3, "3\n1 2 3", "0", true, "Monotonically increasing heights cannot trap any water."));

			const trap = (h: number[]): number => {
				let left = 0, right = h.length - 1;
				let leftMax = 0, rightMax = 0;
				let water = 0;
				while (left < right) {
					if (h[left] < h[right]) {
						if (h[left] >= leftMax) leftMax = h[left];
						else water += leftMax - h[left];
						left++;
					} else {
						if (h[right] >= rightMax) rightMax = h[right];
						else water += rightMax - h[right];
						right--;
					}
				}
				return water;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const h = rng.intArray(n, 0, 50);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${trap(h)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const h = rng.intArray(n, 0, 1000);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${trap(h)}`));
			}

			return tcs;
		},
	},

	// 10. The King's Tournament Eliminations (Product of Array Except Self)
	{
		id: "the-kings-tournament-eliminations",
		title: "The King's Tournament Eliminations",
		difficulty: "Medium",
		category: "array",
		tags: ["array", "prefix-sum"],
		description: "Compute the combined power coefficient for each knight relative to all other knights modulo 1,000,000,007.",
		story: `<p>During the Midsummer Tournament, <b>N</b> champion knights enter the arena, each bearing a combat power rating <code>A[i]</code>.</p>
<p>To establish tournament balance, the Royal Grandmaster computes a handicap coefficient for each knight <code>i</code> equal to the <b>product of power ratings of all other knights except knight <code>i</code></b>. Because the product can grow astronomically, calculate each coefficient modulo <b>1,000,000,007 (10^9 + 7)</b>.</p>`,
		task: "Given an array A of length N, output an array P where P[i] is the product of all A[j] (j != i) modulo 10^9 + 7.",
		inputFormat: `<p>The first line contains an integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers: the product coefficients modulo 1,000,000,007.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^5",
			"1 <= A[i] <= 10^9"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1010);
			const tcs = [];
			const MOD = 1000000007n;

			tcs.push(makeTc(1, "4\n1 2 3 4", "24 12 8 6", true, "For index 1: 2*3*4=24; index 2: 1*3*4=12; index 3: 1*2*4=8; index 4: 1*2*3=6."));
			tcs.push(makeTc(2, "3\n5 10 2", "20 10 50", true, "Products: [10*2=20, 5*2=10, 5*10=50]."));
			tcs.push(makeTc(3, "2\n100 200", "200 100", true, "Two elements swap relative products."));

			const solve = (arr: bigint[]): bigint[] => {
				const n = arr.length;
				const prefix: bigint[] = new Array(n).fill(1n);
				const suffix: bigint[] = new Array(n).fill(1n);
				for (let i = 1; i < n; i++) prefix[i] = (prefix[i - 1] * arr[i - 1]) % MOD;
				for (let i = n - 2; i >= 0; i--) suffix[i] = (suffix[i + 1] * arr[i + 1]) % MOD;
				const res: bigint[] = new Array(n);
				for (let i = 0; i < n; i++) res[i] = (prefix[i] * suffix[i]) % MOD;
				return res;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, 1, 1000).map((x) => BigInt(x));
				const ans = solve(arr).join(" ");
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, ans));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, 1, 1000000).map((x) => BigInt(x));
				const ans = solve(arr).join(" ");
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, ans));
			}

			return tcs;
		},
	},
];
