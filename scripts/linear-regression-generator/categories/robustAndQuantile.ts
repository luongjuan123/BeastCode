import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, dot, solveOLS } from "../utils";

export const robustAndQuantileProblems: LRProblemDefinition[] = [
	// 76. Huber Loss Evaluation
	{
		id: "lr-huber-loss-evaluation",
		title: "Huber Robust Loss Evaluation",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "huber-loss", "robust-statistics", "loss-functions"],
		description: "Compute total Huber loss on residuals e = y - y_hat with canonical delta = 1.345.",
		story: `<p>Seismic telemetry at <b>GeophysicsAI</b> resists seismic sensor spike artifacts using the <b>Huber Loss</b> (95% asymptotic efficiency on Gaussian noise):
For error <code>e = y - y_hat</code>:
<ul>
  <li>If <code>|e| <= delta</code>: <code>L(e) = 0.5 * e^2</code></li>
  <li>If <code>|e| > delta</code>: <code>L(e) = delta * |e| - 0.5 * delta^2</code></li>
</ul>
Fixed hyperparameter:
<ul>
  <li><code>delta = 1.345</code></li>
</ul></p>`,
		task: "Given sample count N, true targets y, and predictions y_hat, compute total Huber loss.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated true targets <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated predictions <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print the total Huber loss with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"delta = 1.345"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2501);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 10\n1 8", "2.1913", true, "e=[0, 2]. L(0)=0. L(2) = 1.345*2 - 0.5*1.345^2 = 2.69 - 0.9045 = 1.7855? Wait check formula."));

			const evalHuber = (N: number, y: number[], yHat: number[]): number => {
				const delta = 1.345;
				let total = 0;
				for (let i = 0; i < N; i++) {
					const e = Math.abs(y[i] - yHat[i]);
					if (e <= delta) {
						total += 0.5 * e * e;
					} else {
						total += delta * e - 0.5 * delta * delta;
					}
				}
				return total;
			};

			tcs[0] = makeTc(1, "2\n1 10\n1 8", f4(evalHuber(2, [1, 10], [1, 8])), true, "Sample with e=0 and e=2.");

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const y = rng.floatArray(N, -10, 10, 2);
				const yHat = rng.floatArray(N, -10, 10, 2);
				const loss = evalHuber(N, y, yHat);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, f4(loss)));
			}

			return tcs;
		},
	},

	// 77. Quantile Pinball Loss
	{
		id: "lr-quantile-pinball-loss",
		title: "Quantile Regression Pinball Loss (tau = 0.75)",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "quantile-regression", "pinball-loss"],
		description: "Compute mean pinball loss at the 75th percentile (tau = 0.75): L_tau = max(tau * e, (tau - 1) * e).",
		story: `<p>Wind energy dispatchers at <b>VoltRenewables</b> predict the 75th percentile of gust generation using <b>Pinball Loss</b>:
For residual <code>e = y - y_hat</code>:
<code>L_tau(e) = max(tau * e, (tau - 1) * e)</code>
The mean loss is <code>1/N * sum L_tau(e_i)</code>.
Fixed hyperparameter:
<ul>
  <li><code>tau = 0.75</code></li>
</ul></p>`,
		task: "Given N, targets y, and predictions y_hat, compute mean pinball loss at tau = 0.75.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> real numbers representing <code>y</code>.</p>
<p>The third line contains <code>N</code> real numbers representing <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print the mean pinball loss with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"tau = 0.75"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2502);
			const tcs = [];

			tcs.push(makeTc(1, "2\n5 2\n3 4", "1.0000", true, "e_1=+2 -> 0.75*2=1.5. e_2=-2 -> -0.25*(-2)=0.5. Mean = 1.0."));

			const evalPinball = (N: number, y: number[], yHat: number[]): number => {
				const tau = 0.75;
				let total = 0;
				for (let i = 0; i < N; i++) {
					const e = y[i] - yHat[i];
					total += Math.max(tau * e, (tau - 1) * e);
				}
				return total / N;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const y = rng.floatArray(N, -5, 10, 2);
				const yHat = rng.floatArray(N, -5, 10, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, f4(evalPinball(N, y, yHat))));
			}

			return tcs;
		},
	},

	// 78. Median LAD Subgradient Step
	{
		id: "lr-median-lad-subgradient-step",
		title: "Least Absolute Deviations (LAD) Subgradient Descent",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "lad", "median-regression", "subgradient"],
		description: "Run 20 steps of subgradient descent on L1 loss L = 1/N * sum |y_i - x_i^T w| with alpha = 0.05, steps = 20, w_0 = 0.",
		story: `<p>Econometric wage modeling at <b>LaborMetrics</b> fits median regression (LAD) resistant to billionaire salary outliers:
<code>subgrad = -1/N * sum_{i=1}^N sign(y_i - x_i^T * w) * x_i</code> (with <code>sign(0) = 0</code>)
<code>w_{t+1} = w_t - alpha * subgrad</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.05, steps = 20, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 20 subgradient steps and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.05, steps = 20"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2503);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.5000", true, "Subgradient steps incrementally: 20 * 0.05 * 1.5 = 1.5."));

			const solveLad = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				const steps = 20;
				let w = new Array(D).fill(0);

				for (let t = 0; t < steps; t++) {
					const subgrad = new Array(D).fill(0);
					for (let i = 0; i < N; i++) {
						const err = y[i] - dot(X[i], w);
						const s = err > 1e-9 ? 1 : err < -1e-9 ? -1 : 0;
						for (let d = 0; d < D; d++) subgrad[d] -= s * X[i][d];
					}
					for (let d = 0; d < D; d++) subgrad[d] /= N;
					w = w.map((wi, d) => wi - alpha * subgrad[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveLad(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 79. Theil-Sen Median Slope
	{
		id: "lr-theil-sen-median-slope",
		title: "Theil-Sen Robust Median Estimator",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "theil-sen", "robust-regression", "median"],
		description: "Compute Theil-Sen slope as the median of all pairwise slopes s_{ij} = (y_j - y_i) / (x_j - x_i) and intercept as median(y - beta_1 * x).",
		story: `<p>Environmental sensor telemetry at <b>EnviroSense</b> carries extreme transmission dropouts (up to 29% breakdown point). The <b>Theil-Sen Estimator</b> computes the slope as the median of slopes between all distinct pairs of points:
<code>s_{ij} = (y_j - y_i) / (x_j - x_i)</code> for all <code>1 <= i < j <= N</code>.
<code>beta_1 = median(s_{ij})</code>
<code>beta_0 = median(y_i - beta_1 * x_i)</code>.</p>`,
		task: "Given N and N pairs of (x_i, y_i), compute Theil-Sen intercept beta_0 and slope beta_1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 25",
			"x_i are all distinct"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2504);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2\n2 4\n3 6\n4 100", "0.0000 2.0000", true, "Outlier at x=4 ignored by median slope=2.0."));

			const solveTheilSen = (pts: [number, number][]): [number, number] => {
				const n = pts.length;
				const slopes: number[] = [];
				for (let i = 0; i < n; i++) {
					for (let j = i + 1; j < n; j++) {
						slopes.push((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]));
					}
				}
				slopes.sort((a, b) => a - b);
				const midS = Math.floor(slopes.length / 2);
				const b1 = slopes.length % 2 === 1 ? slopes[midS] : (slopes[midS - 1] + slopes[midS]) / 2;

				const intercepts = pts.map(([x, y]) => y - b1 * x);
				intercepts.sort((a, b) => a - b);
				const midI = Math.floor(intercepts.length / 2);
				const b0 = intercepts.length % 2 === 1 ? intercepts[midI] : (intercepts[midI - 1] + intercepts[midI]) / 2;

				return [b0, b1];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 8);
				const trueB0 = rng.nextInt(-3, 3);
				const trueB1 = rng.nextInt(1, 4);
				const pts: [number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x = j * 2 + 1;
					let y = trueB0 + trueB1 * x;
					if (j === N - 1) y += 50; // inject massive outlier
					pts.push([x, y]);
				}

				const [b0, b1] = solveTheilSen(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b0)} ${f4(b1)}`));
			}

			return tcs;
		},
	},

	// 80. RANSAC Single Iteration
	{
		id: "lr-ransac-single-iteration",
		title: "RANSAC Single Iteration Inlier Counting",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "ransac", "inliers", "computer-vision"],
		description: "Fit line through 2 candidate points and count inliers with residual <= 0.5.",
		story: `<p>LiDAR surface segmentation at <b>VisionAuto</b> detects road planes despite sensor reflection noise using <b>RANSAC (Random Sample Consensus)</b>:
A candidate line <code>y = beta_0 + beta_1 * x</code> is formed through two selected sample points <code>(x_1, y_1)</code> and <code>(x_2, y_2)</code>:
<code>beta_1 = (y_2 - y_1) / (x_2 - x_1), beta_0 = y_1 - beta_1 * x_1</code>.
A point is an inlier if <code>|y_i - (beta_0 + beta_1 * x_i)| <= threshold</code>.
Fixed hyperparameter:
<ul>
  <li><code>threshold = 0.5</code></li>
</ul></p>`,
		task: "Given the 2 selected points and N total dataset points, compute candidate beta_0, beta_1, and total inliers.",
		inputFormat: `<p>The first line contains 4 real numbers: <code>x_1 y_1 x_2 y_2</code> (sampled points).</p>
<p>The second line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 inlier_count</code> space-separated (beta with 4 decimals, count as integer).</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"x_1 != x_2",
			"threshold = 0.5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2505);
			const tcs = [];

			tcs.push(makeTc(1, "1 2 2 4\n3\n1 2\n2 4\n3 10", "0.0000 2.0000 2", true, "Points 1 and 2 are inliers; point 3 is outlier."));

			const solveRansac1 = (p1: [number, number], p2: [number, number], pts: [number, number][]): [number, number, number] => {
				const b1 = (p2[1] - p1[1]) / (p2[0] - p1[0]);
				const b0 = p1[1] - b1 * p1[0];

				let inliers = 0;
				for (const [x, y] of pts) {
					const pred = b0 + b1 * x;
					if (Math.abs(y - pred) <= 0.5) inliers++;
				}
				return [b0, b1, inliers];
			};

			for (let i = 2; i <= 100; i++) {
				const p1: [number, number] = [1, parseFloat(rng.nextFloat(1, 5).toFixed(1))];
				const p2: [number, number] = [3, parseFloat(rng.nextFloat(5, 10).toFixed(1))];
				const N = rng.nextInt(5, 12);
				const pts: [number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x = j + 1;
					const b1 = (p2[1] - p1[1]) / (p2[0] - p1[0]);
					const b0 = p1[1] - b1 * p1[0];
					let y = b0 + b1 * x;
					if (rng.next() < 0.3) y += 5; // outlier
					pts.push([x, parseFloat(y.toFixed(2))]);
				}

				const [b0, b1, count] = solveRansac1(p1, p2, pts);
				const inStr = `${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}\n${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b0)} ${f4(b1)} ${count}`));
			}

			return tcs;
		},
	},

	// 81. IRLS Huber Single Iteration
	{
		id: "lr-irls-huber-single-iteration",
		title: "Iteratively Reweighted Least Squares (IRLS) Huber Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "irls", "huber", "reweighting"],
		description: "Compute WLS update beta = (X^T W X)^(-1) X^T W y with Huber weights w_i = 1 if |e_i| <= 1.0 else 1.0 / |e_i|.",
		story: `<p>In robust survey calibration at <b>MetroStat</b>, M-estimators solve for parameters using <b>Iteratively Reweighted Least Squares (IRLS)</b>:
Given current residuals <code>e_i</code>:
<code>w_i = 1.0 if |e_i| <= delta else delta / |e_i|</code>
Then solve weighted regression <code>beta = (X^T W X)^(-1) X^T W y</code>.
Fixed hyperparameter:
<ul>
  <li><code>delta = 1.0</code></li>
</ul></p>`,
		task: "Given N, D, design matrix X, target y, and current residuals e, compute the next beta estimate.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The next line contains <code>N</code> real numbers representing <code>y</code>.</p>
<p>The last line contains <code>N</code> real numbers representing residuals <code>e</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> components of beta space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 2",
			"delta = 1.0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2506);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4\n0.5 2.0", "2.0000", true, "Residual 2.0 gets downweighted to 0.5; fitted slope is 2.0000."));

			const solveIrlsStep = (N: number, D: number, X: number[][], y: number[], e: number[]): number[] => {
				const weights = e.map((res) => {
					const absR = Math.abs(res);
					return absR <= 1.0 ? 1.0 : 1.0 / absR;
				});
				const Xw: number[][] = Array.from({ length: N }, (_, i) => {
					const sqrtW = Math.sqrt(weights[i]);
					return X[i].map((v) => v * sqrtW);
				});
				const yw = y.map((val, i) => val * Math.sqrt(weights[i]));
				return solveOLS(Xw, yw, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = 1;
				const X = Array.from({ length: N }, () => [parseFloat(rng.nextFloat(0.5, 3.0).toFixed(1))]);
				X[0][0] += 1;
				const y = rng.floatArray(N, 1, 10, 1);
				const e = rng.floatArray(N, -3, 3, 2);

				const beta = solveIrlsStep(N, D, X, y, e);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}\n${e.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 82. Tukey Bisquare Weights
	{
		id: "lr-tukey-bisquare-weights",
		title: "Tukey Bisquare M-Estimator Weights",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "tukey-bisquare", "m-estimator", "weights"],
		description: "Compute Tukey Bisquare weights: if |e_i / c| <= 1: w_i = (1 - (e_i / c)^2)^2; else w_i = 0 with c = 4.685.",
		story: `<p>In red-descending M-estimation at <b>RobustLab</b>, <b>Tukey's Biweight / Bisquare</b> function completely discards extreme outliers (weights drop smoothly to zero):
<code>u_i = e_i / c</code>
<ul>
  <li>If <code>|u_i| <= 1.0</code>: <code>w_i = (1 - u_i^2)^2</code></li>
  <li>If <code>|u_i| > 1.0</code>: <code>w_i = 0.0000</code></li>
</ul>
Fixed hyperparameter:
<ul>
  <li><code>c = 4.685</code> (95% Gaussian tuning constant)</li>
</ul></p>`,
		task: "Given N and N residuals e, compute Tukey Bisquare weights.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> real numbers representing residuals <code>e</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"c = 4.685"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2507);
			const tcs = [];

			tcs.push(makeTc(1, "3\n0 2.3425 6.0", "1.0000 0.5625 0.0000", true, "u=[0, 0.5, >1] -> w=[1, (1-0.25)^2=0.5625, 0]."));

			const tukey = (residuals: number[]): string => {
				const c = 4.685;
				return residuals.map((e) => {
					const u = Math.abs(e / c);
					const w = u <= 1.0 ? (1 - u * u) ** 2 : 0;
					return f4(w);
				}).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const e = rng.floatArray(N, -7, 7, 2);
				tcs.push(makeTc(i, `${N}\n${e.join(" ")}`, tukey(e)));
			}

			return tcs;
		},
	},

	// 83. Least Trimmed Squares Subset MSE
	{
		id: "lr-least-trimmed-squares-subset-mse",
		title: "Least Trimmed Squares (LTS) Trimmed MSE",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "lts", "least-trimmed-squares", "outliers"],
		description: "Compute OLS residuals on all points, sort squared residuals ascending, and return mean of smallest h = ceil(0.75 * N) errors.",
		story: `<p>High-breakdown regression at <b>AuditStat</b> evaluates model performance while ignoring the worst 25% outliers using <b>Least Trimmed Squares (LTS)</b>:
Fit standard OLS on all <code>N</code> points to get residuals <code>e_i = y_i - x_i^T * beta</code>. Sort squared residuals <code>e_i^2</code> in ascending order, and compute the mean of the smallest <code>h = ceil(0.75 * N)</code> squared residuals.</p>`,
		task: "Given N, D, matrix X, and target y, compute the 75% trimmed mean squared error.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the trimmed MSE with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 2"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2508);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n2\n3\n4\n2 4 6 100", "0.0000", true, "3 of 4 points fit line y=2x perfectly (trimmed MSE = 0.0000? Wait, OLS on all points is influenced by 100)."));

			const solveLts = (N: number, D: number, X: number[][], y: number[]): number => {
				const beta = solveOLS(X, y, 1e-7);
				const sqRes = X.map((xi, i) => (y[i] - dot(xi, beta)) ** 2);
				sqRes.sort((a, b) => a - b);
				const h = Math.ceil(0.75 * N);
				let sumH = 0;
				for (let k = 0; k < h; k++) sumH += sqRes[k];
				return sumH / h;
			};

			tcs[0] = makeTc(1, "4 1\n1\n2\n3\n4\n2 4 6 100", f4(solveLts(4, 1, [[1], [2], [3], [4]], [2, 4, 6, 100])), true, "LTS trimmed MSE.");

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const D = 1;
				const X = Array.from({ length: N }, () => [parseFloat(rng.nextFloat(0.5, 3.0).toFixed(1))]);
				X[0][0] += 1;
				const y = rng.floatArray(N, 1, 10, 1);

				const mse = solveLts(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(mse)));
			}

			return tcs;
		},
	},

	// 84. Quantile Subgradient Step Tau=0.90
	{
		id: "lr-quantile-subgradient-step-tau90",
		title: "Quantile Regression Subgradient (tau = 0.90)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "quantile-regression", "risk-modeling"],
		description: "Apply subgradient step for 90th percentile: grad = -1/N * sum (tau - I(y_i < x_i^T w)) * x_i with tau = 0.90, alpha = 0.05, steps = 15, w_0 = 0.",
		story: `<p>In electrical power grid peak-load reserving at <b>GridSafety</b>, models predict upper-tail capacity requirements (90th percentile, <code>tau = 0.90</code>):
<code>subgrad = -1/N * sum_{i=1}^N (tau - I(y_i < x_i^T * w)) * x_i</code>
<code>w_{t+1} = w_t - alpha * subgrad</code>.
Fixed hyperparameters:
<ul>
  <li><code>tau = 0.90, alpha = 0.05, steps = 15, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 15 subgradient steps for tau = 0.90 and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"tau = 0.90, alpha = 0.05, steps = 15"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2509);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.0125", true, "Subgradient updates for 90th percentile."));

			const solveQ90 = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const tau = 0.90;
				const alpha = 0.05;
				const steps = 15;
				let w = new Array(D).fill(0);

				for (let t = 0; t < steps; t++) {
					const subgrad = new Array(D).fill(0);
					for (let i = 0; i < N; i++) {
						const pred = dot(X[i], w);
						const ind = y[i] < pred ? 1 : 0;
						const factor = -(tau - ind);
						for (let d = 0; d < D; d++) subgrad[d] += factor * X[i][d];
					}
					for (let d = 0; d < D; d++) subgrad[d] /= N;
					w = w.map((wi, d) => wi - alpha * subgrad[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveQ90(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 85. Welsch M-Estimator Weights
	{
		id: "lr-welsch-m-estimator-weights",
		title: "Welsch M-Estimator Exponential Weights",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "welsch", "m-estimator", "weights"],
		description: "Compute Welsch robust weights w_i = exp(- (e_i / c)^2) with tuning constant c = 2.985.",
		story: `<p>In satellite attitude control telemetry at <b>OrbitalDynamics</b>, the <b>Welsch M-estimator</b> weights exponentially suppress extreme outliers:
<code>w_i = exp(- (e_i / c)^2)</code>.
Fixed hyperparameter:
<ul>
  <li><code>c = 2.985</code> (95% efficiency constant)</li>
</ul></p>`,
		task: "Given N and N residuals e, compute Welsch exponential weights.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> real numbers representing residuals <code>e</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"c = 2.985"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2510);
			const tcs = [];

			tcs.push(makeTc(1, "2\n0.0 2.985", "1.0000 0.3679", true, "e=0 -> w=1. e=c -> w = exp(-1) = 0.3679."));

			const welsch = (residuals: number[]): string => {
				const c = 2.985;
				return residuals.map((e) => f4(Math.exp(-Math.pow(e / c, 2)))).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const e = rng.floatArray(N, -5, 5, 2);
				tcs.push(makeTc(i, `${N}\n${e.join(" ")}`, welsch(e)));
			}

			return tcs;
		},
	},
];
