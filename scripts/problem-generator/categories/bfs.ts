import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const bfsProblems: ProblemDefinition[] = [
	// 65. Minotaur's Labyrinth Escape (Shortest Path in 2D Grid)
	{
		id: "minotaurs-labyrinth-escape",
		title: "Minotaur's Labyrinth Escape",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "queue", "grid", "shortest-path"],
		description: "Find the shortest number of steps to escape the Minotaur's maze from top-left to bottom-right.",
		story: `<p>Theseus enters the Cretan labyrinth, represented as an <code>R &times; C</code> grid where <code>.</code> denotes a clear corridor and <code>#</code> denotes impenetrable stone walls. Starting at cell <code>(0, 0)</code>, he must reach the exit at <code>(R-1, C-1)</code> moving only up, down, left, or right.</p>`,
		task: "Output the minimum number of steps to travel from (0,0) to (R-1, C-1), or -1 if the exit is unreachable.",
		inputFormat: `<p>The first line contains integers <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain a string of <code>C</code> characters (<code>.</code> or <code>#</code>).</p>`,
		outputFormat: `<p>Print the minimum steps, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 50",
			"Grid cells are either '.' or '#'",
			"Start (0,0) and Exit (R-1, C-1) are '.' unless initially blocked"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8001);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n...\n.#.\n...", "4", true, "Path: (0,0)->(0,1)->(0,2)->(1,2)->(2,2) takes 4 steps."));
			tcs.push(makeTc(2, "3 3\n...\n###\n...", "-1", true, "Middle row completely blocked by stone walls."));
			tcs.push(makeTc(3, "1 1\n.", "0", true, "Already at the destination in 0 steps."));

			const solveMaze = (R: number, C: number, grid: string[]): number => {
				if (grid[0][0] === '#' || grid[R - 1][C - 1] === '#') return -1;
				if (R === 1 && C === 1) return 0;
				const dist: number[][] = Array.from({ length: R }, () => new Array(C).fill(-1));
				dist[0][0] = 0;
				const q: [number, number][] = [[0, 0]];
				const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
				let head = 0;
				while (head < q.length) {
					const [r, c] = q[head++];
					if (r === R - 1 && c === C - 1) return dist[r][c];
					for (const [dr, dc] of dirs) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === '.' && dist[nr][nc] === -1) {
							dist[nr][nc] = dist[r][c] + 1;
							q.push([nr, nc]);
						}
					}
				}
				return -1;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(3, 25);
				const C = rng.nextInt(3, 25);
				const wallChance = rng.nextInt(15, 38);
				const grid: string[] = [];
				for (let r = 0; r < R; r++) {
					let row = "";
					for (let c = 0; c < C; c++) {
						if ((r === 0 && c === 0) || (r === R - 1 && c === C - 1)) {
							row += ".";
						} else {
							row += rng.nextInt(1, 100) <= wallChance ? "#" : ".";
						}
					}
					grid.push(row);
				}
				const ans = solveMaze(R, C, grid);
				tcs.push(makeTc(i, `${R} ${C}\n${grid.join("\n")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 66. Rotting Oranges in the Granary (Multi-Source BFS)
	{
		id: "rotting-oranges-in-the-granary",
		title: "Rotting Oranges in the Granary",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "queue", "matrix", "multi-source-bfs"],
		description: "Determine minimum minutes until all fresh oranges rot through adjacent contamination.",
		story: `<p>In the royal pantry, oranges are stored in an <code>R &times; C</code> crate. Cell values are: <code>0</code> (empty), <code>1</code> (fresh orange), or <code>2</code> (rotten orange). Every minute, any fresh orange 4-directionally adjacent to a rotten orange rots.</p>`,
		task: "Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.",
		inputFormat: `<p>The first line contains <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain <code>C</code> space-separated integers (0, 1, or 2).</p>`,
		outputFormat: `<p>Print the minimum minutes, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 30",
			"Grid values are in {0, 1, 2}"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8002);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n2 1 1\n1 1 0\n0 1 1", "4", true, "All oranges rot in 4 minutes."));
			tcs.push(makeTc(2, "3 3\n2 1 1\n0 1 1\n1 0 1", "-1", true, "Bottom left orange is isolated and will never rot."));
			tcs.push(makeTc(3, "1 2\n0 2", "0", true, "There are already no fresh oranges at minute 0."));

			const orangesRotting = (R: number, C: number, grid: number[][]): number => {
				const q: [number, number, number][] = [];
				let fresh = 0;
				for (let r = 0; r < R; r++) {
					for (let c = 0; c < C; c++) {
						if (grid[r][c] === 2) q.push([r, c, 0]);
						else if (grid[r][c] === 1) fresh++;
					}
				}
				if (fresh === 0) return 0;
				let maxTime = 0;
				let head = 0;
				const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
				while (head < q.length) {
					const [r, c, t] = q[head++];
					maxTime = Math.max(maxTime, t);
					for (const [dr, dc] of dirs) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1) {
							grid[nr][nc] = 2;
							fresh--;
							q.push([nr, nc, t + 1]);
						}
					}
				}
				return fresh === 0 ? maxTime : -1;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(2, 20);
				const C = rng.nextInt(2, 20);
				const grid: number[][] = [];
				for (let r = 0; r < R; r++) {
					const row: number[] = [];
					for (let c = 0; c < C; c++) {
						const roll = rng.nextInt(1, 100);
						if (roll < 20) row.push(0);
						else if (roll < 85) row.push(1);
						else row.push(2);
					}
					grid.push(row);
				}
				const copy = grid.map((row) => [...row]);
				const ans = orangesRotting(R, C, copy);
				const inputStr = `${R} ${C}\n` + grid.map((row) => row.join(" ")).join("\n");
				tcs.push(makeTc(i, inputStr, ans.toString()));
			}

			return tcs;
		},
	},

	// 67. Word Ladder of the Hierophant (Word Ladder Shortest Path)
	{
		id: "word-ladder-of-the-hierophant",
		title: "Word Ladder of the Hierophant",
		difficulty: "Hard",
		category: "bfs",
		tags: ["bfs", "hash-table", "string", "shortest-path"],
		description: "Find the shortest transformation sequence length from startWord to endWord changing one letter at a time.",
		story: `<p>The Hierophant of the High Temple guards a chamber locked by word transformations. Starting from <code>beginWord</code>, you can change exactly one character at a time to form another valid word from the sacred word list <code>wordList</code>. You must reach <code>endWord</code>.</p>`,
		task: "Return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no sequence exists.",
		inputFormat: `<p>The first line contains <code>beginWord</code> and <code>endWord</code>.</p>
<p>The second line contains integer <code>N</code> (size of word list).</p>
<p>The next <code>N</code> lines each contain a word in <code>wordList</code>.</p>`,
		outputFormat: `<p>Print the integer sequence length.</p>`,
		constraints: formatConstraints([
			"1 <= beginWord.length <= 10",
			"endWord.length == beginWord.length",
			"1 <= wordList.length <= 500",
			"All words consist of lowercase English letters"
		]),
		points: 200,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8003);
			const tcs = [];

			tcs.push(makeTc(1, "hit cog\n6\nhot\ndot\ndog\nlot\nlog\ncog", "5", true, "Shortest path: hit -> hot -> dot -> dog -> cog (5 words)."));
			tcs.push(makeTc(2, "hit cog\n5\nhot\ndot\ndog\nlot\nlog", "0", true, "endWord 'cog' is not in wordList, so impossible."));
			tcs.push(makeTc(3, "a c\n3\na\nb\nc", "2", true, "a -> c (2 words)."));

			const ladderLength = (beginWord: string, endWord: string, wordList: string[]): number => {
				const wordSet = new Set(wordList);
				if (!wordSet.has(endWord)) return 0;
				const queue: [string, number][] = [[beginWord, 1]];
				const visited = new Set<string>([beginWord]);
				let head = 0;
				const alphabet = "abcdefghijklmnopqrstuvwxyz";

				while (head < queue.length) {
					const [curr, dist] = queue[head++];
					if (curr === endWord) return dist;

					for (let i = 0; i < curr.length; i++) {
						for (const ch of alphabet) {
							if (ch === curr[i]) continue;
							const nextWord = curr.slice(0, i) + ch + curr.slice(i + 1);
							if (wordSet.has(nextWord) && !visited.has(nextWord)) {
								visited.add(nextWord);
								queue.push([nextWord, dist + 1]);
							}
						}
					}
				}
				return 0;
			};

			const vocab = ["bat", "cat", "hat", "hot", "dot", "dog", "cog", "log", "lot", "rot", "rat", "mat", "fat", "fit", "fig", "dig", "pig", "pin", "pan", "tan", "tin"];

			for (let i = 4; i <= 100; i++) {
				const subVocab = rng.shuffle(vocab);
				const begin = subVocab[0];
				const end = subVocab[1];
				const count = rng.nextInt(5, subVocab.length - 1);
				const list = subVocab.slice(1, count + 1);
				if (rng.nextInt(1, 100) > 30 && !list.includes(end)) {
					list.push(end);
				}
				const ans = ladderLength(begin, end, list);
				tcs.push(makeTc(i, `${begin} ${end}\n${list.length}\n${list.join("\n")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 68. Shortest Path in Binary Matrix (8-Directional Shortest Path)
	{
		id: "shortest-path-in-binary-matrix",
		title: "Shortest Path in Binary Matrix",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "matrix", "shortest-path"],
		description: "Compute the shortest clear 8-directional path length from (0,0) to (N-1, N-1).",
		story: `<p>Navigating through an uncharted astral sector of size <code>N &times; N</code>, a spaceship must avoid dark matter storms marked by <code>1</code> and only travel through clear space marked by <code>0</code>. The engine can travel in all <b>8 adjacent directions</b>.</p>`,
		task: "Return the length of the shortest clear path from top-left to bottom-right (number of cells visited). If no clear path exists, return -1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>N</code> space-separated integers (0 or 1).</p>`,
		outputFormat: `<p>Print the shortest path length or -1.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 30",
			"Grid cells are 0 or 1"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8004);
			const tcs = [];

			tcs.push(makeTc(1, "2\n0 1\n1 0", "2", true, "Path: (0,0) -> (1,1) diagonally has length 2."));
			tcs.push(makeTc(2, "3\n0 0 0\n1 1 0\n1 1 0", "4", true, "Path: (0,0)->(0,1)->(1,2)->(2,2) length 4."));
			tcs.push(makeTc(3, "3\n1 0 0\n1 1 0\n1 1 0", "-1", true, "Start cell (0,0) is blocked (1), impossible."));

			const shortestPathBinaryMatrix = (N: number, grid: number[][]): number => {
				if (grid[0][0] !== 0 || grid[N - 1][N - 1] !== 0) return -1;
				if (N === 1) return 1;

				const dist: number[][] = Array.from({ length: N }, () => new Array(N).fill(-1));
				dist[0][0] = 1;
				const q: [number, number][] = [[0, 0]];
				let head = 0;
				const dirs = [
					[-1, -1], [-1, 0], [-1, 1],
					[0, -1],           [0, 1],
					[1, -1],  [1, 0],  [1, 1],
				];

				while (head < q.length) {
					const [r, c] = q[head++];
					if (r === N - 1 && c === N - 1) return dist[r][c];

					for (const [dr, dc] of dirs) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] === 0 && dist[nr][nc] === -1) {
							dist[nr][nc] = dist[r][c] + 1;
							q.push([nr, nc]);
						}
					}
				}
				return -1;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(3, 20);
				const grid: number[][] = [];
				const blockRate = rng.nextInt(15, 35);
				for (let r = 0; r < N; r++) {
					const row: number[] = [];
					for (let c = 0; c < N; c++) {
						if ((r === 0 && c === 0) || (r === N - 1 && c === N - 1)) {
							row.push(0);
						} else {
							row.push(rng.nextInt(1, 100) <= blockRate ? 1 : 0);
						}
					}
					grid.push(row);
				}
				const ans = shortestPathBinaryMatrix(N, grid);
				const inputStr = `${N}\n` + grid.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inputStr, ans.toString()));
			}

			return tcs;
		},
	},

	// 69. Open the Royal Vault Lock (Combination Lock BFS)
	{
		id: "open-the-royal-vault-lock",
		title: "Open the Royal Vault Lock",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "queue", "hash-table", "graph"],
		description: "Find the minimum number of turns to open a 4-wheel lock from '0000' while avoiding deadends.",
		story: `<p>The vault of King Solomon is secured by a combination lock with 4 circular wheels, each with 10 slots <code>'0'</code> through <code>'9'</code>. Wheels rotate forward or backward. You start at <code>"0000"</code>. Certain combinations trigger explosive deadends, locking the vault forever.</p>`,
		task: "Given a target combination and an array of deadend combinations, return the minimum number of wheel turns to reach target, or -1.",
		inputFormat: `<p>The first line contains the 4-digit string <code>target</code>.</p>
<p>The second line contains integer <code>K</code> (number of deadends).</p>
<p>The third line contains <code>K</code> space-separated 4-digit deadend strings.</p>`,
		outputFormat: `<p>Print the minimum turns, or -1.</p>`,
		constraints: formatConstraints([
			"target consists of 4 digits",
			"0 <= K <= 100",
			"deadends consists of 4-digit strings"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8005);
			const tcs = [];

			tcs.push(makeTc(1, "0202\n5\n0201 0101 0102 1212 2002", "6", true, "Turns: 0000 -> 1000 -> 1100 -> 1200 -> 1201 -> 1202 -> 0202 is 6 turns."));
			tcs.push(makeTc(2, "0009\n1\n8888", "1", true, "One backward turn on the 4th wheel."));
			tcs.push(makeTc(3, "8888\n1\n0000", "-1", true, "Starting state 0000 is a deadend."));

			const openLock = (target: string, deadends: string[]): number => {
				const deadSet = new Set(deadends);
				if (deadSet.has("0000") || deadSet.has(target)) return -1;
				if (target === "0000") return 0;

				const queue: [string, number][] = [["0000", 0]];
				const visited = new Set<string>(["0000"]);
				let head = 0;

				while (head < queue.length) {
					const [curr, turns] = queue[head++];
					if (curr === target) return turns;

					for (let i = 0; i < 4; i++) {
						const d = parseInt(curr[i], 10);
						for (const diff of [-1, 1]) {
							const nextD = (d + diff + 10) % 10;
							const nextStr = curr.slice(0, i) + nextD.toString() + curr.slice(i + 1);
							if (!deadSet.has(nextStr) && !visited.has(nextStr)) {
								visited.add(nextStr);
								queue.push([nextStr, turns + 1]);
							}
						}
					}
				}
				return -1;
			};

			for (let i = 4; i <= 100; i++) {
				const d1 = rng.nextInt(0, 3);
				const d2 = rng.nextInt(0, 3);
				const d3 = rng.nextInt(0, 3);
				const d4 = rng.nextInt(0, 3);
				const target = `${d1}${d2}${d3}${d4}`;
				const k = rng.nextInt(1, 15);
				const deadends: string[] = [];
				for (let j = 0; j < k; j++) {
					deadends.push(`${rng.nextInt(0, 3)}${rng.nextInt(0, 3)}${rng.nextInt(0, 3)}${rng.nextInt(0, 3)}`);
				}
				const ans = openLock(target, deadends);
				tcs.push(makeTc(i, `${target}\n${k}\n${deadends.join(" ")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 70. The Knight's Errant Journey (Knight Moves on Board)
	{
		id: "the-knights-errant-journey",
		title: "The Knight's Errant Journey",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "queue", "chess", "shortest-path"],
		description: "Compute the minimum knight moves on an N x N chessboard from (r1, c1) to (r2, c2).",
		story: `<p>Sir Galahad the Knight must ride across an <code>N &times; N</code> chessboard territory to reach the Holy Grail at <code>(r2, c2)</code> starting from <code>(r1, c1)</code>. The knight moves in standard chess 'L' shapes (2 squares in one dimension, 1 in the perpendicular).</p>`,
		task: "Output the minimum number of knight moves from (r1, c1) to (r2, c2).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains 4 integers: <code>r1 c1 r2 c2</code> (0-indexed).</p>`,
		outputFormat: `<p>Print the minimum knight moves.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 100",
			"0 <= r1, c1, r2, c2 < N"
		]),
		points: 120,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8006);
			const tcs = [];

			tcs.push(makeTc(1, "8\n0 0 1 2", "1", true, "One knight move: (0,0) -> (1,2)."));
			tcs.push(makeTc(2, "8\n0 0 7 7", "6", true, "Traversing the entire 8x8 chessboard diagonally."));
			tcs.push(makeTc(3, "8\n4 4 4 4", "0", true, "Already at destination."));

			const minKnightMoves = (N: number, r1: number, c1: number, r2: number, c2: number): number => {
				if (r1 === r2 && c1 === c2) return 0;
				const dist: number[][] = Array.from({ length: N }, () => new Array(N).fill(-1));
				dist[r1][c1] = 0;
				const q: [number, number][] = [[r1, c1]];
				let head = 0;
				const moves = [
					[1, 2], [1, -2], [-1, 2], [-1, -2],
					[2, 1], [2, -1], [-2, 1], [-2, -1],
				];

				while (head < q.length) {
					const [r, c] = q[head++];
					if (r === r2 && c === c2) return dist[r][c];

					for (const [dr, dc] of moves) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < N && nc >= 0 && nc < N && dist[nr][nc] === -1) {
							dist[nr][nc] = dist[r][c] + 1;
							q.push([nr, nc]);
						}
					}
				}
				return -1;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(5, 50);
				const r1 = rng.nextInt(0, N - 1);
				const c1 = rng.nextInt(0, N - 1);
				const r2 = rng.nextInt(0, N - 1);
				const c2 = rng.nextInt(0, N - 1);
				const ans = minKnightMoves(N, r1, c1, r2, c2);
				tcs.push(makeTc(i, `${N}\n${r1} ${c1} ${r2} ${c2}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 71. Citadel Gates and Dungeons (Walls and Gates)
	{
		id: "citadel-gates-and-dungeons",
		title: "Citadel Gates and Dungeons",
		difficulty: "Medium",
		category: "bfs",
		tags: ["bfs", "multi-source-bfs", "matrix"],
		description: "Fill each dungeon room with the distance to its nearest citadel gate.",
		story: `<p>In the royal fortress, dungeons have rooms represented by an <code>R &times; C</code> grid. <code>-1</code> represents a solid wall, <code>0</code> represents a fortress escape gate, and <code>INF (2147483647)</code> represents an empty room. Evacuees need to know the distance to the nearest gate.</p>`,
		task: "Fill each empty room with the shortest distance to a gate. If a room cannot reach any gate, leave it as 2147483647.",
		inputFormat: `<p>The first line contains <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain <code>C</code> integers (-1, 0, or 2147483647).</p>`,
		outputFormat: `<p>Print the grid of <code>R</code> lines with space-separated values.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 25",
			"Values are -1, 0, or 2147483647"
		]),
		points: 160,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8007);
			const tcs = [];
			const INF = 2147483647;

			tcs.push(makeTc(1, `4 4\n${INF} -1 0 ${INF}\n${INF} ${INF} ${INF} -1\n${INF} -1 ${INF} -1\n0 -1 ${INF} ${INF}`,
				"3 -1 0 1\n2 2 1 -1\n1 -1 2 -1\n0 -1 3 4", true, "Filled with distances to gates at (0,2) and (3,0)."));
			tcs.push(makeTc(2, `1 2\n0 ${INF}`, "0 1", true, "Single row with 1 gate and 1 room."));
			tcs.push(makeTc(3, "1 1\n-1", "-1", true, "Single wall cell."));

			const wallsAndGates = (R: number, C: number, grid: number[][]): number[][] => {
				const q: [number, number][] = [];
				for (let r = 0; r < R; r++) {
					for (let c = 0; c < C; c++) {
						if (grid[r][c] === 0) q.push([r, c]);
					}
				}
				let head = 0;
				const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
				while (head < q.length) {
					const [r, c] = q[head++];
					for (const [dr, dc] of dirs) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === INF) {
							grid[nr][nc] = grid[r][c] + 1;
							q.push([nr, nc]);
						}
					}
				}
				return grid;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(2, 15);
				const C = rng.nextInt(2, 15);
				const grid: number[][] = [];
				for (let r = 0; r < R; r++) {
					const row: number[] = [];
					for (let c = 0; c < C; c++) {
						const roll = rng.nextInt(1, 100);
						if (roll <= 15) row.push(-1);
						else if (roll <= 30) row.push(0);
						else row.push(INF);
					}
					grid.push(row);
				}
				// ensure at least one gate
				if (!grid.some((row) => row.includes(0))) {
					grid[0][0] = 0;
				}
				const copy = grid.map((r) => [...r]);
				const solved = wallsAndGates(R, C, copy);
				const inStr = `${R} ${C}\n` + grid.map((r) => r.join(" ")).join("\n");
				const outStr = solved.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 72. Sacred Flood Fill (Flood Fill on 2D Matrix)
	{
		id: "sacred-flood-fill",
		title: "Sacred Flood Fill",
		difficulty: "Easy",
		category: "bfs",
		tags: ["bfs", "dfs", "matrix"],
		description: "Perform a flood fill recoloring starting from pixel (sr, sc) with a new color.",
		story: `<p>An apprentice illuminator is restoring a sacred manuscript represented by an <code>R &times; C</code> color grid. Given a starting point <code>(sr, sc)</code> and a <code>newColor</code>, they must recolor all 4-directionally connected cells sharing the same initial starting color.</p>`,
		task: "Output the modified image after performing the flood fill.",
		inputFormat: `<p>The first line contains <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain <code>C</code> space-separated integers.</p>
<p>The last line contains <code>sr sc newColor</code> (0-indexed).</p>`,
		outputFormat: `<p>Print the <code>R</code> lines representing the modified grid.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 30",
			"0 <= image[i][j], newColor < 1000",
			"0 <= sr < R, 0 <= sc < C"
		]),
		points: 100,
		customCheckerType: "whitespace",
		generateTestCases: () => {
			const rng = new DeterministicRNG(8008);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n1 1 1\n1 1 0\n1 0 1\n1 1 2", "2 2 2\n2 2 0\n2 0 1", true, "Start at (1,1) color 1, fill with color 2."));
			tcs.push(makeTc(2, "2 2\n0 0\n0 0\n0 0 0", "0 0\n0 0", true, "New color equals initial color, unchanged."));
			tcs.push(makeTc(3, "1 1\n5\n0 0 9", "9", true, "Single cell recolored to 9."));

			const floodFill = (R: number, C: number, image: number[][], sr: number, sc: number, newColor: number): number[][] => {
				const origColor = image[sr][sc];
				if (origColor === newColor) return image;
				const q: [number, number][] = [[sr, sc]];
				image[sr][sc] = newColor;
				let head = 0;
				const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
				while (head < q.length) {
					const [r, c] = q[head++];
					for (const [dr, dc] of dirs) {
						const nr = r + dr;
						const nc = c + dc;
						if (nr >= 0 && nr < R && nc >= 0 && nc < C && image[nr][nc] === origColor) {
							image[nr][nc] = newColor;
							q.push([nr, nc]);
						}
					}
				}
				return image;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(3, 15);
				const C = rng.nextInt(3, 15);
				const image: number[][] = [];
				for (let r = 0; r < R; r++) {
					const row: number[] = [];
					for (let c = 0; c < C; c++) {
						row.push(rng.nextInt(0, 4));
					}
					image.push(row);
				}
				const sr = rng.nextInt(0, R - 1);
				const sc = rng.nextInt(0, C - 1);
				const newColor = rng.nextInt(0, 9);
				const copy = image.map((r) => [...r]);
				const solved = floodFill(R, C, copy, sr, sc, newColor);
				const inStr = `${R} ${C}\n` + image.map((r) => r.join(" ")).join("\n") + `\n${sr} ${sc} ${newColor}`;
				const outStr = solved.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},
];
