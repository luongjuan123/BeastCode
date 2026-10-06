import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const clusteringProblems: MLProblemDefinition[] = [
	// 21. Orion Constellation K-Means Update Step
	{
		id: "orion-constellation-kmeans-clustering",
		title: "Orion Constellation K-Means Update Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "kmeans", "clustering", "unsupervised-learning"],
		description: "Perform one full Lloyd's iteration: assign points to nearest centroid and recompute centroid coordinates.",
		story: `<p>Deep-space radio arrays in the Orion constellation group <code>N</code> celestial emitters into <code>K</code> clusters. In standard Lloyd's k-Means, points are assigned to the closest centroid under Euclidean distance, and each centroid is repositioned to the center of mass of its assigned points.</p>`,
		task: "Perform exactly 1 full Lloyd's update step: assign each point to the closest centroid (break ties by lower centroid index) and output the recomputed K centroids. Do not iterate to convergence.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and <code>K</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers (data points).</p>
<p>The next <code>K</code> lines each contain <code>D</code> real numbers (initial centroids).</p>`,
		outputFormat: `<p>Print <code>K</code> lines, each containing <code>D</code> real numbers: the updated centroids with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= N <= 100",
			"1 <= D <= 5",
			"Every cluster has at least one assigned point",
			"Perform exactly 1 iteration (1 assignment step followed by 1 centroid update step)",
			"Break distance ties by assigning to the lower centroid index"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(301);
			const tcs = [];

			tcs.push(makeTc(1, "4 1 2\n0\n2\n10\n12\n1\n11", "1.0000\n11.0000", true, "Points 0, 2 cluster around 1 (mean=1). Points 10, 12 cluster around 11 (mean=11)."));
			tcs.push(makeTc(2, "2 2 1\n0 0\n2 2\n0 0", "1.0000 1.0000", true, "Mean of (0,0) and (2,2) is (1,1)."));

			const solveKMeansStep = (N: number, D: number, K: number, points: number[][], centroids: number[][]): number[][] => {
				const clusters: number[][][] = Array.from({ length: K }, () => []);
				for (const pt of points) {
					let minDist = Infinity;
					let bestC = 0;
					for (let k = 0; k < K; k++) {
						let sumSq = 0;
						for (let d = 0; d < D; d++) sumSq += (pt[d] - centroids[k][d]) ** 2;
						if (sumSq < minDist) {
							minDist = sumSq;
							bestC = k;
						}
					}
					clusters[bestC].push(pt);
				}

				const newCentroids: number[][] = [];
				for (let k = 0; k < K; k++) {
					const pts = clusters[k];
					if (pts.length === 0) {
						newCentroids.push([...centroids[k]]);
					} else {
						const mean = new Array(D).fill(0);
						for (const p of pts) {
							for (let d = 0; d < D; d++) mean[d] += p[d];
						}
						newCentroids.push(mean.map((v) => v / pts.length));
					}
				}
				return newCentroids;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(6, 20);
				const D = rng.nextInt(2, 3);
				const K = rng.nextInt(2, 3);
				const points = Array.from({ length: N }, () => rng.floatArray(D, -10, 10, 2));
				// Pick first K points as initial centroids to guarantee non-empty clusters
				const centroids = points.slice(0, K).map((p) => [...p]);
				const updated = solveKMeansStep(N, D, K, points, centroids);

				let inStr = `${N} ${D} ${K}\n`;
				inStr += points.map((p) => p.join(" ")).join("\n") + "\n";
				inStr += centroids.map((c) => c.join(" ")).join("\n");
				const outStr = updated.map((c) => c.map(f4).join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 22. Hyper-Cluster K-Means Inertia (WCSS)
	{
		id: "hyper-cluster-kmeans-inertia",
		title: "Hyper-Cluster K-Means Inertia",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "kmeans", "wcss", "clustering"],
		description: "Compute the within-cluster sum of squares (WCSS) inertia metric for clustering evaluation.",
		story: `<p>A high-performance computing cluster evaluates partition quality using the <b>Inertia</b> (Within-Cluster Sum of Squares, WCSS) metric: <code>Inertia = sum_k sum_{x in C_k} ||x - mu_k||^2</code>, used in the Elbow Method to choose optimal K.</p>`,
		task: "Given points and their assigned cluster centroids, compute the total inertia.",
		inputFormat: `<p>The first line contains integers <code>N</code> (points) and <code>D</code> (dimension).</p>
<p>The next <code>N</code> lines each contain <code>D</code> coordinates of a point followed by <code>D</code> coordinates of its assigned centroid.</p>`,
		outputFormat: `<p>Print the total inertia with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 200",
			"1 <= D <= 5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(302);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n0 0 1 1\n2 2 1 1", "4.0000", true, "Distances sq: (1+1) + (1+1) = 4.0000."));
			tcs.push(makeTc(2, "1 1\n5 5", "0.0000", true, "Point on centroid has 0 inertia."));

			const computeInertia = (pairs: { pt: number[]; c: number[] }[], D: number): number => {
				let sum = 0;
				for (const item of pairs) {
					for (let d = 0; d < D; d++) {
						sum += (item.pt[d] - item.c[d]) ** 2;
					}
				}
				return sum;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(5, 30);
				const D = rng.nextInt(1, 4);
				const pairs: { pt: number[]; c: number[] }[] = [];
				for (let n = 0; n < N; n++) {
					pairs.push({
						pt: rng.floatArray(D, -20, 20, 2),
						c: rng.floatArray(D, -20, 20, 2),
					});
				}
				const inertia = computeInertia(pairs, D);
				let inStr = `${N} ${D}\n`;
				inStr += pairs.map((p) => `${p.pt.join(" ")} ${p.c.join(" ")}`).join("\n");
				tcs.push(makeTc(i, inStr, f4(inertia)));
			}

			return tcs;
		},
	},

	// 23. Eco-Reserve Habitat K-Means++ Initialization
	{
		id: "eco-reserve-habitat-kmeans-plus-plus",
		title: "Eco-Reserve Habitat K-Means++ Initialization",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "kmeans", "clustering", "algorithms"],
		description: "Compute the squared distance D(x)^2 probability distribution used in k-Means++ initialization.",
		story: `<p>Biologists tracking wildlife habitats in an ecological reserve deploy k-Means++ to initialize sensor towers. In k-Means++, the probability of choosing point <code>x</code> as the next centroid is proportional to <code>D(x)^2</code>, the squared distance to the nearest existing centroid.</p>`,
		task: "Given existing centroids C and candidate points X, compute the normalized selection probability D(x)^2 / sum(D(x')^2) for each candidate point.",
		inputFormat: `<p>The first line contains integers <code>N</code> (candidates), <code>K</code> (existing centroids), and <code>D</code> (dimension).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers (candidate points).</p>
<p>The next <code>K</code> lines each contain <code>D</code> real numbers (existing centroids).</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated probabilities formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= K <= 10",
			"1 <= D <= 5",
			"Sum of D(x)^2 > 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(303);
			const tcs = [];

			tcs.push(makeTc(1, "2 1 1\n1\n3\n0", "0.1000 0.9000", true, "Dist sq from 0: 1^2=1 and 3^2=9. Sum=10. Probs: 1/10=0.1000, 9/10=0.9000."));
			tcs.push(makeTc(2, "2 1 1\n1\n-1\n0", "0.5000 0.5000", true, "Equal distances yield equal probabilities."));

			const solveKMeansPP = (N: number, K: number, D: number, pts: number[][], cens: number[][]): number[] => {
				const d2List: number[] = [];
				for (const pt of pts) {
					let minD2 = Infinity;
					for (const c of cens) {
						let sq = 0;
						for (let d = 0; d < D; d++) sq += (pt[d] - c[d]) ** 2;
						if (sq < minD2) minD2 = sq;
					}
					d2List.push(minD2);
				}
				const sum = d2List.reduce((a, b) => a + b, 0);
				return d2List.map((d) => (sum > 0 ? d / sum : 1 / N));
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const K = rng.nextInt(1, 3);
				const D = rng.nextInt(1, 3);
				const pts = Array.from({ length: N }, () => rng.floatArray(D, -10, 10, 2));
				const cens = Array.from({ length: K }, () => rng.floatArray(D, -5, 5, 2));
				const probs = solveKMeansPP(N, K, D, pts, cens);

				let inStr = `${N} ${K} ${D}\n`;
				inStr += pts.map((p) => p.join(" ")).join("\n") + "\n";
				inStr += cens.map((c) => c.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, probs.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 24. Archaeology Pottery Agglomerative Linkage
	{
		id: "archaeology-pottery-agglomerative-linkage",
		title: "Archaeology Pottery Agglomerative Linkage",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "hierarchical-clustering", "agglomerative"],
		description: "Compute Single Linkage (min distance) and Complete Linkage (max distance) between two clusters.",
		story: `<p>Archaeologists analyzing ancient pottery shards group artifacts using Hierarchical Agglomerative Clustering. Given two clusters of shards <code>A</code> and <code>B</code>, compute the <b>Single Linkage distance</b>: <code>min_{u in A, v in B} dist(u, v)</code> and <b>Complete Linkage distance</b>: <code>max_{u in A, v in B} dist(u, v)</code> under Euclidean metric.</p>`,
		task: "Given points in Cluster A and Cluster B, compute Single Linkage and Complete Linkage distances.",
		inputFormat: `<p>The first line contains integers <code>N_A</code>, <code>N_B</code>, and <code>D</code>.</p>
<p>The next <code>N_A</code> lines each contain <code>D</code> real numbers (points in Cluster A).</p>
<p>The next <code>N_B</code> lines each contain <code>D</code> real numbers (points in Cluster B).</p>`,
		outputFormat: `<p>Print a single line: <code>single_linkage complete_linkage</code> formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N_A, N_B <= 50",
			"1 <= D <= 5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(304);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 1\n0\n1\n4\n5", "3.0000 5.0000", true, "Min dist: |1-4|=3. Max dist: |0-5|=5."));
			tcs.push(makeTc(2, "1 1 2\n0 0\n3 4", "5.0000 5.0000", true, "Single point clusters dist=5.0000."));

			const computeLinkages = (A: number[][], B: number[][], D: number) => {
				let minD = Infinity;
				let maxD = -Infinity;
				for (const u of A) {
					for (const v of B) {
						let sq = 0;
						for (let d = 0; d < D; d++) sq += (u[d] - v[d]) ** 2;
						const dist = Math.sqrt(sq);
						if (dist < minD) minD = dist;
						if (dist > maxD) maxD = dist;
					}
				}
				return { minD, maxD };
			};

			for (let i = 3; i <= 100; i++) {
				const na = rng.nextInt(2, 10);
				const nb = rng.nextInt(2, 10);
				const D = rng.nextInt(1, 3);
				const A = Array.from({ length: na }, () => rng.floatArray(D, -10, 0, 2));
				const B = Array.from({ length: nb }, () => rng.floatArray(D, 5, 15, 2));
				const { minD, maxD } = computeLinkages(A, B, D);
				let inStr = `${na} ${nb} ${D}\n`;
				inStr += A.map((r) => r.join(" ")).join("\n") + "\n";
				inStr += B.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(minD)} ${f4(maxD)}`));
			}

			return tcs;
		},
	},

	// 25. Urban Transit Density DBSCAN Point Classifier
	{
		id: "urban-transit-density-dbscan",
		title: "Urban Transit Density DBSCAN Point Classifier",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "dbscan", "clustering", "density"],
		description: "Classify points into CORE, BORDER, or NOISE under DBSCAN density parameters (eps, minPts).",
		story: `<p>City planning algorithms process commuter GPS coordinates using <b>DBSCAN</b>. Given neighborhood radius <code>eps</code> and threshold <code>minPts</code>: a point is a <b>CORE</b> point if its eps-neighborhood contains &ge; <code>minPts</code> points (including itself); a <b>BORDER</b> point is non-core but within eps of a CORE point; otherwise it is <b>NOISE</b>.</p>`,
		task: "Classify each of the N points as 'CORE', 'BORDER', or 'NOISE'.",
		inputFormat: `<p>The first line contains integer <code>N</code>, integer <code>D</code>, real number <code>eps</code>, and integer <code>minPts</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers.</p>`,
		outputFormat: `<p>Print <code>N</code> lines with the classification of each point in original order.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= D <= 3",
			"eps > 0",
			"minPts >= 1"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(305);
			const tcs = [];

			tcs.push(makeTc(1, "4 1 1.5 3\n0\n1\n2\n10", "BORDER\nCORE\nBORDER\nNOISE", true, "Point 1 has 3 neighbors in range 1.5 -> CORE. Points 0 and 2 are within 1.5 of core point 1 -> BORDER. Point 10 is isolated -> NOISE."));
			tcs.push(makeTc(2, "1 1 1.0 1\n5", "CORE", true, "minPts=1 makes single point a CORE."));

			const classifyDBSCAN = (N: number, D: number, eps: number, minPts: number, pts: number[][]): string[] => {
				const neighbors: number[][] = Array.from({ length: N }, () => []);
				for (let i = 0; i < N; i++) {
					for (let j = 0; j < N; j++) {
						let sq = 0;
						for (let d = 0; d < D; d++) sq += (pts[i][d] - pts[j][d]) ** 2;
						if (Math.sqrt(sq) <= eps + 1e-7) {
							neighbors[i].push(j);
						}
					}
				}

				const isCore = new Array(N).fill(false);
				for (let i = 0; i < N; i++) {
					if (neighbors[i].length >= minPts) isCore[i] = true;
				}

				const res: string[] = [];
				for (let i = 0; i < N; i++) {
					if (isCore[i]) {
						res.push("CORE");
					} else {
						const nearCore = neighbors[i].some((nbrIdx) => isCore[nbrIdx]);
						res.push(nearCore ? "BORDER" : "NOISE");
					}
				}
				return res;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(5, 20);
				const D = rng.nextInt(1, 2);
				const eps = parseFloat(rng.nextFloat(1.0, 3.0).toFixed(1));
				const minPts = rng.nextInt(2, 4);
				const pts = Array.from({ length: N }, () => rng.floatArray(D, -5, 15, 1));
				const ans = classifyDBSCAN(N, D, eps, minPts, pts);
				let inStr = `${N} ${D} ${eps} ${minPts}\n` + pts.map((p) => p.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, ans.join("\n")));
			}

			return tcs;
		},
	},

	// 26. Spectral Sound GMM Expectation-Maximization E-Step
	{
		id: "spectral-sound-gmm-expectation-maximization",
		title: "Spectral Sound GMM Expectation-Maximization E-Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "gmm", "em-algorithm", "clustering"],
		description: "Compute the responsibility matrix gamma_ik in the Expectation step of a 1D Gaussian Mixture Model.",
		story: `<p>A bioacoustic audio engine models bird species frequencies using a 1D Gaussian Mixture Model with <code>K</code> components. In the Expectation (E-step), the responsibility <code>gamma_{ik}</code> that component <code>k</code> generated observation <code>x_i</code> is: <code>gamma_{ik} = (pi_k * N(x_i | mu_k, sigma2_k)) / sum_{j} (pi_j * N(x_i | mu_j, sigma2_j))</code>.</p>`,
		task: "Given N observations and K Gaussian components (pi, mu, sigma2), compute the responsibilities gamma_{ik} for all N observations.",
		inputFormat: `<p>The first line contains integers <code>N</code> (points) and <code>K</code> (components).</p>
<p>The next <code>K</code> lines each contain 3 real numbers: <code>pi_k mu_k sigma2_k</code>.</p>
<p>The last line contains <code>N</code> space-separated real numbers: observations <code>x</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines, each containing <code>K</code> space-separated responsibility values formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= K <= 5",
			"sigma2_k > 0",
			"sum(pi_k) = 1"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(306);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n0.5 0.0 1.0\n0.5 10.0 1.0\n0.0 10.0", "1.0000 0.0000\n0.0000 1.0000", true, "Point 0 belongs exclusively to component 0, point 10 to component 1."));
			tcs.push(makeTc(2, "1 2\n0.5 0.0 1.0\n0.5 0.0 1.0\n0.0", "0.5000 0.5000", true, "Identical Gaussians share equal 0.5 responsibility."));

			const solveGMM_E = (N: number, K: number, comps: { pi: number; mu: number; v: number }[], xs: number[]): string[] => {
				const rows: string[] = [];
				for (const x of xs) {
					const likes = comps.map((c) => {
						const denom = Math.sqrt(2 * Math.PI * c.v);
						const num = Math.exp(-((x - c.mu) ** 2) / (2 * c.v));
						return c.pi * (num / denom);
					});
					const sum = likes.reduce((a, b) => a + b, 0);
					const gammas = likes.map((l) => (sum > 0 ? l / sum : 1 / K));
					rows.push(gammas.map(f4).join(" "));
				}
				return rows;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const K = rng.nextInt(2, 3);
				const rawP = rng.floatArray(K, 1, 5, 1);
				const sumP = rawP.reduce((a, b) => a + b, 0);
				const comps = rawP.map((p, idx) => ({
					pi: parseFloat((p / sumP).toFixed(4)),
					mu: idx * 5,
					v: parseFloat(rng.nextFloat(0.5, 3.0).toFixed(2)),
				}));
				const xs = rng.floatArray(N, -2, 12, 1);
				const res = solveGMM_E(N, K, comps, xs);

				let inStr = `${N} ${K}\n`;
				inStr += comps.map((c) => `${c.pi} ${c.mu} ${c.v}`).join("\n") + "\n";
				inStr += xs.join(" ");
				tcs.push(makeTc(i, inStr, res.join("\n")));
			}

			return tcs;
		},
	},

	// 27. Galaxy Cluster Silhouette Score
	{
		id: "galaxy-cluster-silhouette-score",
		title: "Galaxy Cluster Silhouette Score",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "silhouette", "clustering", "metrics"],
		description: "Compute the Silhouette Coefficient s = (b - a) / max(a, b) measuring cluster cohesion and separation.",
		story: `<p>Extragalactic astronomers evaluate galaxy cluster assignments using the <b>Silhouette Score</b> for each point <code>i</code>: <code>s(i) = (b(i) - a(i)) / max(a(i), b(i))</code>, where <code>a(i)</code> is the mean distance from <code>i</code> to all other points in its own cluster, and <code>b(i)</code> is the mean distance from <code>i</code> to all points in the nearest neighbor cluster. If the cluster has only 1 point, <code>s(i) = 0</code>.</p>`,
		task: "Given cluster assignments for N points, compute the silhouette score for each point and the overall mean silhouette score.",
		inputFormat: `<p>The first line contains integers <code>N</code> (points) and <code>D</code> (dimension).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers followed by integer <code>cluster_id</code>.</p>`,
		outputFormat: `<p>Print the mean silhouette score across all points with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50",
			"1 <= D <= 3",
			"At least 2 distinct clusters"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(307);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n0 0\n1 0\n10 1\n11 1", "0.9000", true, "Two dense separated clusters: mean silhouette is high (0.9000)."));
			tcs.push(makeTc(2, "3 1\n0 0\n1 0\n2 1", "0.3333", true, "Overlapping cluster boundary."));

			const computeSilhouette = (N: number, D: number, data: { x: number[]; c: number }[]): number => {
				const clusterIds = Array.from(new Set(data.map((d) => d.c)));
				const scores: number[] = [];

				for (let i = 0; i < N; i++) {
					const myC = data[i].c;
					const sameCluster = data.filter((d, idx) => idx !== i && d.c === myC);

					if (sameCluster.length === 0) {
						scores.push(0);
						continue;
					}

					let aDist = 0;
					for (const other of sameCluster) {
						let sq = 0;
						for (let d = 0; d < D; d++) sq += (data[i].x[d] - other.x[d]) ** 2;
						aDist += Math.sqrt(sq);
					}
					const a = aDist / sameCluster.length;

					let b = Infinity;
					for (const otherC of clusterIds) {
						if (otherC === myC) continue;
						const otherCluster = data.filter((d) => d.c === otherC);
						let distSum = 0;
						for (const other of otherCluster) {
							let sq = 0;
							for (let d = 0; d < D; d++) sq += (data[i].x[d] - other.x[d]) ** 2;
							distSum += Math.sqrt(sq);
						}
						const meanDist = distSum / otherCluster.length;
						if (meanDist < b) b = meanDist;
					}

					const s = (b - a) / Math.max(a, b);
					scores.push(s);
				}

				return scores.reduce((sum, val) => sum + val, 0) / N;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(6, 20);
				const D = rng.nextInt(1, 2);
				const data: { x: number[]; c: number }[] = [];
				for (let n = 0; n < N; n++) {
					const c = n < Math.floor(N / 2) ? 0 : 1;
					const center = c === 0 ? 0 : 10;
					data.push({ x: rng.floatArray(D, center - 2, center + 2, 1), c });
				}
				const meanS = computeSilhouette(N, D, data);
				let inStr = `${N} ${D}\n` + data.map((d) => `${d.x.join(" ")} ${d.c}`).join("\n");
				tcs.push(makeTc(i, inStr, f4(meanS)));
			}

			return tcs;
		},
	},

	// 28. Retail Customer RFM Segmentation
	{
		id: "retail-customer-rfm-segmentation",
		title: "Retail Customer RFM Segmentation",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "rfm", "segmentation", "clustering"],
		description: "Compute RFM composite score = 0.2*R + 0.3*F + 0.5*M and map customers to segment tiers.",
		story: `<p>An e-commerce marketing platform segments shoppers using normalized Recency (R: days since last purchase, inverted so higher is better), Frequency (F: order count), and Monetary (M: total spend). The composite customer health index is: <code>Score = 0.2*R + 0.3*F + 0.5*M</code>.</p>`,
		task: "Given normalized [R, F, M] values in [0, 100], compute the composite score. Map to tier: >= 80: 'PLATINUM', >= 60: 'GOLD', >= 40: 'SILVER', else 'BRONZE'.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 3 real numbers: <code>R F M</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines: <code>score TIER</code> where score has 2 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"0 <= R, F, M <= 100"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(308);
			const tcs = [];

			tcs.push(makeTc(1, "2\n100 100 100\n50 50 50", "100.00 PLATINUM\n50.00 SILVER", true, "100 -> PLATINUM. 50 -> SILVER."));
			tcs.push(makeTc(2, "1\n20 10 30", "22.00 BRONZE", true, "0.2*20 + 0.3*10 + 0.5*30 = 4 + 3 + 15 = 22.00 BRONZE."));

			const getTier = (s: number) => {
				if (s >= 80) return "PLATINUM";
				if (s >= 60) return "GOLD";
				if (s >= 40) return "SILVER";
				return "BRONZE";
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const rows: number[][] = [];
				const outs: string[] = [];
				for (let n = 0; n < N; n++) {
					const r = rng.nextInt(0, 100);
					const f = rng.nextInt(0, 100);
					const m = rng.nextInt(0, 100);
					rows.push([r, f, m]);
					const score = 0.2 * r + 0.3 * f + 0.5 * m;
					outs.push(`${score.toFixed(2)} ${getTier(score)}`);
				}
				const inStr = `${N}\n` + rows.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outs.join("\n")));
			}

			return tcs;
		},
	},

	// 29. Seismic Sensor Medoid Clustering Cost (Manhattan Distance)
	{
		id: "seismic-sensor-medoid-clustering",
		title: "Seismic Sensor Medoid Clustering Cost",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "k-medoids", "manhattan-distance", "clustering"],
		description: "Compute the total clustering cost of a chosen set of medoids under Manhattan L1 distance.",
		story: `<p>Seismic sensor stations in an earthquake zone run K-Medoids (PAM) clustering. Unlike K-Means, medoids must be actual sensor locations. The cost of a clustering configuration is the sum of Manhattan (L1) distances from each station to its nearest medoid.</p>`,
		task: "Given N stations and K selected medoid indices (0-indexed), compute the total Manhattan clustering cost.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and <code>K</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> integers (coordinates of station 0 to N-1).</p>
<p>The last line contains <code>K</code> distinct integers representing the medoid station indices.</p>`,
		outputFormat: `<p>Print the total integer Manhattan cost.</p>`,
		constraints: formatConstraints([
			"1 <= K <= N <= 100",
			"1 <= D <= 5",
			"0 <= medoid_index < N"
		]),
		points: 120,
		customCheckerType: "exact",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(309);
			const tcs = [];

			tcs.push(makeTc(1, "3 2 1\n0 0\n2 3\n5 5\n0", "15", true, "Medoid is station 0 at (0,0). Cost: 0 + |2-0|+|3-0| + |5-0|+|5-0| = 5 + 10 = 15."));
			tcs.push(makeTc(2, "2 1 2\n1\n10\n0 1", "0", true, "Every point is its own medoid, cost 0."));

			const solveMedoidCost = (N: number, D: number, stations: number[][], medoidIdxs: number[]): number => {
				const medoids = medoidIdxs.map((idx) => stations[idx]);
				let total = 0;
				for (const s of stations) {
					let minD = Infinity;
					for (const m of medoids) {
						let dSum = 0;
						for (let d = 0; d < D; d++) dSum += Math.abs(s[d] - m[d]);
						if (dSum < minD) minD = dSum;
					}
					total += minD;
				}
				return total;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(5, 25);
				const D = rng.nextInt(2, 3);
				const K = rng.nextInt(1, 3);
				const stations = Array.from({ length: N }, () => rng.intArray(D, -20, 20));
				const medoidIdxs = rng.shuffle(Array.from({ length: N }, (_, idx) => idx)).slice(0, K);
				const cost = solveMedoidCost(N, D, stations, medoidIdxs);

				let inStr = `${N} ${D} ${K}\n`;
				inStr += stations.map((s) => s.join(" ")).join("\n") + "\n";
				inStr += medoidIdxs.join(" ");
				tcs.push(makeTc(i, inStr, cost.toString()));
			}

			return tcs;
		},
	},

	// 30. Anomalous Substation Distance Outliers
	{
		id: "anomalous-substation-distance-outliers",
		title: "Anomalous Substation Distance Outliers",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "outliers", "anomaly-detection", "knn"],
		description: "Flag points as outliers if their distance to the k-th nearest neighbor exceeds threshold T.",
		story: `<p>Power grid security algorithms detect anomalous telemetry substations using <b>k-NN distance anomaly detection</b>. An isolated sensor has a large distance to its k-th nearest neighbor. If this k-NN distance &gt; <code>threshold</code>, the sensor is flagged as an OUTLIER, otherwise NORMAL.</p>`,
		task: "For each of the N points, find the Euclidean distance to its k-th nearest distinct neighbor (excluding the query point itself) and flag as OUTLIER if distance > threshold, else NORMAL.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, <code>K</code>, and real number <code>threshold</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers.</p>`,
		outputFormat: `<p>Print <code>N</code> lines: <code>dist STATUS</code> where dist has 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50",
			"1 <= K < N",
			"1 <= D <= 4",
			"threshold > 0",
			"The k-th nearest neighbor is measured among the other N - 1 distinct points (excluding itself)"
		]),
		points: 130,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(310);
			const tcs = [];

			tcs.push(makeTc(1, "3 1 1 5.0\n0\n1\n10", "1.0000 NORMAL\n1.0000 NORMAL\n9.0000 OUTLIER", true, "Point 10 is distance 9 from its nearest neighbor (1), exceeding threshold 5.0 -> OUTLIER."));
			tcs.push(makeTc(2, "2 2 1 10.0\n0 0\n3 4", "5.0000 NORMAL\n5.0000 NORMAL", true, "Distance 5 <= 10 -> NORMAL."));

			const solveOutliers = (N: number, D: number, K: number, thresh: number, pts: number[][]): string[] => {
				const res: string[] = [];
				for (let i = 0; i < N; i++) {
					const dists: number[] = [];
					for (let j = 0; j < N; j++) {
						if (i === j) continue;
						let sq = 0;
						for (let d = 0; d < D; d++) sq += (pts[i][d] - pts[j][d]) ** 2;
						dists.push(Math.sqrt(sq));
					}
					dists.sort((a, b) => a - b);
					const kDist = dists[K - 1];
					const status = kDist > thresh ? "OUTLIER" : "NORMAL";
					res.push(`${f4(kDist)} ${status}`);
				}
				return res;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(5, 20);
				const D = rng.nextInt(1, 2);
				const K = rng.nextInt(1, Math.min(3, N - 1));
				const thresh = parseFloat(rng.nextFloat(3.0, 10.0).toFixed(1));
				const pts = Array.from({ length: N }, () => rng.floatArray(D, -15, 15, 1));
				const ans = solveOutliers(N, D, K, thresh, pts);
				let inStr = `${N} ${D} ${K} ${thresh}\n` + pts.map((p) => p.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, ans.join("\n")));
			}

			return tcs;
		},
	},
];
