import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const bitmaskProblems: ProblemDefinition[] = [
	// 91. The Lone Sentinel of the Dune (Single Number)
	{
		id: "the-lone-sentinel-of-the-dune",
		title: "The Lone Sentinel of the Dune",
		difficulty: "Easy",
		category: "bit-manipulation",
		tags: ["bit-manipulation", "array"],
		description: "Find the single element in an array where every other element appears exactly twice.",
		story: `<p>In the vast dunes of Al-Kharid, nomadic sentinels travel in bonded twin pairs sharing identical spirit frequencies. One lone sentinel wanders without a twin. Detect the frequency of the solitary sentinel using bitwise resonance.</p>`,
		task: "Every element in nums appears twice except for one. Find and return that unique single element.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers.</p>`,
		outputFormat: `<p>Print the single unique integer.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 3 * 10^4",
			"N is odd",
			"Every element appears twice except one"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(11001);
			const tcs = [];

			tcs.push(makeTc(1, "3\n2 2 1", "1", true, "2 appears twice, 1 appears once."));
			tcs.push(makeTc(2, "5\n4 1 2 1 2", "4", true, "1 and 2 appear twice, 4 is unique."));
			tcs.push(makeTc(3, "1\n99", "99", true, "Single element is 99."));

			const singleNumber = (nums: number[]): number => {
				let xor = 0;
				for (const x of nums) xor ^= x;
				return xor;
			};

			for (let i = 4; i <= 75; i++) {
				const pairs = rng.nextInt(2, 50);
				const unique = rng.nextInt(-1000, 1000);
				const arr: number[] = [unique];
				for (let p = 0; p < pairs; p++) {
					const val = rng.nextInt(-1000, 1000);
					arr.push(val, val);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${shuffled.length}\n${shuffled.join(" ")}`, singleNumber(shuffled).toString()));
			}

			for (let i = 76; i <= 100; i++) {
				const pairs = rng.nextInt(20, 60);
				const unique = rng.nextInt(-10000, 10000);
				const arr: number[] = [unique];
				for (let p = 0; p < pairs; p++) {
					const val = rng.nextInt(-10000, 10000);
					arr.push(val, val);
				}
				const shuffled = rng.shuffle(arr);
				tcs.push(makeTc(i, `${shuffled.length}\n${shuffled.join(" ")}`, singleNumber(shuffled).toString()));
			}

			return tcs;
		},
	},

	// 92. Counting Stars in the Binary Constellation (Counting Bits)
	{
		id: "counting-stars-in-the-binary-constellation",
		title: "Counting Stars in the Binary Constellation",
		difficulty: "Easy",
		category: "bit-manipulation",
		tags: ["bit-manipulation", "dynamic-programming"],
		description: "Given integer N, return an array of length N+1 where ans[i] is the number of 1s in the binary representation of i.",
		story: `<p>In the celestial ledger, each integer <code>i</code> from <code>0</code> to <code>N</code> corresponds to a cosmic rune. The power of the rune equals the Hamming weight: the number of active <code>1</code> bits in its binary glyph.</p>`,
		task: "Given integer N, return an array ans of length N + 1 where ans[i] is the count of 1's in the binary representation of i.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print <code>N + 1</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"0 <= N <= 10^5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(11002);
			const tcs = [];

			tcs.push(makeTc(1, "2", "0 1 1", true, "0 -> 0, 1 -> 1, 2 (10_2) -> 1."));
			tcs.push(makeTc(2, "5", "0 1 1 2 1 2", true, "Counts of 1s for 0 to 5."));
			tcs.push(makeTc(3, "0", "0", true, "N=0 output is 0."));

			const countBits = (n: number): number[] => {
				const ans = new Array(n + 1).fill(0);
				for (let i = 1; i <= n; i++) {
					ans[i] = ans[i >> 1] + (i & 1);
				}
				return ans;
			};

			for (let i = 4; i <= 60; i++) {
				const n = rng.nextInt(3, 500);
				tcs.push(makeTc(i, n.toString(), countBits(n).join(" ")));
			}

			for (let i = 61; i <= 100; i++) {
				const n = rng.nextInt(50, 150);
				tcs.push(makeTc(i, n.toString(), countBits(n).join(" ")));
			}

			return tcs;
		},
	},

	// 93. Arcane Addition Without Arithmetic (Sum of Two Integers Bitwise)
	{
		id: "arcane-addition-without-arithmetic",
		title: "Arcane Addition Without Arithmetic",
		difficulty: "Medium",
		category: "bit-manipulation",
		tags: ["bit-manipulation", "math"],
		description: "Calculate the sum of two integers a and b using bitwise operations without '+' or '-'.",
		story: `<p>In the Void of Anti-Arithmetic, mathematical operators <code>+</code> and <code>-</code> are forbidden by high decree. An initiate sorcerer must compute the total mana combining two crystal reservoirs <code>a</code> and <code>b</code> using only bitwise logic gates (XOR, AND, SHIFT).</p>`,
		task: "Return the integer sum a + b without using '+' or '-'.",
		inputFormat: `<p>A single line containing integers <code>a</code> and <code>b</code>.</p>`,
		outputFormat: `<p>Print the sum integer.</p>`,
		constraints: formatConstraints([
			"-1000 <= a, b <= 1000"
		]),
		points: 130,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(11003);
			const tcs = [];

			tcs.push(makeTc(1, "1 2", "3", true, "1 + 2 = 3."));
			tcs.push(makeTc(2, "2 3", "5", true, "2 + 3 = 5."));
			tcs.push(makeTc(3, "-1 1", "0", true, "-1 + 1 = 0."));

			const getSum = (a: number, b: number): number => {
				while (b !== 0) {
					const carry = (a & b) << 1;
					a = a ^ b;
					b = carry;
				}
				return a;
			};

			for (let i = 4; i <= 100; i++) {
				const a = rng.nextInt(-1000, 1000);
				const b = rng.nextInt(-1000, 1000);
				tcs.push(makeTc(i, `${a} ${b}`, getSum(a, b).toString()));
			}

			return tcs;
		},
	},

	// 94. Reversing the Sacred Binary Mirror (Reverse Bits)
	{
		id: "reversing-the-sacred-binary-mirror",
		title: "Reversing the Sacred Binary Mirror",
		difficulty: "Easy",
		category: "bit-manipulation",
		tags: ["bit-manipulation"],
		description: "Reverse the 32 bits of a given unsigned integer and return the resulting value.",
		story: `<p>The Mirror of Silver reflects the astral plane in inverted polarity. A 32-bit unsigned celestial identifier <code>N</code> when projected into the mirror has its binary representation completely reversed from bit 0 to bit 31.</p>`,
		task: "Reverse the bits of a 32-bit unsigned integer and print the resulting decimal integer.",
		inputFormat: `<p>A single line containing an unsigned 32-bit integer <code>N</code>.</p>`,
		outputFormat: `<p>Print the resulting 32-bit unsigned integer in decimal.</p>`,
		constraints: formatConstraints([
			"0 <= N < 2^32"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(11004);
			const tcs = [];

			tcs.push(makeTc(1, "43261596", "964176192", true, "43261596 in binary reversed is 964176192."));
			tcs.push(makeTc(2, "0", "0", true, "0 reversed is 0."));
			tcs.push(makeTc(3, "4294967295", "4294967295", true, "All 1s reversed remains all 1s."));

			const reverseBits = (n: bigint): bigint => {
				let result = 0n;
				for (let i = 0n; i < 32n; i++) {
					result = (result << 1n) | ((n >> i) & 1n);
				}
				return result;
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextBigInt(1n, 4294967290n);
				const ans = reverseBits(n);
				tcs.push(makeTc(i, n.toString(), ans.toString()));
			}

			return tcs;
		},
	},

	// 95. The Bitwise Conjunction of the Eclipse (Bitwise AND of Numbers Range)
	{
		id: "the-bitwise-conjunction-of-the-eclipse",
		title: "The Bitwise Conjunction of the Eclipse",
		difficulty: "Medium",
		category: "bit-manipulation",
		tags: ["bit-manipulation"],
		description: "Compute the bitwise AND of all integers in the inclusive range [left, right].",
		story: `<p>During the Great Eclipse of Helios, all cosmic frequencies in the numerical spectrum between <code>left</code> and <code>right</code> (inclusive) undergo harmonic interference, resulting in the bitwise AND product of every integer in the interval.</p>`,
		task: "Given range [left, right], return the bitwise AND of all numbers in this range, inclusive.",
		inputFormat: `<p>A single line containing integers <code>left</code> and <code>right</code>.</p>`,
		outputFormat: `<p>Print the bitwise AND result.</p>`,
		constraints: formatConstraints([
			"0 <= left <= right <= 2^31 - 1"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(11005);
			const tcs = [];

			tcs.push(makeTc(1, "5 7", "4", true, "5 & 6 & 7 = 4."));
			tcs.push(makeTc(2, "0 0", "0", true, "Range [0, 0] gives 0."));
			tcs.push(makeTc(3, "1 2147483647", "0", true, "Wide range crossing powers of 2 clears all bits to 0."));

			const rangeBitwiseAnd = (left: number, right: number): number => {
				let shift = 0;
				while (left < right) {
					left >>= 1;
					right >>= 1;
					shift++;
				}
				return left << shift;
			};

			for (let i = 4; i <= 100; i++) {
				const left = rng.nextInt(0, 100000);
				const diff = rng.nextInt(0, 50000);
				const right = left + diff;
				const ans = rangeBitwiseAnd(left, right);
				tcs.push(makeTc(i, `${left} ${right}`, ans.toString()));
			}

			return tcs;
		},
	},
];
