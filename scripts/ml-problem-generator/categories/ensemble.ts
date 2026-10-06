import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const ensembleProblems: MLProblemDefinition[] = [
	// 89. AdaBoost Sample Weight Update
	{
		id: "adaboost-sample-weight-update",
		title: "AdaBoost Sample Weight Update",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "adaboost", "boosting"],
		description: "Compute AdaBoost weak learner weight alpha and update normalized sample weights.",
		story: `<p>In real-time face detection cascades at <b>VisionGate</b>, <b>AdaBoost</b> iteratively focuses on hard examples. Given sample weights <code>w_i</code> (summing to 1), binary labels <code>y_i in {-1, +1}</code>, and weak classifier predictions <code>h_i in {-1, +1}</code>:
<ul>
  <li>Weighted error: <code>eps = sum_{y_i != h_i} w_i</code></li>
  <li>Learner weight: <code>alpha = 0.5 * ln((1 - eps) / (eps + 1e-15))</code></li>
  <li>Unnormalized weights: <code>w_i' = w_i * exp(-alpha * y_i * h_i)</code></li>
  <li>Normalized weights: <code>w_i^{new} = w_i' / sum(w_j')</code></li>
</ul></p>`,
		task: "Given N, initial weights w, true labels y, and predictions h, compute alpha and updated normalized weights.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> initial weights <code>w</code>.</p>
<p>The third line contains <code>N</code> true labels <code>y</code> (-1 or 1).</p>
<p>The fourth line contains <code>N</code> predictions <code>h</code> (-1 or 1).</p>`,
		outputFormat: `<p>Print <code>alpha</code> on line 1, and the <code>N</code> updated weights on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"0 < eps < 0.5",
			"y_i, h_i in {-1, 1}"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1101);
			const tcs = [];

			tcs.push(makeTc(1, "4\n0.25 0.25 0.25 0.25\n1 1 -1 -1\n1 1 1 -1", "0.5493\n0.1667 0.1667 0.5000 0.1667", true, "1 error out of 4 equal weights: eps=0.25, alpha=0.5*ln(3)=0.5493."));

			const adaboostStep = (N: number, w: number[], y: number[], h: number[]): [string, string] => {
				let eps = 0;
				for (let i = 0; i < N; i++) {
					if (y[i] !== h[i]) eps += w[i];
				}
				const alpha = 0.5 * Math.log((1 - eps) / (eps + 1e-15));

				const unnorm = w.map((wi, i) => wi * Math.exp(-alpha * y[i] * h[i]));
				const sumUnnorm = unnorm.reduce((a, b) => a + b, 0);
				const nextW = unnorm.map((u) => u / sumUnnorm);

				return [f4(alpha), nextW.map(f4).join(" ")];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const rawW = rng.floatArray(N, 0.5, 2.0, 2);
				const sumW = rawW.reduce((a, b) => a + b, 0);
				const w = rawW.map((v) => v / sumW);
				const wFormatted = w.map((v) => parseFloat(v.toFixed(4)));

				const y = Array.from({ length: N }, () => (rng.next() > 0.5 ? 1 : -1));
				const h = [...y];
				// Introduce 1 or 2 errors to ensure 0 < eps < 0.5
				h[0] = -h[0];

				const inStr = `${N}\n${wFormatted.map((x) => x.toFixed(4)).join(" ")}\n${y.join(" ")}\n${h.join(" ")}`;
				const [outAlpha, outW] = adaboostStep(N, wFormatted, y, h);
				tcs.push(makeTc(i, inStr, `${outAlpha}\n${outW}`));
			}

			return tcs;
		},
	},

	// 90. Random Forest Majority Ensemble
	{
		id: "random-forest-majority-ensemble",
		title: "Random Forest Majority Ensemble",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "random-forest", "majority-voting"],
		description: "Aggregate classification predictions from T decision trees using majority voting with tie-breaking.",
		story: `<p>A high-speed transaction risk filter at <b>Veritas Shield</b> ensembles predictions from <code>T</code> decision trees in a Random Forest. For each of <code>N</code> transactions, each tree casts a vote for class <code>0, 1, or 2</code>. The ensemble selects the majority vote class. In the event of a frequency tie, the smallest class ID is chosen.</p>`,
		task: "Given sample count N and tree count T, followed by T predictions for each of the N samples, output the N majority ensemble decisions.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>T</code> (trees).</p>
<p>The next <code>N</code> lines each contain <code>T</code> space-separated integers representing the tree predictions.</p>`,
		outputFormat: `<p>Print the <code>N</code> winning class integers space-separated.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= T <= 50",
			"classes in {0, 1, 2}"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1102);
			const tcs = [];

			tcs.push(makeTc(1, "2 3\n1 1 0\n0 1 2", "1 0", true, "Sample 1 has majority 1; Sample 2 has 3-way tie, breaks to smallest class 0."));

			const majorityVote = (N: number, T: number, votes: number[][]): string => {
				const winners: number[] = [];
				for (let i = 0; i < N; i++) {
					const counts = [0, 0, 0];
					for (let t = 0; t < T; t++) counts[votes[i][t]]++;

					let bestClass = 0;
					let maxCount = -1;
					for (let c = 0; c < 3; c++) {
						if (counts[c] > maxCount) {
							maxCount = counts[c];
							bestClass = c;
						}
					}
					winners.push(bestClass);
				}
				return winners.join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const T = rng.nextInt(3, 9);
				const votes = Array.from({ length: N }, () => rng.intArray(T, 0, 2));

				const out = majorityVote(N, T, votes);
				let inStr = `${N} ${T}\n` + votes.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 91. Gradient Boosting Residual Targets
	{
		id: "gradient-boosting-residual-targets",
		title: "Gradient Boosting Residual Targets",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "gradient-boosting", "residuals"],
		description: "Compute pseudo-residuals and update ensemble predictions with shrinkage factor eta.",
		story: `<p>In Gradient Boosted Decision Trees (GBDT) at <b>QuantAlpha</b>, each new tree fits the negative gradient (residuals) of the loss function. For squared error loss:
<ul>
  <li>Residual: <code>r_i = y_i - y_hat_i</code></li>
  <li>If the new weak learner predicts <code>h_i</code>, the ensemble updates with shrinkage <code>eta</code>: <code>y_hat_i^{new} = y_hat_i + eta * h_i</code></li>
</ul></p>`,
		task: "Given N, eta, true targets y, current predictions y_hat, and weak learner predictions h, compute residuals r and updated predictions.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>eta</code>.</p>
<p>The second line contains <code>N</code> true targets <code>y</code>.</p>
<p>The third line contains <code>N</code> current predictions <code>y_hat</code>.</p>
<p>The fourth line contains <code>N</code> weak learner predictions <code>h</code>.</p>`,
		outputFormat: `<p>Print residuals <code>r</code> on line 1, and updated predictions on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"0.0 < eta <= 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1103);
			const tcs = [];

			tcs.push(makeTc(1, "2 0.1\n10 20\n8 15\n2 5", "2.0000 5.0000\n8.2000 15.5000", true, "Residuals are [2, 5]. Step 0.1 adds 0.2 and 0.5."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const eta = parseFloat(rng.nextFloat(0.05, 0.5).toFixed(2));
				const y = rng.floatArray(N, 0, 50, 1);
				const yHat = rng.floatArray(N, 0, 50, 1);
				const h = rng.floatArray(N, -10, 10, 1);

				const r = y.map((yi, idx) => f4(yi - yHat[idx])).join(" ");
				const nextY = yHat.map((yhi, idx) => f4(yhi + eta * h[idx])).join(" ");

				const inStr = `${N} ${eta}\n${y.join(" ")}\n${yHat.join(" ")}\n${h.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${r}\n${nextY}`));
			}

			return tcs;
		},
	},

	// 92. XGBoost Optimal Leaf Weight
	{
		id: "xgboost-optimal-leaf-weight",
		title: "XGBoost Optimal Leaf Weight",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "xgboost", "taylor-expansion"],
		description: "Compute the optimal leaf weight and gain in XGBoost using gradient statistics G and H.",
		story: `<p>In the exact greedy tree booster of <b>XGBoost</b>, the objective is approximated using a second-order Taylor expansion. For a leaf node aggregating <code>N</code> instances with first-order gradients <code>g_i</code>, second-order Hessians <code>h_i</code>, and L2 regularization <code>lambda</code>:
<ul>
  <li>Sum of gradients: <code>G = sum_{i=1}^N g_i</code></li>
  <li>Sum of hessians: <code>H = sum_{i=1}^N h_i</code></li>
  <li>Optimal leaf weight: <code>w^* = -G / (H + lambda)</code></li>
  <li>Node split score: <code>Gain = 0.5 * G^2 / (H + lambda)</code></li>
</ul></p>`,
		task: "Given N, lambda, and N pairs of (g_i, h_i), compute the optimal weight w^* and the node gain.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>lambda</code>.</p>
<p>The next <code>N</code> lines each contain <code>g_i</code> and <code>h_i</code>.</p>`,
		outputFormat: `<p>Print <code>w^*</code> and <code>Gain</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"lambda >= 0.0",
			"h_i > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1104);
			const tcs = [];

			tcs.push(makeTc(1, "2 1.0\n-2 1\n-3 1", "1.6667 4.1667", true, "G = -5, H = 2, H+lambda = 3. w* = -(-5)/3 = 1.6667. Gain = 0.5*25/3 = 4.1667."));

			const calcXgLeaf = (N: number, lambda: number, pairs: [number, number][]): string => {
				let G = 0;
				let H = 0;
				for (const [g, h] of pairs) {
					G += g;
					H += h;
				}
				const denom = H + lambda;
				const wStar = -G / denom;
				const gain = 0.5 * (G * G) / denom;
				return `${f4(wStar)} ${f4(gain)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(2, 8);
				const lambda = parseFloat(rng.nextFloat(0.1, 2.0).toFixed(2));
				const pairs: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const g = parseFloat(rng.nextFloat(-5.0, 5.0).toFixed(2));
					const h = parseFloat(rng.nextFloat(0.5, 3.0).toFixed(2));
					pairs.push([g, h]);
				}

				const out = calcXgLeaf(N, lambda, pairs);
				let inStr = `${N} ${lambda}\n` + pairs.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 93. Bagging Bootstrap Sample Generator
	{
		id: "bagging-bootstrap-sample-generator",
		title: "Bagging Bootstrap Sample Generator",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "bagging", "bootstrap", "oob"],
		description: "Determine the number of unique sampled instances and identify Out-Of-Bag (OOB) indices.",
		story: `<p>In Bootstrap Aggregation (<b>Bagging</b>), base estimators are trained on bootstrap replicates drawn uniformly with replacement from dataset <code>{1, ..., N}</code>. Unsampled instances are called <b>Out-Of-Bag (OOB)</b> and serve as validation data. Given <code>N</code> drawn 1-based instance indices:</p>`,
		task: "Count the number of unique sampled instances, and list all OOB indices in sorted order (print 'NONE' if no OOB indices exist).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated 1-based integers representing the bootstrap sample.</p>`,
		outputFormat: `<p>Print the unique sampled count on line 1.</p>
<p>Print the sorted space-separated OOB indices on line 2 (or 'NONE').</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= index <= N"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1105);
			const tcs = [];

			tcs.push(makeTc(1, "5\n1 2 2 4 1", "3\n3 5", true, "Sampled {1,2,4} (3 unique). OOB instances are 3 and 5."));
			tcs.push(makeTc(2, "3\n1 2 3", "3\nNONE", true, "All instances sampled; OOB is NONE."));

			const evaluateOob = (N: number, samples: number[]): [string, string] => {
				const sampledSet = new Set(samples);
				const oob: number[] = [];
				for (let i = 1; i <= N; i++) {
					if (!sampledSet.has(i)) oob.push(i);
				}
				const oobStr = oob.length > 0 ? oob.join(" ") : "NONE";
				return [sampledSet.size.toString(), oobStr];
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(4, 15);
				const samples = Array.from({ length: N }, () => rng.nextInt(1, N));
				const [uCount, oobStr] = evaluateOob(N, samples);
				tcs.push(makeTc(i, `${N}\n${samples.join(" ")}`, `${uCount}\n${oobStr}`));
			}

			return tcs;
		},
	},

	// 94. Stacking Ensemble Meta-Feature Matrix
	{
		id: "stacking-ensemble-meta-feature-matrix",
		title: "Stacking Ensemble Meta-Feature Matrix",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "ensemble", "stacking", "meta-learning"],
		description: "Construct the second-level meta-feature matrix by concatenating raw features with base model predictions.",
		story: `<p>At competitive data science platform <b>KaggleMaster Labs</b>, winning solutions employ <b>Stacking</b>. For <code>N</code> samples, each having <code>D</code> original features and <code>M</code> probability predictions from level-0 base models, the meta-model trains on augmented feature vectors:
<code>Z_i = [x_{i1}, ..., x_{iD}, p_{i1}, ..., p_{iM}] in R^(D + M)</code>.</p>`,
		task: "Given N, D, M, the N x D original feature matrix, and N x M prediction matrix, output the concatenated N x (D + M) meta-matrix.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and <code>M</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers (original features).</p>
<p>The next <code>N</code> lines each contain <code>M</code> real numbers (base model predictions).</p>`,
		outputFormat: `<p>Print <code>N</code> lines, each containing <code>D + M</code> real numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= D <= 10",
			"1 <= M <= 10"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1106);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 1\n1 2\n3 4\n0.8\n0.2", "1.0000 2.0000 0.8000\n3.0000 4.0000 0.2000", true, "Concatenation of 2 features and 1 prediction."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(2, 6);
				const D = rng.nextInt(1, 3);
				const M = rng.nextInt(1, 3);

				const X = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 2));
				const P = Array.from({ length: N }, () => rng.floatArray(M, 0, 1, 3));

				const outLines = X.map((xRow, idx) => {
					const combined = [...xRow.map(f4), ...P[idx].map(f4)];
					return combined.join(" ");
				});

				let inStr = `${N} ${D} ${M}\n` +
					X.map((r) => r.join(" ")).join("\n") + "\n" +
					P.map((r) => r.join(" ")).join("\n");

				tcs.push(makeTc(i, inStr, outLines.join("\n")));
			}

			return tcs;
		},
	},
];
