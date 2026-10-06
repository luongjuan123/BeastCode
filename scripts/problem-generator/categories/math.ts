import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const mathProblems: ProblemDefinition[] = [
	// 21. The Pharaoh's Prime Gold (Count Primes - Sieve)
	{
		id: "the-pharaohs-prime-gold",
		title: "The Pharaoh's Prime Gold",
		difficulty: "Medium",
		category: "math",
		tags: ["math", "number-theory"],
		description: "Count the number of prime numbers strictly less than a given integer N.",
		story: `<p>In the royal mint of Ancient Memphis, Pharaoh Tutankhamun orders gold bars stamped only with prime serial numbers. The Chief Assayer must calculate how many distinct prime serial numbers exist that are <b>strictly less than <code>N</code></b>.</p>`,
		task: "Given an integer N, count the number of prime numbers strictly less than N.",
		inputFormat: `<p>A single line containing the integer <code>N</code>.</p>`,
		outputFormat: `<p>Print a single integer: the count of prime numbers less than N.</p>`,
		constraints: formatConstraints([
			"0 <= N <= 5 * 10^6"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3001);
			const tcs = [];

			tcs.push(makeTc(1, "10", "4", true, "Primes less than 10 are 2, 3, 5, 7. Count = 4."));
			tcs.push(makeTc(2, "0", "0", true, "No primes less than 0."));
			tcs.push(makeTc(3, "1", "0", true, "No primes less than 1."));

			// Fast sieve solver
			const countPrimes = (n: number): number => {
				if (n <= 2) return 0;
				const isPrime = new Uint8Array(n);
				isPrime.fill(1);
				isPrime[0] = 0;
				isPrime[1] = 0;
				for (let i = 2; i * i < n; i++) {
					if (isPrime[i]) {
						for (let j = i * i; j < n; j += i) isPrime[j] = 0;
					}
				}
				let count = 0;
				for (let i = 2; i < n; i++) if (isPrime[i]) count++;
				return count;
			};

			tcs.push(makeTc(4, "2", "0"));
			tcs.push(makeTc(5, "3", "1"));
			tcs.push(makeTc(6, "4", "2"));
			tcs.push(makeTc(7, "5", "2"));
			tcs.push(makeTc(8, "20", "8"));
			tcs.push(makeTc(9, "100", "25"));
			tcs.push(makeTc(10, "1000", "168"));

			for (let i = 11; i <= 75; i++) {
				const n = rng.nextInt(10, 50000);
				tcs.push(makeTc(i, `${n}`, `${countPrimes(n)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(500000, 2000000);
				tcs.push(makeTc(i, `${n}`, `${countPrimes(n)}`));
			}

			return tcs;
		},
	},

	// 22. The Clockwork Observatory (Greatest Common Divisor of Array)
	{
		id: "the-clockwork-observatory",
		title: "The Clockwork Observatory",
		difficulty: "Easy",
		category: "math",
		tags: ["math", "number-theory"],
		description: "Find the greatest common divisor of an array of N celestial gear teeth counts.",
		story: `<p>The Clockwork Observatory tracks cosmic cycles with <b>N</b> intermeshing bronze gearwheels. Each gear has a tooth count <code>A[i]</code>. To calibrate the grand master clock, astronomers must find the <b>Greatest Common Divisor (GCD)</b> of all gear tooth counts.</p>`,
		task: "Given an array A of N positive integers, compute the GCD of all elements.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated positive integers <code>A[1], A[2], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print a single integer: the GCD of the entire array.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= A[i] <= 10^9"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3002);
			const tcs = [];

			tcs.push(makeTc(1, "4\n12 24 36 60", "12", true, "12 divides all elements."));
			tcs.push(makeTc(2, "3\n7 11 13", "1", true, "Coprime numbers have GCD 1."));
			tcs.push(makeTc(3, "1\n42", "42", true, "GCD of single element is itself."));

			const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const g = BigInt(rng.nextInt(1, 500));
				const arr: bigint[] = [];
				for (let k = 0; k < n; k++) {
					arr.push(g * BigInt(rng.nextInt(1, 10000)));
				}
				let currentGcd = arr[0];
				for (let k = 1; k < n; k++) currentGcd = gcd(currentGcd, arr[k]);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${currentGcd}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const g = BigInt(rng.nextInt(1, 10000));
				const arr: bigint[] = [];
				for (let k = 0; k < n; k++) {
					arr.push(g * BigInt(rng.nextInt(1, 100000)));
				}
				let currentGcd = arr[0];
				for (let k = 1; k < n; k++) currentGcd = gcd(currentGcd, arr[k]);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, `${currentGcd}`));
			}

			return tcs;
		},
	},

	// 23. Mystic Powers of the Oracle (Fast Modular Exponentiation)
	{
		id: "mystic-powers-of-the-oracle",
		title: "Mystic Powers of the Oracle",
		difficulty: "Medium",
		category: "math",
		tags: ["math", "number-theory"],
		description: "Compute (A^B) mod M efficiently for large exponents.",
		story: `<p>Deep inside the Temple of Delphi, the Oracle channels mystical energy. The ritual power grows exponentially: base power <code>A</code> compounded over <code>B</code> lunar cycles, bounded by a cosmic ward of size <code>M</code>. Compute <b>(A^B) mod M</b>.</p>`,
		task: "Given three integers A, B, and M, compute (A^B) mod M.",
		inputFormat: `<p>A single line containing three integers <code>A B M</code>.</p>`,
		outputFormat: `<p>Print a single integer: (A^B) mod M.</p>`,
		constraints: formatConstraints([
			"0 <= A <= 10^18",
			"0 <= B <= 10^18",
			"1 <= M <= 10^9 + 7"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3003);
			const tcs = [];

			const modPow = (base: bigint, exp: bigint, mod: bigint): bigint => {
				if (mod === 1n) return 0n;
				let res = 1n;
				base = base % mod;
				while (exp > 0n) {
					if (exp % 2n === 1n) res = (res * base) % mod;
					base = (base * base) % mod;
					exp /= 2n;
				}
				return res;
			};

			tcs.push(makeTc(1, "2 10 1000", "24", true, "2^10 = 1024, 1024 mod 1000 = 24."));
			tcs.push(makeTc(2, "5 0 13", "1", true, "Any number to power 0 is 1."));
			tcs.push(makeTc(3, "7 25 1", "0", true, "Modulo 1 is always 0."));

			tcs.push(makeTc(4, "0 0 10", "1"));
			tcs.push(makeTc(5, "0 100 10", "0"));
			tcs.push(makeTc(6, "100 1 1000", "100"));

			for (let i = 7; i <= 75; i++) {
				const a = BigInt(rng.nextInt(1, 1000000));
				const b = BigInt(rng.nextInt(1, 1000000000));
				const m = BigInt(rng.nextInt(2, 1000000000));
				tcs.push(makeTc(i, `${a} ${b} ${m}`, `${modPow(a, b, m)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const a = rng.nextBigInt(1000000000000n, 1000000000000000000n);
				const b = rng.nextBigInt(1000000000000n, 1000000000000000000n);
				const m = BigInt(rng.nextInt(1000000, 1000000007));
				tcs.push(makeTc(i, `${a} ${b} ${m}`, `${modPow(a, b, m)}`));
			}

			return tcs;
		},
	},

	// 24. The Alchemist's Fibonacci Elixir (Fibonacci Modulo 10^9 + 7)
	{
		id: "the-alchemists-fibonacci-elixir",
		title: "The Alchemist's Fibonacci Elixir",
		difficulty: "Medium",
		category: "math",
		tags: ["math", "dynamic-programming"],
		description: "Compute the N-th Fibonacci number modulo 1,000,000,007.",
		story: `<p>In the Tower of Spells, an enchanted beaker doubles in potency according to the Fibonacci recurrence: <code>F(0) = 0</code>, <code>F(1) = 1</code>, and <code>F(n) = F(n-1) + F(n-2)</code>. Determine <b>F(N) modulo 1,000,000,007</b>.</p>`,
		task: "Given non-negative integer N, output F(N) % (10^9 + 7).",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print F(N) % 1000000007.</p>`,
		constraints: formatConstraints([
			"0 <= N <= 10^18"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3004);
			const tcs = [];
			const MOD = 1000000007n;

			// Matrix exp for Fib
			const mul = (A: bigint[][], B: bigint[][]): bigint[][] => [
				[(A[0][0]*B[0][0] + A[0][1]*B[1][0]) % MOD, (A[0][0]*B[0][1] + A[0][1]*B[1][1]) % MOD],
				[(A[1][0]*B[0][0] + A[1][1]*B[1][0]) % MOD, (A[1][0]*B[0][1] + A[1][1]*B[1][1]) % MOD]
			];

			const fib = (n: bigint): bigint => {
				if (n === 0n) return 0n;
				let M = [[1n, 1n], [1n, 0n]];
				let res = [[1n, 0n], [0n, 1n]];
				let p = n - 1n;
				while (p > 0n) {
					if (p % 2n === 1n) res = mul(res, M);
					M = mul(M, M);
					p /= 2n;
				}
				return res[0][0];
			};

			tcs.push(makeTc(1, "2", "1", true, "F(2) = 1."));
			tcs.push(makeTc(2, "3", "2", true, "F(3) = 2."));
			tcs.push(makeTc(3, "4", "3", true, "F(4) = 3."));
			tcs.push(makeTc(4, "0", "0"));
			tcs.push(makeTc(5, "1", "1"));
			tcs.push(makeTc(6, "10", "55"));
			tcs.push(makeTc(7, "50", "586268941"));

			for (let i = 8; i <= 75; i++) {
				const n = BigInt(rng.nextInt(10, 1000000));
				tcs.push(makeTc(i, `${n}`, `${fib(n)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextBigInt(10000000000n, 1000000000000000000n);
				tcs.push(makeTc(i, `${n}`, `${fib(n)}`));
			}

			return tcs;
		},
	},

	// 25. The Treasurer's Coin Cycles (LCM of Two Numbers)
	{
		id: "the-treasurers-coin-cycles",
		title: "The Treasurer's Coin Cycles",
		difficulty: "Easy",
		category: "math",
		tags: ["math", "number-theory"],
		description: "Compute the Least Common Multiple (LCM) of two integers A and B.",
		story: `<p>Two rival merchant galleons sail between ports on fixed periodic intervals of <code>A</code> days and <code>B</code> days respectively. Starting on day 0, find the earliest day <code>D > 0</code> when both galleons will dock at the royal harbor simultaneously.</p>`,
		task: "Given two positive integers A and B, compute their Least Common Multiple (LCM).",
		inputFormat: `<p>A single line containing two integers <code>A</code> and <code>B</code>.</p>`,
		outputFormat: `<p>Print the LCM of A and B.</p>`,
		constraints: formatConstraints([
			"1 <= A, B <= 10^9"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3005);
			const tcs = [];
			const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));

			tcs.push(makeTc(1, "4 6", "12", true, "LCM(4, 6) = 12."));
			tcs.push(makeTc(2, "5 7", "35", true, "LCM of coprimes is their product."));
			tcs.push(makeTc(3, "10 10", "10", true, "LCM of identical numbers."));

			for (let i = 4; i <= 75; i++) {
				const a = BigInt(rng.nextInt(1, 100000));
				const b = BigInt(rng.nextInt(1, 100000));
				const lcm = (a * b) / gcd(a, b);
				tcs.push(makeTc(i, `${a} ${b}`, `${lcm}`));
			}

			for (let i = 76; i <= 100; i++) {
				const a = BigInt(rng.nextInt(100000, 1000000000));
				const b = BigInt(rng.nextInt(100000, 1000000000));
				const lcm = (a * b) / gcd(a, b);
				tcs.push(makeTc(i, `${a} ${b}`, `${lcm}`));
			}

			return tcs;
		},
	},

	// 26. The King's Palindrome Number (Integer Palindrome)
	{
		id: "the-kings-palindrome-number",
		title: "The King's Palindrome Number",
		difficulty: "Easy",
		category: "math",
		tags: ["math", "simulation"],
		description: "Determine whether an integer reads the same backward as forward without converting to string.",
		story: `<p>The Royal Chancellor validates serial codes on tax documents. A code is considered authentic if its integer representation is a palindrome in base 10 (negative numbers are never palindromes due to the leading minus sign).</p>`,
		task: "Given an integer X, print 'YES' if X is a palindrome, or 'NO' otherwise.",
		inputFormat: `<p>A single line containing integer <code>X</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"-2^31 <= X <= 2^31 - 1"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3006);
			const tcs = [];

			tcs.push(makeTc(1, "121", "YES", true, "121 reads identically backwards."));
			tcs.push(makeTc(2, "-121", "NO", true, "Reads 121- backwards, not a palindrome."));
			tcs.push(makeTc(3, "10", "NO", true, "Reads 01 backwards."));

			const isPal = (x: number): boolean => {
				if (x < 0) return false;
				if (x % 10 === 0 && x !== 0) return false;
				let rev = 0;
				let temp = x;
				while (temp > rev) {
					rev = rev * 10 + (temp % 10);
					temp = Math.floor(temp / 10);
				}
				return temp === rev || temp === Math.floor(rev / 10);
			};

			tcs.push(makeTc(4, "0", "YES"));
			tcs.push(makeTc(5, "7", "YES"));
			tcs.push(makeTc(6, "11", "YES"));
			tcs.push(makeTc(7, "1001", "YES"));

			for (let i = 8; i <= 75; i++) {
				let x = 0;
				if (i % 2 === 0) {
					const half = `${rng.nextInt(1, 9999)}`;
					x = parseInt(half + half.split("").reverse().join(""), 10);
				} else {
					x = rng.nextInt(-10000000, 10000000);
				}
				tcs.push(makeTc(i, `${x}`, isPal(x) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const x = rng.nextInt(1000000, 2147483647);
				tcs.push(makeTc(i, `${x}`, isPal(x) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 27. The Factor Tree of Yggdrasil (Prime Factorization)
	{
		id: "the-factor-tree-of-yggdrasil",
		title: "The Factor Tree of Yggdrasil",
		difficulty: "Medium",
		category: "math",
		tags: ["math", "number-theory"],
		description: "Compute the prime factorization of a positive integer N in ascending order.",
		story: `<p>In Norse cosmology, Yggdrasil branches into elemental energies. Every enchanted relic with energy <code>N</code> can be decomposed uniquely into a product of prime roots <code>p1^e1 * p2^e2 * ...</code>. List all prime factors in ascending order, repeated by their exponents.</p>`,
		task: "Given integer N, output its prime factors in non-decreasing order separated by spaces.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print the prime factors of N in ascending order separated by spaces.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 10^12"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3007);
			const tcs = [];

			const factorize = (n: bigint): bigint[] => {
				const factors: bigint[] = [];
				let d = 2n;
				while (d * d <= n) {
					while (n % d === 0n) {
						factors.push(d);
						n /= d;
					}
					d += 1n;
				}
				if (n > 1n) factors.push(n);
				return factors;
			};

			tcs.push(makeTc(1, "12", "2 2 3", true, "12 = 2 * 2 * 3."));
			tcs.push(makeTc(2, "13", "13", true, "13 is prime."));
			tcs.push(makeTc(3, "100", "2 2 5 5", true, "100 = 2 * 2 * 5 * 5."));

			for (let i = 4; i <= 75; i++) {
				const n = BigInt(rng.nextInt(2, 1000000));
				tcs.push(makeTc(i, `${n}`, factorize(n).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextBigInt(100000000n, 1000000000000n);
				tcs.push(makeTc(i, `${n}`, factorize(n).join(" ")));
			}

			return tcs;
		},
	},

	// 28. Trailing Zeros in the Sacred Factorial (Factorial Trailing Zeros)
	{
		id: "trailing-zeros-in-the-sacred-factorial",
		title: "Trailing Zeros in the Sacred Factorial",
		difficulty: "Medium",
		category: "math",
		tags: ["math"],
		description: "Count the number of trailing zeroes in N!.",
		story: `<p>During the Equinox ritual, high priests calculate permutations of <b>N</b> sacred artifacts. The value of <code>N!</code> is colossal, but the High Priest only needs to know how many <b>trailing zeros</b> terminate the decimal representation of <code>N!</code>.</p>`,
		task: "Given integer N, return the number of trailing zeroes in N!.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print the number of trailing zeroes in N!.</p>`,
		constraints: formatConstraints([
			"0 <= N <= 10^9"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3008);
			const tcs = [];

			const countZeros = (n: number): number => {
				let zeros = 0;
				while (n >= 5) {
					zeros += Math.floor(n / 5);
					n = Math.floor(n / 5);
				}
				return zeros;
			};

			tcs.push(makeTc(1, "3", "0", true, "3! = 6, no trailing zero."));
			tcs.push(makeTc(2, "5", "1", true, "5! = 120, one trailing zero."));
			tcs.push(makeTc(3, "0", "0", true, "0! = 1, zero trailing zeros."));

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(1, 100000);
				tcs.push(makeTc(i, `${n}`, `${countZeros(n)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(1000000, 1000000000);
				tcs.push(makeTc(i, `${n}`, `${countZeros(n)}`));
			}

			return tcs;
		},
	},

	// 29. The Mathematician's Super Power (Power of Two Check)
	{
		id: "the-mathematicians-super-power",
		title: "The Mathematician's Super Power",
		difficulty: "Easy",
		category: "math",
		tags: ["math", "bit-manipulation"],
		description: "Determine whether a given 64-bit integer is a power of two.",
		story: `<p>In the Guild of Artificers, runic gears only mesh if their energy frequency is an exact power of two (i.e. <code>2^k</code> for some non-negative integer <code>k</code>). Determine if a given positive integer <code>N</code> is a power of two.</p>`,
		task: "Given integer N, print 'YES' if N is a power of two, or 'NO' otherwise.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"-2^63 <= N <= 2^63 - 1"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3009);
			const tcs = [];

			tcs.push(makeTc(1, "1", "YES", true, "2^0 = 1."));
			tcs.push(makeTc(2, "16", "YES", true, "2^4 = 16."));
			tcs.push(makeTc(3, "3", "NO", true, "3 is not a power of two."));

			const isPowerOfTwo = (n: bigint): boolean => {
				return n > 0n && (n & (n - 1n)) === 0n;
			};

			tcs.push(makeTc(4, "0", "NO"));
			tcs.push(makeTc(5, "-16", "NO"));
			tcs.push(makeTc(6, "1024", "YES"));
			tcs.push(makeTc(7, "1023", "NO"));

			for (let i = 8; i <= 75; i++) {
				let val: bigint;
				if (i % 2 === 0) {
					const p = BigInt(rng.nextInt(0, 60));
					val = 1n << p;
				} else {
					val = BigInt(rng.nextInt(1, 1000000000));
					if (isPowerOfTwo(val)) val += 1n;
				}
				tcs.push(makeTc(i, `${val}`, isPowerOfTwo(val) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const p = BigInt(rng.nextInt(0, 62));
				let val = (1n << p);
				if (i % 2 === 1) val += 3n;
				tcs.push(makeTc(i, `${val}`, isPowerOfTwo(val) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 30. Catalan Paths to the Celestial Citadel (N-th Catalan Number)
	{
		id: "catalan-paths-to-the-celestial-citadel",
		title: "Catalan Paths to the Celestial Citadel",
		difficulty: "Hard",
		category: "math",
		tags: ["math", "combinatorics"],
		description: "Compute the N-th Catalan number modulo 1,000,000,007.",
		story: `<p>The Celestial Citadel is reachable through a grid of mountain staircases. A valid ascension route of <code>2N</code> steps consists of <code>N</code> steps northeast and <code>N</code> steps southeast, such that the path never dips below the initial mountain baseline. Find the number of valid routes (the <b>N-th Catalan Number</b>) modulo <code>1,000,000,007</code>.</p>`,
		task: "Given integer N, compute C(N) = (1 / (N + 1)) * (2N choose N) modulo 10^9 + 7.",
		inputFormat: `<p>A single line containing integer <code>N</code>.</p>`,
		outputFormat: `<p>Print C(N) % 1000000007.</p>`,
		constraints: formatConstraints([
			"0 <= N <= 10^5"
		]),
		points: 300,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(3010);
			const tcs = [];
			const MOD = 1000000007n;

			const modPow = (b: bigint, e: bigint): bigint => {
				let res = 1n;
				b = b % MOD;
				while (e > 0n) {
					if (e % 2n === 1n) res = (res * b) % MOD;
					b = (b * b) % MOD;
					e /= 2n;
				}
				return res;
			};
			const modInv = (n: bigint): bigint => modPow(n, MOD - 2n);

			// Precompute factorials for up to 200,000
			const MAX_FAC = 200005;
			const fact: bigint[] = new Array(MAX_FAC);
			fact[0] = 1n;
			for (let i = 1; i < MAX_FAC; i++) fact[i] = (fact[i - 1] * BigInt(i)) % MOD;

			const catalan = (n: number): bigint => {
				if (n === 0) return 1n;
				const num = fact[2 * n];
				const den = (fact[n + 1] * fact[n]) % MOD;
				return (num * modInv(den)) % MOD;
			};

			tcs.push(makeTc(1, "3", "5", true, "C(3) = 5."));
			tcs.push(makeTc(2, "4", "14", true, "C(4) = 14."));
			tcs.push(makeTc(3, "0", "1", true, "C(0) = 1."));

			tcs.push(makeTc(4, "1", "1"));
			tcs.push(makeTc(5, "2", "2"));
			tcs.push(makeTc(6, "5", "42"));
			tcs.push(makeTc(7, "10", "16796"));

			for (let i = 8; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				tcs.push(makeTc(i, `${n}`, `${catalan(n)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(5000, 100000);
				tcs.push(makeTc(i, `${n}`, `${catalan(n)}`));
			}

			return tcs;
		},
	},
];
