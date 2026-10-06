import { ProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints } from "../utils";

export const graphProblems: ProblemDefinition[] = [
	// 73. Academy Course Prerequisites (Course Schedule / Topological Sort Cycle)
	{
		id: "academy-course-prerequisites",
		title: "Academy Course Prerequisites",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "topological-sort", "dfs", "bfs"],
		description: "Determine whether it is possible to finish all N courses given prerequisites without cyclic dependencies.",
		story: `<p>At the Royal Magic Academy, students must take <code>N</code> arcane courses numbered <code>0</code> to <code>N-1</code>. Some courses require prerequisite courses: a requirement <code>[a, b]</code> means you must complete course <code>b</code> before enrolling in course <code>a</code>.</p>`,
		task: "Determine if it is possible to finish all courses. Output 'YES' if possible, or 'NO' if a cyclic dependency exists.",
		inputFormat: `<p>The first line contains integers <code>N</code> (courses) and <code>M</code> (prerequisites).</p>
<p>The next <code>M</code> lines each contain two integers <code>a b</code> representing the requirement that course <code>b</code> must precede <code>a</code>.</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 2000",
			"0 <= M <= 5000",
			"0 <= a, b < N, a != b"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9001);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1 0", "YES", true, "Take course 0 then course 1."));
			tcs.push(makeTc(2, "2 2\n1 0\n0 1", "NO", true, "Direct mutual dependency cycle between 0 and 1."));
			tcs.push(makeTc(3, "4 4\n1 0\n2 0\n3 1\n3 2", "YES", true, "Valid DAG: 0 -> 1 -> 3 and 0 -> 2 -> 3."));

			const canFinish = (numCourses: number, prerequisites: [number, number][]): boolean => {
				const inDegree = new Array(numCourses).fill(0);
				const adj: number[][] = Array.from({ length: numCourses }, () => []);
				for (const [a, b] of prerequisites) {
					adj[b].push(a);
					inDegree[a]++;
				}
				const queue: number[] = [];
				for (let i = 0; i < numCourses; i++) {
					if (inDegree[i] === 0) queue.push(i);
				}
				let count = 0;
				let head = 0;
				while (head < queue.length) {
					const node = queue[head++];
					count++;
					for (const neighbor of adj[node]) {
						inDegree[neighbor]--;
						if (inDegree[neighbor] === 0) queue.push(neighbor);
					}
				}
				return count === numCourses;
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(3, 30);
				const m = rng.nextInt(1, 40);
				const prereqs: [number, number][] = [];
				for (let j = 0; j < m; j++) {
					const a = rng.nextInt(0, n - 1);
					let b = rng.nextInt(0, n - 1);
					if (a === b) b = (b + 1) % n;
					prereqs.push([a, b]);
				}
				const ans = canFinish(n, prereqs) ? "YES" : "NO";
				const inStr = `${n} ${m}\n` + prereqs.map(([a, b]) => `${a} ${b}`).join("\n");
				tcs.push(makeTc(i, inStr, ans));
			}

			return tcs;
		},
	},

	// 74. Islands of the Archipelago (Number of Islands)
	{
		id: "islands-of-the-archipelago",
		title: "Islands of the Archipelago",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "dfs", "bfs", "matrix"],
		description: "Count the number of distinct islands of land surrounded by ocean in an R x C map.",
		story: `<p>Cartographers charting the Sapphire Sea represent the map as an <code>R &times; C</code> grid of <code>'1'</code>s (land) and <code>'0'</code>s (water). An island is formed by connecting adjacent lands horizontally or vertically.</p>`,
		task: "Count and return the total number of connected islands.",
		inputFormat: `<p>The first line contains integers <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain a string of <code>C</code> characters (<code>0</code> or <code>1</code>).</p>`,
		outputFormat: `<p>Print the total count of islands.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 50",
			"Grid contains only '0' and '1'"
		]),
		points: 130,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9002);
			const tcs = [];

			tcs.push(makeTc(1, "4 5\n11110\n11010\n11000\n00000", "1", true, "One large connected island."));
			tcs.push(makeTc(2, "4 5\n11000\n11000\n00100\n00011", "3", true, "Three separate islands."));
			tcs.push(makeTc(3, "2 2\n00\n00", "0", true, "All water, 0 islands."));

			const numIslands = (R: number, C: number, grid: string[][]): number => {
				let count = 0;
				const visited: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(false));

				for (let r = 0; r < R; r++) {
					for (let c = 0; c < C; c++) {
						if (grid[r][c] === "1" && !visited[r][c]) {
							count++;
							const q: [number, number][] = [[r, c]];
							visited[r][c] = true;
							let head = 0;
							while (head < q.length) {
								const [cr, cc] = q[head++];
								const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
								for (const [dr, dc] of dirs) {
									const nr = cr + dr;
									const nc = cc + dc;
									if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === "1" && !visited[nr][nc]) {
										visited[nr][nc] = true;
										q.push([nr, nc]);
									}
								}
							}
						}
					}
				}
				return count;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(2, 25);
				const C = rng.nextInt(2, 25);
				const landChance = rng.nextInt(15, 60);
				const grid: string[] = [];
				for (let r = 0; r < R; r++) {
					let row = "";
					for (let c = 0; c < C; c++) {
						row += rng.nextInt(1, 100) <= landChance ? "1" : "0";
					}
					grid.push(row);
				}
				const gridArr = grid.map((r) => r.split(""));
				const ans = numIslands(R, C, gridArr);
				tcs.push(makeTc(i, `${R} ${C}\n${grid.join("\n")}`, ans.toString()));
			}

			return tcs;
		},
	},

	// 75. Kingdom Alliance Factions (Is Graph Bipartite?)
	{
		id: "kingdom-alliance-factions",
		title: "Kingdom Alliance Factions",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "dfs", "bfs", "bipartite"],
		description: "Determine if an undirected realm graph can be split into two factions with no internal conflict.",
		story: `<p>In the kingdom of Valoria, <code>N</code> lordships numbered <code>1</code> to <code>N</code> hold mutual rivalries. The High King wants to divide all lords into two opposing diplomatic councils such that no two lords on the same council share a direct rivalry.</p>`,
		task: "Print 'YES' if the graph is bipartite (2-colorable), or 'NO' otherwise.",
		inputFormat: `<p>The first line contains integers <code>N</code> (lords) and <code>M</code> (rivalry edges).</p>
<p>The next <code>M</code> lines each contain two integers <code>u v</code> (1-indexed).</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 2000",
			"0 <= M <= 5000",
			"1 <= u, v <= N, u != v"
		]),
		points: 150,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9003);
			const tcs = [];

			tcs.push(makeTc(1, "4 4\n1 2\n2 3\n3 4\n4 1", "YES", true, "Even cycle of 4 vertices is bipartite."));
			tcs.push(makeTc(2, "3 3\n1 2\n2 3\n3 1", "NO", true, "Odd cycle of 3 vertices (triangle) cannot be 2-colored."));
			tcs.push(makeTc(3, "3 0", "YES", true, "No edges, trivially bipartite."));

			const isBipartite = (N: number, edges: [number, number][]): boolean => {
				const adj: number[][] = Array.from({ length: N + 1 }, () => []);
				for (const [u, v] of edges) {
					adj[u].push(v);
					adj[v].push(u);
				}
				const color = new Array(N + 1).fill(0); // 0 uncolored, 1, -1

				for (let i = 1; i <= N; i++) {
					if (color[i] !== 0) continue;
					color[i] = 1;
					const q: number[] = [i];
					let head = 0;
					while (head < q.length) {
						const curr = q[head++];
						for (const neighbor of adj[curr]) {
							if (color[neighbor] === color[curr]) return false;
							if (color[neighbor] === 0) {
								color[neighbor] = -color[curr];
								q.push(neighbor);
							}
						}
					}
				}
				return true;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(3, 40);
				const M = rng.nextInt(1, 60);
				const edges: [number, number][] = [];
				for (let j = 0; j < M; j++) {
					const u = rng.nextInt(1, N);
					let v = rng.nextInt(1, N);
					if (u === v) v = (v % N) + 1;
					edges.push([u, v]);
				}
				const ans = isBipartite(N, edges) ? "YES" : "NO";
				const inStr = `${N} ${M}\n` + edges.map(([u, v]) => `${u} ${v}`).join("\n");
				tcs.push(makeTc(i, inStr, ans));
			}

			return tcs;
		},
	},

	// 76. Network Delay in the Empire (Dijkstra Shortest Path)
	{
		id: "network-delay-in-the-empire",
		title: "Network Delay in the Empire",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "dijkstra", "shortest-path", "heap"],
		description: "Compute the minimum time for an imperial dispatch signal from node K to reach all N nodes.",
		story: `<p>The Emperor transmits a royal decree starting from outpost <code>K</code> across a network of <code>N</code> outposts. There are <code>M</code> directed communication links <code>(u, v, w)</code> where signal travels from outpost <code>u</code> to outpost <code>v</code> in <code>w</code> minutes.</p>`,
		task: "Return the minimum time it takes for all N outposts to receive the signal. If impossible for all to receive it, return -1.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>M</code>, and <code>K</code>.</p>
<p>The next <code>M</code> lines each contain three integers <code>u v w</code> (1-indexed).</p>`,
		outputFormat: `<p>Print the maximum signal arrival time, or -1.</p>`,
		constraints: formatConstraints([
			"1 <= K <= N <= 100",
			"0 <= M <= 1000",
			"1 <= u, v <= N, u != v",
			"0 <= w <= 100"
		]),
		points: 160,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9004);
			const tcs = [];

			tcs.push(makeTc(1, "4 3 2\n2 1 1\n2 3 1\n3 4 1", "2", true, "Signals reach 1 in 1 min, 3 in 1 min, and 4 in 2 mins. Max is 2."));
			tcs.push(makeTc(2, "2 1 1\n1 2 1", "1", true, "Only 2 nodes, 1 min delay."));
			tcs.push(makeTc(3, "2 1 2\n1 2 1", "-1", true, "Starting at 2, cannot reach 1."));

			const networkDelayTime = (N: number, M: number, K: number, edges: [number, number, number][]): number => {
				const adj: [number, number][][] = Array.from({ length: N + 1 }, () => []);
				for (const [u, v, w] of edges) {
					adj[u].push([v, w]);
				}
				const dist = new Array(N + 1).fill(Infinity);
				dist[K] = 0;
				const visited = new Array(N + 1).fill(false);

				for (let iter = 1; iter <= N; iter++) {
					let minNode = -1;
					let minDist = Infinity;
					for (let i = 1; i <= N; i++) {
						if (!visited[i] && dist[i] < minDist) {
							minDist = dist[i];
							minNode = i;
						}
					}
					if (minNode === -1) break;
					visited[minNode] = true;
					for (const [neighbor, weight] of adj[minNode]) {
						if (dist[minNode] + weight < dist[neighbor]) {
							dist[neighbor] = dist[minNode] + weight;
						}
					}
				}

				let maxTime = 0;
				for (let i = 1; i <= N; i++) {
					if (dist[i] === Infinity) return -1;
					maxTime = Math.max(maxTime, dist[i]);
				}
				return maxTime;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(3, 20);
				const M = rng.nextInt(2, 40);
				const K = rng.nextInt(1, N);
				const edges: [number, number, number][] = [];
				for (let j = 0; j < M; j++) {
					const u = rng.nextInt(1, N);
					let v = rng.nextInt(1, N);
					if (u === v) v = (v % N) + 1;
					const w = rng.nextInt(1, 50);
					edges.push([u, v, w]);
				}
				const ans = networkDelayTime(N, M, K, edges);
				const inStr = `${N} ${M} ${K}\n` + edges.map(([u, v, w]) => `${u} ${v} ${w}`).join("\n");
				tcs.push(makeTc(i, inStr, ans.toString()));
			}

			return tcs;
		},
	},

	// 77. Royal Astronomers' Star Clusters (Connected Components in Undirected Graph)
	{
		id: "royal-astronomers-star-clusters",
		title: "Royal Astronomers' Star Clusters",
		difficulty: "Easy",
		category: "graphs",
		tags: ["graphs", "union-find", "dfs", "connected-components"],
		description: "Count the number of disconnected star clusters (connected components) in the celestial sphere.",
		story: `<p>The Royal Astronomers map <code>N</code> stars numbered <code>1</code> to <code>N</code> in the celestial sphere. Gravitational light paths connect pairs of stars. Stars directly or indirectly linked belong to the same cosmic constellation.</p>`,
		task: "Output the number of connected components in the star network.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>M</code>.</p>
<p>The next <code>M</code> lines each contain two integers <code>u v</code> (1-indexed).</p>`,
		outputFormat: `<p>Print the integer number of connected components.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 2000",
			"0 <= M <= 5000",
			"1 <= u, v <= N"
		]),
		points: 100,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9005);
			const tcs = [];

			tcs.push(makeTc(1, "5 2\n1 2\n3 4", "3", true, "Clusters: {1,2}, {3,4}, and isolated {5}. Total = 3."));
			tcs.push(makeTc(2, "5 4\n1 2\n2 3\n3 4\n4 5", "1", true, "Single chain connecting all 5 stars."));
			tcs.push(makeTc(3, "4 0", "4", true, "No edges, each star is its own cluster."));

			const countComponents = (N: number, edges: [number, number][]): number => {
				const parent = Array.from({ length: N + 1 }, (_, i) => i);
				const find = (i: number): number => {
					if (parent[i] === i) return i;
					return (parent[i] = find(parent[i]));
				};
				const union = (i: number, j: number) => {
					const rootI = find(i);
					const rootJ = find(j);
					if (rootI !== rootJ) parent[rootI] = rootJ;
				};

				for (const [u, v] of edges) {
					union(u, v);
				}
				const uniqueRoots = new Set<number>();
				for (let i = 1; i <= N; i++) {
					uniqueRoots.add(find(i));
				}
				return uniqueRoots.size;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(2, 50);
				const M = rng.nextInt(0, 70);
				const edges: [number, number][] = [];
				for (let j = 0; j < M; j++) {
					edges.push([rng.nextInt(1, N), rng.nextInt(1, N)]);
				}
				const ans = countComponents(N, edges);
				const inStr = `${N} ${M}` + (M > 0 ? "\n" + edges.map(([u, v]) => `${u} ${v}`).join("\n") : "");
				tcs.push(makeTc(i, inStr, ans.toString()));
			}

			return tcs;
		},
	},

	// 78. Cycle in the Ancient Teleport Network (Directed Cycle Detection)
	{
		id: "cycle-in-the-ancient-teleport-network",
		title: "Cycle in the Ancient Teleport Network",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "dfs", "cycle-detection"],
		description: "Detect whether a directed teleportation network contains an infinite cycle.",
		story: `<p>Ancient precursor ruins contain <code>N</code> teleportation monoliths numbered <code>1</code> to <code>N</code>. Portals are one-way directed channels <code>u &rarr; v</code>. Explorers fear entering an infinite recurring teleportation cycle.</p>`,
		task: "Print 'YES' if the directed graph contains at least one cycle, or 'NO' otherwise.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>M</code>.</p>
<p>The next <code>M</code> lines each contain two integers <code>u v</code> (1-indexed).</p>`,
		outputFormat: `<p>Print <code>YES</code> or <code>NO</code>.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"0 <= M <= 3000",
			"1 <= u, v <= N"
		]),
		points: 140,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9006);
			const tcs = [];

			tcs.push(makeTc(1, "3 3\n1 2\n2 3\n3 1", "YES", true, "Cycle 1->2->3->1 exists."));
			tcs.push(makeTc(2, "3 2\n1 2\n2 3", "NO", true, "Linear directed path, no cycle."));
			tcs.push(makeTc(3, "1 1\n1 1", "YES", true, "Self loop cycle."));

			const hasCycle = (N: number, edges: [number, number][]): boolean => {
				const adj: number[][] = Array.from({ length: N + 1 }, () => []);
				for (const [u, v] of edges) {
					adj[u].push(v);
				}
				const state = new Array(N + 1).fill(0); // 0: unvisited, 1: visiting, 2: visited

				const dfs = (u: number): boolean => {
					state[u] = 1;
					for (const v of adj[u]) {
						if (state[v] === 1) return true;
						if (state[v] === 0 && dfs(v)) return true;
					}
					state[u] = 2;
					return false;
				};

				for (let i = 1; i <= N; i++) {
					if (state[i] === 0 && dfs(i)) return true;
				}
				return false;
			};

			for (let i = 4; i <= 100; i++) {
				const N = rng.nextInt(3, 40);
				const M = rng.nextInt(1, 50);
				const edges: [number, number][] = [];
				for (let j = 0; j < M; j++) {
					edges.push([rng.nextInt(1, N), rng.nextInt(1, N)]);
				}
				const ans = hasCycle(N, edges) ? "YES" : "NO";
				const inStr = `${N} ${M}\n` + edges.map(([u, v]) => `${u} ${v}`).join("\n");
				tcs.push(makeTc(i, inStr, ans));
			}

			return tcs;
		},
	},

	// 79. Continental Divide Water Flow (Pacific Atlantic Water Flow)
	{
		id: "continental-divide-water-flow",
		title: "Continental Divide Water Flow",
		difficulty: "Medium",
		category: "graphs",
		tags: ["graphs", "dfs", "bfs", "matrix"],
		description: "Count the number of coordinates where rainwater can drain into both oceans.",
		story: `<p>A high mountain plateau is mapped as an <code>R &times; C</code> matrix of elevations. Water flows downhill or across equal elevations in cardinal directions. The Northern and Western borders touch the Frozen Ocean, while the Southern and Eastern borders touch the Sun Ocean.</p>`,
		task: "Count the number of cells from which water can flow to BOTH the Frozen Ocean and the Sun Ocean.",
		inputFormat: `<p>The first line contains integers <code>R</code> and <code>C</code>.</p>
<p>The next <code>R</code> lines each contain <code>C</code> space-separated integers representing mountain heights.</p>`,
		outputFormat: `<p>Print the total count of valid cells.</p>`,
		constraints: formatConstraints([
			"1 <= R, C <= 50",
			"0 <= height <= 10^5"
		]),
		points: 160,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9007);
			const tcs = [];

			tcs.push(makeTc(1, "5 5\n1 2 2 3 5\n3 2 3 4 4\n2 4 5 3 1\n6 7 1 4 5\n5 1 1 2 4", "7", true, "7 peak cells can drain to both oceans."));
			tcs.push(makeTc(2, "1 1\n1", "1", true, "Single cell touches both borders."));
			tcs.push(makeTc(3, "2 2\n1 1\n1 1", "4", true, "Flat surface drains everywhere."));

			const pacificAtlanticCount = (R: number, C: number, heights: number[][]): number => {
				const canReach1: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(false));
				const canReach2: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(false));

				const bfs = (starts: [number, number][], canReach: boolean[][]) => {
					const q = [...starts];
					for (const [r, c] of starts) canReach[r][c] = true;
					let head = 0;
					const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
					while (head < q.length) {
						const [r, c] = q[head++];
						for (const [dr, dc] of dirs) {
							const nr = r + dr;
							const nc = c + dc;
							if (nr >= 0 && nr < R && nc >= 0 && nc < C && !canReach[nr][nc] && heights[nr][nc] >= heights[r][c]) {
								canReach[nr][nc] = true;
								q.push([nr, nc]);
							}
						}
					}
				};

				const ocean1Starts: [number, number][] = [];
				const ocean2Starts: [number, number][] = [];
				for (let r = 0; r < R; r++) {
					ocean1Starts.push([r, 0]);
					ocean2Starts.push([r, C - 1]);
				}
				for (let c = 0; c < C; c++) {
					ocean1Starts.push([0, c]);
					ocean2Starts.push([R - 1, c]);
				}

				bfs(ocean1Starts, canReach1);
				bfs(ocean2Starts, canReach2);

				let count = 0;
				for (let r = 0; r < R; r++) {
					for (let c = 0; c < C; c++) {
						if (canReach1[r][c] && canReach2[r][c]) count++;
					}
				}
				return count;
			};

			for (let i = 4; i <= 100; i++) {
				const R = rng.nextInt(2, 20);
				const C = rng.nextInt(2, 20);
				const heights: number[][] = [];
				for (let r = 0; r < R; r++) {
					const row: number[] = [];
					for (let c = 0; c < C; c++) {
						row.push(rng.nextInt(1, 100));
					}
					heights.push(row);
				}
				const ans = pacificAtlanticCount(R, C, heights);
				const inStr = `${R} ${C}\n` + heights.map((row) => row.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, ans.toString()));
			}

			return tcs;
		},
	},

	// 80. Alien Scroll Alphabet Order (Alien Dictionary Topological Sort)
	{
		id: "alien-scroll-alphabet-order",
		title: "Alien Scroll Alphabet Order",
		difficulty: "Hard",
		category: "graphs",
		tags: ["graphs", "topological-sort", "string"],
		description: "Deduce the unique lexicographical order of characters from a sorted alien language dictionary.",
		story: `<p>A xenolinguist discovers a lexicographically sorted dictionary of words written in an alien alphabet. By comparing adjacent words in the list, determine the alphabetical ordering of all unique characters appearing in the dictionary.</p>`,
		task: "Print the characters in topological order. If there is no valid ordering (cycle or prefix contradiction), print 'INVALID'.",
		inputFormat: `<p>The first line contains integer <code>N</code> (number of words).</p>
<p>The next <code>N</code> lines each contain a word.</p>`,
		outputFormat: `<p>Print the decoded alphabet order string or 'INVALID'.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= word.length <= 20",
			"Words consist of lowercase English letters"
		]),
		points: 200,
		customCheckerType: "exact",
		generateTestCases: () => {
			const rng = new DeterministicRNG(9008);
			const tcs = [];

			tcs.push(makeTc(1, "5\nwrt\nwrf\ner\nett\nrftt", "wertf", true, "Order extracted: 'w' < 'e' < 'r' < 't' < 'f'."));
			tcs.push(makeTc(2, "2\nz\nx", "zx", true, "'z' comes before 'x'."));
			tcs.push(makeTc(3, "2\nz\nx\nz", "INVALID", true, "Cyclic contradiction: 'z' < 'x' and 'x' < 'z'."));

			const alienOrder = (words: string[]): string => {
				const adj = new Map<string, Set<string>>();
				const inDegree = new Map<string, number>();

				for (const word of words) {
					for (const ch of word) {
						if (!adj.has(ch)) adj.set(ch, new Set());
						if (!inDegree.has(ch)) inDegree.set(ch, 0);
					}
				}

				for (let i = 0; i < words.length - 1; i++) {
					const w1 = words[i];
					const w2 = words[i + 1];
					if (w1.length > w2.length && w1.startsWith(w2)) {
						return "INVALID";
					}
					const minLen = Math.min(w1.length, w2.length);
					for (let j = 0; j < minLen; j++) {
						if (w1[j] !== w2[j]) {
							if (!adj.get(w1[j])!.has(w2[j])) {
								adj.get(w1[j])!.add(w2[j]);
								inDegree.set(w2[j], (inDegree.get(w2[j]) || 0) + 1);
							}
							break;
						}
					}
				}

				const queue: string[] = [];
				for (const [ch, deg] of inDegree.entries()) {
					if (deg === 0) queue.push(ch);
				}

				let result = "";
				let head = 0;
				while (head < queue.length) {
					const ch = queue[head++];
					result += ch;
					for (const nextCh of adj.get(ch) || []) {
						const deg = inDegree.get(nextCh)! - 1;
						inDegree.set(nextCh, deg);
						if (deg === 0) queue.push(nextCh);
					}
				}

				return result.length === inDegree.size ? result : "INVALID";
			};

			const sampleWords = [
				["art", "arc", "car", "cat"],
				["cab", "car", "dar", "den"],
				["ab", "cd", "ef", "gh"],
				["apple", "app"],
				["xyz", "xya", "xyb"],
			];

			for (let i = 4; i <= 20; i++) {
				const picked = sampleWords[(i - 4) % sampleWords.length];
				const ans = alienOrder(picked);
				tcs.push(makeTc(i, `${picked.length}\n${picked.join("\n")}`, ans));
			}

			for (let i = 21; i <= 100; i++) {
				const count = rng.nextInt(3, 10);
				const alphabet = rng.shuffle("abcdefghi".split("")).slice(0, rng.nextInt(4, 7));
				const wordCount = rng.nextInt(3, 8);
				const words: string[] = [];
				for (let w = 0; w < wordCount; w++) {
					const len = rng.nextInt(2, 5);
					let word = "";
					for (let l = 0; l < len; l++) {
						word += rng.choice(alphabet);
					}
					words.push(word);
				}
				// Sort according to random alphabet
				const rank = new Map(alphabet.map((ch, idx) => [ch, idx]));
				words.sort((a, b) => {
					const minLen = Math.min(a.length, b.length);
					for (let k = 0; k < minLen; k++) {
						if (a[k] !== b[k]) return (rank.get(a[k]) ?? 0) - (rank.get(b[k]) ?? 0);
					}
					return a.length - b.length;
				});

				const ans = alienOrder(words);
				tcs.push(makeTc(i, `${words.length}\n${words.join("\n")}`, ans));
			}

			return tcs;
		},
	},
];
