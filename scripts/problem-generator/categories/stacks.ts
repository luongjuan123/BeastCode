import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const stackProblems: ProblemDefinition[] = [
	// 57. Citadel Defense Towers (Daily Temperatures / Next Warmer Day)
	{
		id: "citadel-defense-towers",
		title: "Citadel Defense Towers",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "monotonic-stack"],
		description: "For each watch day, find how many days to wait until a strictly warmer temperature arrives.",
		story: `<p>In the frozen northern fortress of Wintergarde, the garrison records daily temperatures <code>T[1], ..., T[N]</code>. For each day <code>i</code>, the commander wants to know how many days they must wait until a <b>strictly warmer day</b> arrives. If no future day is warmer, output <code>0</code> for that day.</p>`,
		task: "Given array T of temperatures, return an array answer where answer[i] is the number of days until a warmer temperature, or 0.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>T[1], ..., T[N]</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"30 <= T[i] <= 100"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7001);
			const tcs = [];

			tcs.push(makeTc(1, "8\n73 74 75 71 69 72 76 73", "1 1 4 2 1 1 0 0", true, "Days to wait: 73->74 (1), 74->75 (1), 75->76 (4), 71->72 (2), 69->72 (1), 72->76 (1), 76->none (0), 73->none (0)."));
			tcs.push(makeTc(2, "4\n30 40 50 60", "1 1 1 0", true, "Strictly increasing temperatures."));
			tcs.push(makeTc(3, "3\n30 60 90", "1 1 0", true, "All warmer next day except last."));

			const dailyTemperatures = (temperatures: number[]): number[] => {
				const n = temperatures.length;
				const ans = new Array(n).fill(0);
				const stack: number[] = [];
				for (let i = 0; i < n; i++) {
					while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
						const prevIdx = stack.pop()!;
						ans[prevIdx] = i - prevIdx;
					}
					stack.push(i);
				}
				return ans;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const t = rng.intArray(n, 30, 100);
				tcs.push(makeTc(i, `${n}\n${t.join(" ")}`, dailyTemperatures(t).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const t = rng.intArray(n, 30, 100);
				tcs.push(makeTc(i, `${n}\n${t.join(" ")}`, dailyTemperatures(t).join(" ")));
			}

			return tcs;
		},
	},

	// 58. Bracket Glyphs of the Mage (Valid Parentheses)
	{
		id: "bracket-glyphs-of-the-mage",
		title: "Bracket Glyphs of the Mage",
		difficulty: "Easy",
		category: "stack",
		tags: ["stack", "string"],
		description: "Determine whether a magical runic bracket expression is properly nested and closed.",
		story: `<p>In scribing arcane spell scrolls, magical sigils use three types of boundary brackets: round <code>()</code>, square <code>[]</code>, and curly <code>{}</code>. An incantation is stable if every opening bracket is closed by the same type of bracket in the correct last-in-first-out order.</p>`,
		task: "Given string S containing '()[]{}', print 'YES' if S is valid, or 'NO'.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 10^5",
			"S consists only of parentheses '()[]{}'."
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7002);
			const tcs = [];

			tcs.push(makeTc(1, "()[]{}", "YES", true, "Properly nested consecutive brackets."));
			tcs.push(makeTc(2, "(]", "NO", true, "Mismatched bracket types."));
			tcs.push(makeTc(3, "([)]", "NO", true, "Improper closing order."));
			tcs.push(makeTc(4, "{[]}", "YES", true, "Nested brackets."));

			const isValid = (s: string): boolean => {
				const stack: string[] = [];
				const map: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
				for (const c of s) {
					if (c === "(" || c === "[" || c === "{") {
						stack.push(c);
					} else {
						if (stack.length === 0 || stack.pop() !== map[c]) return false;
					}
				}
				return stack.length === 0;
			};

			for (let i = 5; i <= 75; i++) {
				const len = rng.nextInt(2, 200);
				let s = "";
				if (i % 2 === 0) {
					// build valid
					const pairs = ["()", "[]", "{}"];
					for (let k = 0; k < len; k++) {
						const p = rng.choice(pairs);
						const pos = rng.nextInt(0, s.length);
						s = s.slice(0, pos) + p + s.slice(pos);
					}
				} else {
					for (let k = 0; k < len; k++) s += rng.choice("()[]{}".split(""));
				}
				tcs.push(makeTc(i, s, isValid(s) ? "YES" : "NO"));
			}

			for (let i = 76; i <= 100; i++) {
				const len = rng.nextInt(50, 120);
				let s = "";
				if (i % 2 === 0) {
					const pairs = ["()", "[]", "{}"];
					for (let k = 0; k < len; k++) {
						s += rng.choice(pairs);
					}
				} else {
					for (let k = 0; k < len; k++) s += rng.choice("()[]{}".split(""));
				}
				tcs.push(makeTc(i, s, isValid(s) ? "YES" : "NO"));
			}

			return tcs;
		},
	},

	// 59. The Mountain Ridge Silhouettes (Next Greater Element)
	{
		id: "the-mountain-ridge-silhouettes",
		title: "The Mountain Ridge Silhouettes",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "monotonic-stack"],
		description: "For each mountain in a sequence, find the height of the next strictly taller mountain to the east.",
		story: `<p>A surveyor looks east across <b>N</b> mountain peaks with heights <code>A[1], ..., A[N]</code>. For each peak <code>i</code>, find the height of the <b>first peak strictly to the east (right)</b> that is taller than peak <code>i</code>. If no taller peak exists to the east, output <code>-1</code>.</p>`,
		task: "Given array A of length N, output an array where each entry is the next greater element to the right, or -1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>A[1], ..., A[N]</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-10^9 <= A[i] <= 10^9"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7003);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 3 2 4", "3 4 4 -1", true, "1->3, 3->4, 2->4, 4->-1."));
			tcs.push(makeTc(2, "4\n4 3 2 1", "-1 -1 -1 -1", true, "Decreasing heights have no greater elements to the right."));
			tcs.push(makeTc(3, "1\n50", "-1", true, "Single element has no elements to the right."));

			const nextGreater = (arr: number[]): number[] => {
				const n = arr.length;
				const ans = new Array(n).fill(-1);
				const stack: number[] = [];
				for (let i = 0; i < n; i++) {
					while (stack.length > 0 && arr[i] > arr[stack[stack.length - 1]]) {
						ans[stack.pop()!] = arr[i];
					}
					stack.push(i);
				}
				return ans;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const arr = rng.intArray(n, -500, 500);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, nextGreater(arr).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const arr = rng.intArray(n, -1000000, 1000000);
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, nextGreater(arr).join(" ")));
			}

			return tcs;
		},
	},

	// 60. The Archmage's Reverse Polish Scroll (Evaluate Reverse Polish Notation)
	{
		id: "the-archmages-reverse-polish-scroll",
		title: "The Archmage's Reverse Polish Scroll",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "math"],
		description: "Evaluate the arithmetic value of an expression in Reverse Polish Notation (postfix).",
		story: `<p>A Dwarven calculating engine computes tactical logistics using postfix notation (Reverse Polish Notation). Valid operators are <code>+</code>, <code>-</code>, <code>*</code>, and <code>/</code> (integer division truncating toward zero). Evaluate the final result of the expression.</p>`,
		task: "Given an array of tokens in RPN, evaluate the expression to an integer.",
		inputFormat: `<p>The first line contains integer <code>N</code>, the number of tokens.</p>
<p>The second line contains <code>N</code> space-separated tokens.</p>`,
		outputFormat: `<p>Print the single integer result.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"Tokens are integers or operators '+', '-', '*', '/'.",
			"Division by zero never occurs; results fit in standard 32-bit signed integers."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7004);
			const tcs = [];

			tcs.push(makeTc(1, "5\n2 1 + 3 *", "9", true, "((2 + 1) * 3) = 9."));
			tcs.push(makeTc(2, "5\n4 13 5 / +", "6", true, "(4 + (13 / 5)) = 6."));
			tcs.push(makeTc(3, "1\n42", "42", true, "Single number evaluates to itself."));

			const evalRPN = (tokens: string[]): number => {
				const stack: number[] = [];
				for (const t of tokens) {
					if (t === "+" || t === "-" || t === "*" || t === "/") {
						const b = stack.pop()!;
						const a = stack.pop()!;
						if (t === "+") stack.push(a + b);
						else if (t === "-") stack.push(a - b);
						else if (t === "*") stack.push(a * b);
						else stack.push(Math.trunc(a / b));
					} else {
						stack.push(parseInt(t, 10));
					}
				}
				return stack[0];
			};

			for (let i = 4; i <= 75; i++) {
				const ops = ["+", "-", "*"];
				const tokens: string[] = [`${rng.nextInt(1, 10)}`];
				const steps = rng.nextInt(2, 40);
				for (let s = 0; s < steps; s++) {
					tokens.push(`${rng.nextInt(1, 10)}`);
					tokens.push(rng.choice(ops));
				}
				tcs.push(makeTc(i, `${tokens.length}\n${tokens.join(" ")}`, `${evalRPN(tokens)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const ops = ["+", "-", "*"];
				const tokens: string[] = [`${rng.nextInt(1, 10)}`];
				const steps = rng.nextInt(50, 500);
				for (let s = 0; s < steps; s++) {
					tokens.push(`${rng.nextInt(1, 5)}`);
					tokens.push(rng.choice(ops));
				}
				tcs.push(makeTc(i, `${tokens.length}\n${tokens.join(" ")}`, `${evalRPN(tokens)}`));
			}

			return tcs;
		},
	},

	// 61. Collapsing Cavern Stalactites (Asteroid Collision)
	{
		id: "collapsing-cavern-stalactites",
		title: "Collapsing Cavern Stalactites",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "simulation"],
		description: "Simulate collisions between objects moving in opposite directions along a straight cavern.",
		story: `<p>In a collapsing cavern tunnel, <b>N</b> magical energy spheres move along a line. Each sphere <code>i</code> has a non-zero size integer <code>A[i]</code>: positive values move to the right (east) and negative values move to the left (west). All move at the same speed. When two spheres moving in opposite directions collide, the smaller one explodes; if both are equal size, both explode. Spheres moving in the same direction never collide. Find the surviving spheres in order.</p>`,
		task: "Given array A of non-zero integers, return the state of the spheres after all collisions.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated non-zero integers.</p>`,
		outputFormat: `<p>Print the surviving spheres separated by spaces, or NONE if all exploded.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"-1000 <= A[i] <= 1000",
			"A[i] != 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7005);
			const tcs = [];

			tcs.push(makeTc(1, "3\n5 10 -5", "5 10", true, "10 and -5 collide; 10 destroys -5."));
			tcs.push(makeTc(2, "2\n8 -8", "NONE", true, "Equal sizes destroy each other, leaving none."));
			tcs.push(makeTc(3, "3\n10 2 -5", "10", true, "2 explodes against -5, then 10 destroys -5."));

			const asteroidCollision = (asteroids: number[]): string => {
				const stack: number[] = [];
				for (const ast of asteroids) {
					let destroyed = false;
					while (stack.length > 0 && ast < 0 && stack[stack.length - 1] > 0) {
						const top = stack[stack.length - 1];
						if (Math.abs(ast) > top) {
							stack.pop();
						} else if (Math.abs(ast) === top) {
							stack.pop();
							destroyed = true;
							break;
						} else {
							destroyed = true;
							break;
						}
					}
					if (!destroyed) stack.push(ast);
				}
				return stack.length === 0 ? "NONE" : stack.join(" ");
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 200);
				const arr: number[] = [];
				for (let k = 0; k < n; k++) {
					let v = rng.nextInt(-100, 100);
					if (v === 0) v = 1;
					arr.push(v);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, asteroidCollision(arr)));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(40, 80);
				const arr: number[] = [];
				for (let k = 0; k < n; k++) {
					let v = rng.nextInt(-500, 500);
					if (v === 0) v = 1;
					arr.push(v);
				}
				tcs.push(makeTc(i, `${n}\n${arr.join(" ")}`, asteroidCollision(arr)));
			}

			return tcs;
		},
	},

	// 62. The Grand Bazaar's Stock Spans (Online Stock Span)
	{
		id: "the-grand-bazaars-stock-spans",
		title: "The Grand Bazaar's Stock Spans",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "monotonic-stack"],
		description: "For each day, find the maximum number of consecutive days (including today) where the price was <= today's price.",
		story: `<p>Merchant Guild commodity prices fluctuate over <b>N</b> days: <code>P[1], ..., P[N]</code>. The span of the commodity's price on day <code>i</code> is the maximum number of consecutive days just before and including day <code>i</code> for which the price was less than or equal to <code>P[i]</code>. Compute the span for every day.</p>`,
		task: "Given array P of length N, output the span of prices for each day.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>P[1], ..., P[N]</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integers.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"1 <= P[i] <= 10^9"
		]),
		points: 150,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7006);
			const tcs = [];

			tcs.push(makeTc(1, "7\n100 80 60 70 60 75 85", "1 1 1 2 1 4 6", true, "Spans: [1, 1, 1, 2, 1, 4, 6]."));
			tcs.push(makeTc(2, "4\n10 20 30 40", "1 2 3 4", true, "Strictly increasing prices have spans 1..N."));
			tcs.push(makeTc(3, "3\n50 40 30", "1 1 1", true, "Strictly decreasing prices all have span 1."));

			const stockSpan = (prices: number[]): number[] => {
				const n = prices.length;
				const spans = new Array(n).fill(1);
				const stack: [number, number][] = []; // [price, span]
				for (let i = 0; i < n; i++) {
					let span = 1;
					while (stack.length > 0 && stack[stack.length - 1][0] <= prices[i]) {
						span += stack.pop()![1];
					}
					stack.push([prices[i], span]);
					spans[i] = span;
				}
				return spans;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const p = rng.intArray(n, 1, 500);
				tcs.push(makeTc(i, `${n}\n${p.join(" ")}`, stockSpan(p).join(" ")));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const p = rng.intArray(n, 1, 1000000);
				tcs.push(makeTc(i, `${n}\n${p.join(" ")}`, stockSpan(p).join(" ")));
			}

			return tcs;
		},
	},

	// 63. Simplifying the Ancient Directory (Simplify Path)
	{
		id: "simplifying-the-ancient-directory",
		title: "Simplifying the Ancient Directory",
		difficulty: "Medium",
		category: "stack",
		tags: ["stack", "string"],
		description: "Convert an absolute labyrinth directory path into its simplified canonical path.",
		story: `<p>The archives of the Citadel index scrolls using a hierarchical unix-style path system. Paths contain directory names separated by slashes <code>/</code>, current directory markers <code>.</code>, and parent directory markers <code>..</code>. Convert any raw path into its <b>simplified canonical path</b>.</p>`,
		task: "Given an absolute path string S, return the canonical path.",
		inputFormat: `<p>A single line containing string <code>S</code>.</p>`,
		outputFormat: `<p>Print the canonical path.</p>`,
		constraints: formatConstraints([
			"1 <= length of S <= 3000",
			"S starts with a slash '/'.",
			"S consists of English letters, digits, period '.', and slash '/'."
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7007);
			const tcs = [];

			tcs.push(makeTc(1, "/home/", "/home", true, "Trailing slash removed."));
			tcs.push(makeTc(2, "/../", "/", true, "Root has no parent."));
			tcs.push(makeTc(3, "/home//foo/", "/home/foo", true, "Duplicate slashes simplified."));

			const simplifyPath = (path: string): string => {
				const parts = path.split("/");
				const stack: string[] = [];
				for (const part of parts) {
					if (part === "" || part === ".") continue;
					if (part === "..") {
						if (stack.length > 0) stack.pop();
					} else {
						stack.push(part);
					}
				}
				return "/" + stack.join("/");
			};

			const dirs = ["bin", "usr", "etc", "var", "local", "lib", "home", "spells", "scrolls"];
			for (let i = 4; i <= 75; i++) {
				const depth = rng.nextInt(3, 20);
				const parts = [];
				for (let k = 0; k < depth; k++) {
					parts.push(rng.choice([...dirs, ".", "..", ""]));
				}
				const raw = "/" + parts.join("/");
				tcs.push(makeTc(i, raw, simplifyPath(raw)));
			}

			for (let i = 76; i <= 100; i++) {
				const depth = rng.nextInt(50, 200);
				const parts = [];
				for (let k = 0; k < depth; k++) {
					parts.push(rng.choice([...dirs, ".", "..", ""]));
				}
				const raw = "/" + parts.join("/");
				tcs.push(makeTc(i, raw, simplifyPath(raw)));
			}

			return tcs;
		},
	},

	// 64. The Colosseum Arena Floor (Largest Rectangle in Histogram)
	{
		id: "the-colosseum-arena-floor",
		title: "The Colosseum Arena Floor",
		difficulty: "Hard",
		category: "stack",
		tags: ["stack", "monotonic-stack", "array"],
		description: "Find the area of the largest rectangle that can be constructed inside a histogram of column heights.",
		story: `<p>In the Imperial Colosseum, architects erect <b>N</b> stone pillars of width 1 meter side by side with heights <code>H[1], ..., H[N]</code>. The emperor demands the construction of a gladiatorial stage underneath the pillars. Find the <b>area of the largest rectangle</b> that can be formed within the histogram silhouette.</p>`,
		task: "Given an array of pillar heights H, return the area of the largest rectangle in the histogram.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated integers <code>H[1], ..., H[N]</code>.</p>`,
		outputFormat: `<p>Print the maximum rectangle area.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 10^5",
			"0 <= H[i] <= 10^4"
		]),
		points: 300,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(7008);
			const tcs = [];

			tcs.push(makeTc(1, "6\n2 1 5 6 2 3", "10", true, "The largest rectangle is formed by heights 5 and 6 with width 2 -> area 10."));
			tcs.push(makeTc(2, "2\n2 4", "4", true, "Height 4 with width 1 or height 2 with width 2 -> 4."));
			tcs.push(makeTc(3, "1\n100", "100", true, "Single column of height 100."));

			const largestRectangleArea = (heights: number[]): number => {
				const stack: number[] = [];
				let maxArea = 0;
				const h = [...heights, 0];
				for (let i = 0; i < h.length; i++) {
					while (stack.length > 0 && h[i] < h[stack[stack.length - 1]]) {
						const height = h[stack.pop()!];
						const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
						maxArea = Math.max(maxArea, height * width);
					}
					stack.push(i);
				}
				return maxArea;
			};

			for (let i = 4; i <= 75; i++) {
				const n = rng.nextInt(5, 50);
				const h = rng.intArray(n, 0, 500);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${largestRectangleArea(h)}`));
			}

			for (let i = 76; i <= 100; i++) {
				const n = rng.nextInt(60, 150);
				const h = rng.intArray(n, 0, 5000);
				tcs.push(makeTc(i, `${n}\n${h.join(" ")}`, `${largestRectangleArea(h)}`));
			}

			return tcs;
		},
	},
];
