import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const recommendationProblems: MLProblemDefinition[] = [
	// 75. Cinephile User Collaborative Filtering
	{
		id: "cinephile-user-collaborative-filtering",
		title: "Cinephile User Collaborative Filtering",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "collaborative-filtering", "pearson"],
		description: "Predict a user's movie rating using neighbor similarity weights and mean rating deviations.",
		story: `<p>Streaming entertainment titan <b>Cinephile Networks</b> personalizes movie recommendations using user-based collaborative filtering. To predict user <code>u</code>'s rating for candidate movie <code>i</code> from <code>K</code> peer neighbors with similarities <code>s_v</code> and rating deviations <code>(r_{vi} - r_bar_v)</code>:
<code>r_hat_{ui} = r_bar_u + sum_{v=1}^K (s_v * (r_{vi} - r_bar_v)) / sum_{v=1}^K |s_v|</code>
If the denominator is 0, the prediction falls back to user mean <code>r_bar_u</code>.</p>`,
		task: "Given r_bar_u, neighbor count K, and K pairs of (similarity, deviation), compute predicted rating r_hat_{ui}.",
		inputFormat: `<p>The first line contains real number <code>r_bar_u</code> and integer <code>K</code>.</p>
<p>The next <code>K</code> lines each contain similarity <code>s_v</code> and deviation <code>dev_v</code>.</p>`,
		outputFormat: `<p>Print the predicted rating with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= 50",
			"0.0 <= r_bar_u <= 5.0",
			"-1.0 <= s_v <= 1.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(901);
			const tcs = [];

			tcs.push(makeTc(1, "3.5 2\n0.8 1.0\n0.2 -0.5", "4.2000", true, "Dev sum = 0.8*1.0 + 0.2*(-0.5) = 0.7. Denom = 0.8+0.2 = 1.0. Rating = 3.5 + 0.7 = 4.2."));
			tcs.push(makeTc(2, "4.0 1\n0.0 2.0", "4.0000", true, "Zero weight fallback to user mean."));

			const predictRating = (rBarU: number, K: number, neighbors: [number, number][]): number => {
				let num = 0;
				let denom = 0;
				for (const [s, dev] of neighbors) {
					num += s * dev;
					denom += Math.abs(s);
				}
				if (denom === 0) return rBarU;
				return rBarU + num / denom;
			};

			for (let i = 3; i <= 100; i++) {
				const rBarU = parseFloat(rng.nextFloat(2.0, 4.5).toFixed(2));
				const K = rng.nextInt(2, 6);
				const neighbors: [number, number][] = [];
				for (let k = 0; k < K; k++) {
					const s = parseFloat(rng.nextFloat(0.1, 0.95).toFixed(2));
					const dev = parseFloat(rng.nextFloat(-2.0, 2.0).toFixed(2));
					neighbors.push([s, dev]);
				}

				const out = f4(predictRating(rBarU, K, neighbors));
				let inStr = `${rBarU} ${K}\n` + neighbors.map((n) => `${n[0]} ${n[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 76. E-Commerce Item Cosine Recommender
	{
		id: "e-commerce-item-cosine-recommender",
		title: "E-Commerce Item Cosine Recommender",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "cosine-similarity", "item-based"],
		description: "Find the top-1 catalog item most similar to a viewed target product vector using cosine similarity.",
		story: `<p>An e-commerce marketplace at <b>ShopSphere</b> features a 'Customers Also Liked' carousel. Given an item embedding vector <code>v_target in R^D</code> and <code>M</code> candidate product vectors in the catalog, the engine ranks candidates by <b>Cosine Similarity</b>:
<code>cos_sim(v_target, v_m) = (v_target * v_m) / (||v_target|| * ||v_m||)</code>.
Output the 1-based index of the top candidate (highest similarity) and its similarity score.</p>`,
		task: "Given D, M, target vector v_target, and M catalog vectors, find the 1-based index and similarity of the best match.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>M</code>.</p>
<p>The second line contains <code>D</code> real numbers representing <code>v_target</code>.</p>
<p>The next <code>M</code> lines each contain <code>D</code> real numbers representing catalog items.</p>`,
		outputFormat: `<p>Print the 1-based item index and maximum cosine similarity with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"1 <= M <= 50",
			"||v|| > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(902);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n2 0", "2 1.0000", true, "Item 2 is parallel to target (sim=1.0000)."));

			const findTopItem = (D: number, M: number, target: number[], items: number[][]): string => {
				const normT = Math.sqrt(target.reduce((s, x) => s + x * x, 0));
				let bestIdx = 1;
				let bestSim = -Infinity;

				for (let m = 0; m < M; m++) {
					const it = items[m];
					const normI = Math.sqrt(it.reduce((s, x) => s + x * x, 0));
					let dot = 0;
					for (let d = 0; d < D; d++) dot += target[d] * it[d];
					const sim = normT * normI === 0 ? 0 : dot / (normT * normI);

					if (sim > bestSim) {
						bestSim = sim;
						bestIdx = m + 1;
					}
				}
				return `${bestIdx} ${f4(bestSim)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 5);
				const M = rng.nextInt(2, 6);
				const target = rng.floatArray(D, -5, 5, 2);
				target[0] += 2;
				const items = Array.from({ length: M }, () => rng.floatArray(D, -5, 5, 2));
				items[0][0] += 2;

				const out = findTopItem(D, M, target, items);
				let inStr = `${D} ${M}\n${target.join(" ")}\n` + items.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 77. Streaming Matrix Factorization SGD
	{
		id: "streaming-matrix-factorization-sgd",
		title: "Streaming Matrix Factorization SGD",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "matrix-factorization", "sgd"],
		description: "Perform one step of stochastic gradient descent on latent user and item factor vectors.",
		story: `<p>In real-time recommendation engines at <b>FluxMedia</b>, collaborative filtering models factorize user-item rating matrices into latent factors <code>p_u in R^K</code> and <code>q_i in R^K</code>. When a new rating <code>r_{ui}</code> arrives:
<ul>
  <li>Prediction error: <code>e = r_{ui} - (p_u * q_i)</code></li>
  <li>User update: <code>p_u' = p_u + gamma * (e * q_i - lambda * p_u)</code></li>
  <li>Item update: <code>q_i' = q_i + gamma * (e * p_u - lambda * q_i)</code></li>
</ul>
Notice that both vector updates simultaneously use the original values of <code>p_u</code> and <code>q_i</code>.</p>`,
		task: "Given K, learning rate gamma, regularizer lambda, true rating r, and initial vectors p_u and q_i, output the updated vectors p_u' and q_i'.",
		inputFormat: `<p>The first line contains integer <code>K</code>, and real numbers <code>gamma</code>, <code>lambda</code>, and <code>r</code>.</p>
<p>The second line contains <code>K</code> real numbers representing <code>p_u</code>.</p>
<p>The third line contains <code>K</code> real numbers representing <code>q_i</code>.</p>`,
		outputFormat: `<p>Print <code>p_u'</code> on the first line and <code>q_i'</code> on the second line (4 decimals).</p>`,
		constraints: formatConstraints([
			"1 <= K <= 10",
			"0.001 <= gamma <= 0.1",
			"0.0 <= lambda <= 0.5"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(903);
			const tcs = [];

			tcs.push(makeTc(1, "2 0.05 0.02 5.0\n1 2\n2 1", "1.0490 2.0230\n2.0230 1.0470", true, "Dot = 4, error = 1.0. Both vectors step positively."));

			const mfSgd = (K: number, gamma: number, lambda: number, r: number, p: number[], q: number[]): [string, string] => {
				let dot = 0;
				for (let k = 0; k < K; k++) dot += p[k] * q[k];
				const err = r - dot;

				const nextP = p.map((pk, k) => pk + gamma * (err * q[k] - lambda * pk));
				const nextQ = q.map((qk, k) => qk + gamma * (err * p[k] - lambda * qk));

				return [nextP.map(f4).join(" "), nextQ.map(f4).join(" ")];
			};

			for (let i = 2; i <= 100; i++) {
				const K = rng.nextInt(2, 4);
				const gamma = parseFloat(rng.nextFloat(0.01, 0.05).toFixed(3));
				const lambda = parseFloat(rng.nextFloat(0.01, 0.05).toFixed(3));
				const r = parseFloat(rng.nextFloat(1.0, 5.0).toFixed(1));
				const p = rng.floatArray(K, 0.5, 2.0, 2);
				const q = rng.floatArray(K, 0.5, 2.0, 2);

				const [outP, outQ] = mfSgd(K, gamma, lambda, r, p, q);
				const inStr = `${K} ${gamma} ${lambda} ${r}\n${p.join(" ")}\n${q.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${outP}\n${outQ}`));
			}

			return tcs;
		},
	},

	// 78. Music Box Jaccard Playlist Similarity
	{
		id: "music-box-jaccard-playlist-similarity",
		title: "Music Box Jaccard Playlist Similarity",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "jaccard-similarity", "set-theory"],
		description: "Compute the Jaccard similarity coefficient between two sets of song IDs.",
		story: `<p>Music streaming app <b>MusicBox</b> recommends friends with matching musical tastes. Given two playlists represented as unique sets of integer song IDs <code>A</code> and <code>B</code>, the similarity is quantified by the <b>Jaccard Similarity Coefficient</b>:
<code>J(A, B) = |A cap B| / |A cup B|</code>.
If both sets are empty, similarity is defined as <code>1.0000</code>.</p>`,
		task: "Given the size and elements of playlist A, and size and elements of playlist B, compute Jaccard similarity.",
		inputFormat: `<p>The first line contains integer <code>N_A</code> followed by <code>N_A</code> unique integer song IDs.</p>
<p>The second line contains integer <code>N_B</code> followed by <code>N_B</code> unique integer song IDs.</p>`,
		outputFormat: `<p>Print the Jaccard similarity with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"0 <= N_A, N_B <= 100",
			"1 <= song_id <= 10000"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(904);
			const tcs = [];

			tcs.push(makeTc(1, "3 1 2 3\n3 2 3 4", "0.5000", true, "Intersection {2,3}=2, Union {1,2,3,4}=4. 2/4 = 0.5."));
			tcs.push(makeTc(2, "2 10 20\n2 30 40", "0.0000", true, "Disjoint playlists have 0 similarity."));

			const jaccard = (A: Set<number>, B: Set<number>): number => {
				if (A.size === 0 && B.size === 0) return 1.0;
				let intersection = 0;
				for (const a of A) {
					if (B.has(a)) intersection++;
				}
				const union = new Set([...A, ...B]).size;
				return union === 0 ? 1.0 : intersection / union;
			};

			for (let i = 3; i <= 100; i++) {
				const nA = rng.nextInt(2, 8);
				const nB = rng.nextInt(2, 8);
				const pool = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
				const setA = new Set(rng.shuffle(pool).slice(0, nA));
				const setB = new Set(rng.shuffle(pool).slice(0, nB));

				const out = f4(jaccard(setA, setB));
				const inStr = `${setA.size} ${Array.from(setA).join(" ")}\n${setB.size} ${Array.from(setB).join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 79. App Store NDCG Ranking Metric
	{
		id: "app-store-ndcg-ranking-metric",
		title: "App Store NDCG Ranking Metric",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "evaluation-metrics", "ndcg"],
		description: "Compute DCG@K, Ideal DCG@K, and Normalized Discounted Cumulative Gain (NDCG@K) for a ranked list.",
		story: `<p>Search ranking engineers at <b>AppStore Core</b> measure search result utility using <b>NDCG@K</b>:
<ul>
  <li><code>DCG@K = sum_{i=1}^K rel_i / log2(i + 1)</code></li>
  <li><code>IDCG@K</code> is the DCG@K obtained by sorting the relevance values in descending order.</li>
  <li><code>NDCG@K = DCG@K / IDCG@K</code> (if <code>IDCG@K == 0</code>, <code>NDCG = 1.0000</code>)</li>
</ul></p>`,
		task: "Given length K and K relevance scores, compute DCG@K, IDCG@K, and NDCG@K.",
		inputFormat: `<p>The first line contains integer <code>K</code>.</p>
<p>The second line contains <code>K</code> space-separated non-negative integer relevance scores.</p>`,
		outputFormat: `<p>Print <code>DCG</code>, <code>IDCG</code>, and <code>NDCG</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= 20",
			"0 <= rel_i <= 5"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(905);
			const tcs = [];

			tcs.push(makeTc(1, "3\n3 2 0", "4.2619 4.2619 1.0000", true, "Already perfectly ordered list has NDCG=1.0."));
			tcs.push(makeTc(2, "3\n0 2 3", "2.7619 4.2619 0.6480", true, "Suboptimal ranking discounted."));

			const calcNdcg = (K: number, rels: number[]): string => {
				const dcg = rels.reduce((s, r, i) => s + r / Math.log2(i + 2), 0);
				const ideal = [...rels].sort((a, b) => b - a);
				const idcg = ideal.reduce((s, r, i) => s + r / Math.log2(i + 2), 0);
				const ndcg = idcg === 0 ? 1.0 : dcg / idcg;
				return `${f4(dcg)} ${f4(idcg)} ${f4(ndcg)}`;
			};

			for (let i = 3; i <= 100; i++) {
				const K = rng.nextInt(3, 8);
				const rels = rng.intArray(K, 0, 4);
				if (rels.every((r) => r === 0)) rels[0] = 3;

				const out = calcNdcg(K, rels);
				tcs.push(makeTc(i, `${K}\n${rels.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 80. Social Graph Mean Reciprocal Rank
	{
		id: "social-graph-mean-reciprocal-rank",
		title: "Social Graph Mean Reciprocal Rank",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "evaluation-metrics", "mrr"],
		description: "Compute Mean Reciprocal Rank (MRR) across Q recommendation queries.",
		story: `<p>A social discovery platform at <b>NexusSocial</b> recommends candidate connections to users. Quality is evaluated using <b>Mean Reciprocal Rank (MRR)</b>:
<code>MRR = 1/Q * sum_{q=1}^Q (1 / rank_q)</code>
where <code>rank_q</code> is the 1-based rank position of the first accepted connection. If no candidate was accepted in query <code>q</code>, <code>rank_q = 0</code> and its reciprocal rank is 0.</p>`,
		task: "Given Q query test cases and the first relevant rank position for each, compute the MRR score.",
		inputFormat: `<p>The first line contains integer <code>Q</code>.</p>
<p>The second line contains <code>Q</code> space-separated integers representing the first relevant rank (0 if none).</p>`,
		outputFormat: `<p>Print the MRR score with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= Q <= 100",
			"0 <= rank_q <= 50"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(906);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 2 0", "0.5000", true, "Ranks [1, 2, 0] have reciprocal ranks [1.0, 0.5, 0.0]. Mean = 1.5/3 = 0.5000."));
			tcs.push(makeTc(2, "2\n1 1", "1.0000", true, "Perfect first-position recall."));

			for (let i = 3; i <= 100; i++) {
				const Q = rng.nextInt(3, 10);
				const ranks = Array.from({ length: Q }, () => (rng.next() < 0.2 ? 0 : rng.nextInt(1, 10)));
				const mrr = ranks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / Q;
				tcs.push(makeTc(i, `${Q}\n${ranks.join(" ")}`, f4(mrr)));
			}

			return tcs;
		},
	},

	// 81. Video Feed Hit Ratio at K
	{
		id: "video-feed-hit-ratio-at-k",
		title: "Video Feed Hit Ratio at K",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "evaluation-metrics", "hit-ratio"],
		description: "Compute Hit Ratio@K (HR@K) across U users given ground-truth interaction item.",
		story: `<p>Short-form video app <b>TikStream</b> benchmarks candidate generation models using <b>Hit Ratio at K (HR@K)</b>. For each user <code>u</code>, the candidate generation model produces a top-<code>K</code> ranked list of video IDs. If the ground-truth target video that the user eventually watched is present anywhere inside the top-<code>K</code> list, the query counts as a Hit:
<code>HR@K = Total Hits / U</code>.</p>`,
		task: "Given user count U, list size K, and for each user their target video ID followed by K recommendations, compute HR@K.",
		inputFormat: `<p>The first line contains integers <code>U</code> and <code>K</code>.</p>
<p>The next <code>U</code> lines each contain <code>target_id</code> followed by <code>K</code> recommended video IDs.</p>`,
		outputFormat: `<p>Print the Hit Ratio HR@K with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= U <= 100",
			"1 <= K <= 20",
			"all video IDs are positive integers"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(907);
			const tcs = [];

			tcs.push(makeTc(1, "2 3\n5 1 2 5\n9 1 2 3", "0.5000", true, "User 1 has target 5 in [1, 2, 5] (hit). User 2 target 9 not in [1, 2, 3] (miss)."));

			const calcHitRatio = (U: number, K: number, cases: [number, number[]][]): number => {
				let hits = 0;
				for (const [target, recs] of cases) {
					if (recs.includes(target)) hits++;
				}
				return hits / U;
			};

			for (let i = 2; i <= 100; i++) {
				const U = rng.nextInt(3, 8);
				const K = rng.nextInt(2, 5);
				const cases: [number, number[]][] = [];

				for (let u = 0; u < U; u++) {
					const target = rng.nextInt(1, 10);
					const recs = rng.intArray(K, 1, 10);
					// Occasionally inject target
					if (rng.next() > 0.5) recs[rng.nextInt(0, K - 1)] = target;
					cases.push([target, recs]);
				}

				const out = f4(calcHitRatio(U, K, cases));
				let inStr = `${U} ${K}\n` + cases.map((c) => `${c[0]} ${c[1].join(" ")}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 82. Bazaar ALS Single Factor Update
	{
		id: "bazaar-als-single-factor-update",
		title: "Bazaar ALS Single Factor Update",
		difficulty: "Hard",
		category: "machine-learning",
		tags: ["machine-learning", "recommender-systems", "als", "linear-algebra"],
		description: "Compute the closed-form 2D latent factor update step for Alternating Least Squares (ALS).",
		story: `<p>Wholesale marketplace <b>Bazaar Express</b> uses <b>Alternating Least Squares (ALS)</b> with L2 regularization to factorize sparse purchase matrices. For a user with <code>N</code> rated items, latent item matrix <code>V in R^(N x 2)</code>, rating vector <code>r in R^N</code>, and regularization <code>lambda</code>, the closed-form user factor update is:
<code>u = (V^T * V + lambda * I_2)^(-1) * (V^T * r)</code>.</p>`,
		task: "Given N, lambda, matrix V (N rows of 2 columns), and rating vector r, solve for the updated 2D factor vector u.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>lambda</code>.</p>
<p>The next <code>N</code> lines each contain 2 real numbers representing rows of matrix <code>V</code>.</p>
<p>The last line contains <code>N</code> real numbers representing vector <code>r</code>.</p>`,
		outputFormat: `<p>Print the 2 components of vector <code>u</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"lambda > 0.0",
			"-10.0 <= values <= 10.0"
		]),
		points: 200,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(908);
			const tcs = [];

			tcs.push(makeTc(1, "2 1.0\n1 0\n0 1\n2 3", "1.0000 1.5000", true, "V^T V + I = 2*I_2. Inverse is 0.5*I_2. u = [0.5*2, 0.5*3] = [1.0, 1.5]."));

			const alsUpdate2D = (N: number, lambda: number, V: number[][], r: number[]): string => {
				// A = V^T V + lambda * I_2
				let a11 = lambda, a12 = 0, a21 = 0, a22 = lambda;
				for (let i = 0; i < N; i++) {
					a11 += V[i][0] * V[i][0];
					a12 += V[i][0] * V[i][1];
					a21 += V[i][1] * V[i][0];
					a22 += V[i][1] * V[i][1];
				}

				// b = V^T r
				let b1 = 0, b2 = 0;
				for (let i = 0; i < N; i++) {
					b1 += V[i][0] * r[i];
					b2 += V[i][1] * r[i];
				}

				// 2x2 inverse
				const det = a11 * a22 - a12 * a21;
				const inv11 = a22 / det;
				const inv12 = -a12 / det;
				const inv21 = -a21 / det;
				const inv22 = a11 / det;

				const u1 = inv11 * b1 + inv12 * b2;
				const u2 = inv21 * b1 + inv22 * b2;

				return `${f4(u1)} ${f4(u2)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(2, 6);
				const lambda = parseFloat(rng.nextFloat(0.5, 2.0).toFixed(2));
				const V = Array.from({ length: N }, () => rng.floatArray(2, -3, 3, 2));
				const r = rng.floatArray(N, 1, 5, 1);

				const out = alsUpdate2D(N, lambda, V, r);
				let inStr = `${N} ${lambda}\n` + V.map((row) => row.join(" ")).join("\n") + `\n${r.join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},
];
