import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, dot, norm2, solveOLS } from "../utils";

export const regularizedRegressionProblems: LRProblemDefinition[] = [
	// 61. Lasso Soft-Thresholding Operator
	{
		id: "lr-lasso-soft-thresholding",
		title: "Lasso Soft-Thresholding Operator",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "lasso", "soft-thresholding", "proximal"],
		description: "Apply the proximal soft-thresholding operator S(z, gamma) = sign(z) * max(0, |z| - gamma) with fixed gamma = 0.5.",
		story: `<p>In sparse genomic feature selection at <b>GeneSparse</b>, the proximal operator for the L1 Lasso penalty is the <b>Soft-Thresholding Operator</b>:
<code>S(z, gamma) = sign(z) * max(0, |z| - gamma)</code>.
Values inside the threshold window <code>[-gamma, gamma]</code> are collapsed exactly to zero.
Fixed hyperparameter:
<ul>
  <li><code>gamma = 0.5</code></li>
</ul></p>`,
		task: "Given length N and array z, compute soft-thresholded values S(z, 0.5).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N</code> thresholded values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"gamma = 0.5"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2401);
			const tcs = [];

			tcs.push(makeTc(1, "4\n-1.2 -0.3 0.4 1.5", "-0.7000 0.0000 0.0000 1.0000", true, "Values between -0.5 and 0.5 zeroed out."));

			const softThresh = (z: number[], gamma: number): string => {
				return z.map((val) => {
					const sign = val >= 0 ? 1 : -1;
					const mag = Math.max(0, Math.abs(val) - gamma);
					return f4(sign * mag);
				}).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const z = rng.floatArray(N, -3, 3, 2);
				const out = softThresh(z, 0.5);
				tcs.push(makeTc(i, `${N}\n${z.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 62. Lasso Single Coordinate Update
	{
		id: "lr-lasso-single-coordinate-update",
		title: "Lasso Single Coordinate Descent Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "lasso", "coordinate-descent"],
		description: "Compute the closed-form coordinate update w_j = S(rho_j, lambda / 2) / z_j with fixed lambda = 1.0.",
		story: `<p>Inside the coordinate descent solver at <b>SparseOpt</b>, feature coordinate <code>w_j</code> is updated while holding all other features fixed:
<code>rho_j = x_j^T * r_{-j}</code>
<code>z_j = x_j^T * x_j</code>
<code>w_j <- S(rho_j, lambda / 2) / z_j</code>
where <code>r_{-j}</code> is the partial residual vector.
Fixed hyperparameter:
<ul>
  <li><code>lambda = 1.0</code></li>
</ul></p>`,
		task: "Given length N, feature vector x_j, and partial residual vector r, compute updated coordinate w_j.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> real numbers representing <code>x_j</code>.</p>
<p>The third line contains <code>N</code> real numbers representing <code>r_{-j}</code>.</p>`,
		outputFormat: `<p>Print the single updated coordinate <code>w_j</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"sum(x_j^2) > 0",
			"lambda = 1.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2402);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 2\n2 4", "0.9000", true, "rho = 10, z = 5. S(10, 0.5) = 9.5 -> w = 9.5/5 = 1.9? Wait: lambda/2 = 0.5, rho=10, 9.5/5 = 1.9000. Wait, check math: rho = 1*2 + 2*4 = 10. S(10, 0.5) = 9.5. z = 1+4 = 5. 9.5 / 5 = 1.9000."));

			const solveCoord = (N: number, x: number[], r: number[]): number => {
				const lambda = 1.0;
				let rho = 0, z = 0;
				for (let i = 0; i < N; i++) {
					rho += x[i] * r[i];
					z += x[i] * x[i];
				}
				if (z === 0) return 0;
				const threshold = lambda / 2;
				const sign = rho >= 0 ? 1 : -1;
				const mag = Math.max(0, Math.abs(rho) - threshold);
				return (sign * mag) / z;
			};

			// Overwrite sample 1 with exact math
			tcs[0] = makeTc(1, "2\n1 2\n2 4", "1.9000", true, "rho=10, z=5. S(10, 0.5)=9.5 / 5 = 1.9000.");

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const x = rng.floatArray(N, -3, 3, 2);
				x[0] += 1;
				const r = rng.floatArray(N, -5, 5, 2);

				const w = solveCoord(N, x, r);
				const inStr = `${N}\n${x.join(" ")}\n${r.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(w)));
			}

			return tcs;
		},
	},

	// 63. Lasso Coordinate Descent Full Cycles
	{
		id: "lr-lasso-coordinate-descent-cycles",
		title: "Lasso Full Cyclic Coordinate Descent",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "lasso", "coordinate-descent", "l1-regularization"],
		description: "Run 20 full cycles of coordinate descent on L(w) = 1/(2N) * ||Xw - y||^2 + lambda * ||w||_1 with lambda = 0.2, cycles = 20, w_0 = 0.",
		story: `<p>In biomarker discovery at <b>PharmaBio</b>, sparse weights are found using cyclical <b>Coordinate Descent</b> on the standardized objective:
<code>rho_j = 1/N * x_j^T * (y - sum_{k != j} w_k * x_k)</code>
<code>z_j = 1/N * x_j^T * x_j</code>
<code>w_j <- S(rho_j, lambda) / z_j</code>.
Fixed hyperparameters:
<ul>
  <li><code>lambda = 0.2, cycles = 20, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 20 cycles of coordinate descent and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"lambda = 0.2, cycles = 20"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2403);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.9200", true, "Lasso penalizes slope slightly."));

			const solveLassoCD = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const lambda = 0.2;
				const cycles = 20;
				let w = new Array(D).fill(0);

				const z = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					let s = 0;
					for (let i = 0; i < N; i++) s += X[i][d] * X[i][d];
					z[d] = s / N;
				}

				for (let c = 0; c < cycles; c++) {
					for (let j = 0; j < D; j++) {
						let rho = 0;
						for (let i = 0; i < N; i++) {
							let part = 0;
							for (let k = 0; k < D; k++) {
								if (k !== j) part += w[k] * X[i][k];
							}
							rho += X[i][j] * (y[i] - part);
						}
						rho /= N;

						const sign = rho >= 0 ? 1 : -1;
						const mag = Math.max(0, Math.abs(rho) - lambda);
						w[j] = z[j] === 0 ? 0 : (sign * mag) / z[j];
					}
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveLassoCD(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 64. ElasticNet Coordinate Descent
	{
		id: "lr-elasticnet-coordinate-descent",
		title: "ElasticNet Coordinate Descent",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "elastic-net", "coordinate-descent", "regularization"],
		description: "Apply ElasticNet coordinate update w_j <- S(rho_j, lambda_1) / (z_j + lambda_2) with lambda_1 = 0.1, lambda_2 = 0.2, cycles = 20, w_0 = 0.",
		story: `<p>In correlated micro-array gene expression at <b>BioGenome</b>, ElasticNet groups correlated features via joint L1/L2 penalties:
<code>w_j <- S(rho_j, lambda_1) / (z_j + lambda_2)</code>.
Fixed hyperparameters:
<ul>
  <li><code>lambda_1 = 0.1, lambda_2 = 0.2, cycles = 20, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 20 cycles of ElasticNet coordinate descent and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"lambda_1 = 0.1, lambda_2 = 0.2, cycles = 20"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2404);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.8148", true, "ElasticNet L1/L2 shrinkage."));

			const solveElasticNet = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const lambda1 = 0.1;
				const lambda2 = 0.2;
				const cycles = 20;
				let w = new Array(D).fill(0);

				const z = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					let s = 0;
					for (let i = 0; i < N; i++) s += X[i][d] * X[i][d];
					z[d] = s / N;
				}

				for (let c = 0; c < cycles; c++) {
					for (let j = 0; j < D; j++) {
						let rho = 0;
						for (let i = 0; i < N; i++) {
							let part = 0;
							for (let k = 0; k < D; k++) {
								if (k !== j) part += w[k] * X[i][k];
							}
							rho += X[i][j] * (y[i] - part);
						}
						rho /= N;

						const sign = rho >= 0 ? 1 : -1;
						const mag = Math.max(0, Math.abs(rho) - lambda1);
						w[j] = (z[j] + lambda2 === 0) ? 0 : (sign * mag) / (z[j] + lambda2);
					}
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveElasticNet(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 65. Non-Negative Least Squares Projected Gradient
	{
		id: "lr-nonnegative-least-squares-step",
		title: "Non-Negative Least Squares (NNLS) Projected Gradient",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "nnls", "projected-gradient", "non-negative"],
		description: "Apply projected gradient descent w_{t+1} = max(0, w_t - alpha * grad) with alpha = 0.05, steps = 30, w_0 = 0.",
		story: `<p>In chemical spectral deconvolution at <b>SpectroChem</b>, physical component concentrations cannot be negative (<code>w_j >= 0</code>). The system executes <b>Projected Gradient Descent</b> on MSE:
<code>w_{t+1} = max(0, w_t - alpha * grad)</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.05, steps = 30, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 steps of projected gradient descent and output non-negative weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.05, steps = 30"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2405);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n-2 -4", "0.0000", true, "Negative slope projection clamped to 0."));

			const solveNnls = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				const steps = 30;
				let w = new Array(D).fill(0);

				for (let t = 0; t < steps; t++) {
					const grad = new Array(D).fill(0);
					for (let i = 0; i < N; i++) {
						const pred = dot(X[i], w);
						const diff = pred - y[i];
						for (let d = 0; d < D; d++) grad[d] += diff * X[i][d];
					}
					for (let d = 0; d < D; d++) grad[d] /= N;
					w = w.map((wi, d) => Math.max(0, wi - alpha * grad[d]));
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveNnls(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 66. Ridge Shrinkage SVD Coordinates
	{
		id: "lr-ridge-shrinkage-svd-coordinates",
		title: "Ridge Shrinkage in SVD Coordinates",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "svd", "shrinkage"],
		description: "Compute OLS coordinate alpha_ols = u^T y / sigma and Ridge coordinate alpha_ridge = (sigma^2 / (sigma^2 + lambda)) * alpha_ols with lambda = 2.0.",
		story: `<p>In principal component spectral analysis at <b>AstroCompute</b>, Ridge regression applies a shrinkage factor <code>sigma^2 / (sigma^2 + lambda)</code> to each singular coordinate:
<code>alpha_ols = (u^T * y) / sigma</code>
<code>alpha_ridge = (sigma^2 / (sigma^2 + lambda)) * alpha_ols</code>.
Fixed hyperparameter:
<ul>
  <li><code>lambda = 2.0</code></li>
</ul></p>`,
		task: "Given singular value sigma and projection u^T y, compute alpha_ols and alpha_ridge.",
		inputFormat: `<p>The first line contains real number <code>sigma</code>.</p>
<p>The second line contains real number <code>u^T y</code>.</p>`,
		outputFormat: `<p>Print <code>alpha_ols alpha_ridge</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"sigma > 0",
			"lambda = 2.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2406);
			const tcs = [];

			tcs.push(makeTc(1, "2.0\n6.0", "3.0000 2.0000", true, "sigma=2, sigma^2=4. Shrinkage 4/(4+2) = 2/3. 3 * 2/3 = 2.0."));

			for (let i = 2; i <= 100; i++) {
				const sigma = parseFloat(rng.nextFloat(0.5, 5.0).toFixed(2));
				const uTy = parseFloat(rng.nextFloat(-10, 10).toFixed(2));
				const alphaOls = uTy / sigma;
				const alphaRidge = ((sigma * sigma) / (sigma * sigma + 2.0)) * alphaOls;

				tcs.push(makeTc(i, `${sigma}\n${uTy}`, `${f4(alphaOls)} ${f4(alphaRidge)}`));
			}

			return tcs;
		},
	},

	// 67. Ridge Effective Degrees of Freedom
	{
		id: "lr-ridge-effective-degrees-of-freedom",
		title: "Ridge Effective Degrees of Freedom",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "degrees-of-freedom", "trace"],
		description: "Compute effective degrees of freedom df(lambda) = sum_{j=1}^D sigma_j^2 / (sigma_j^2 + lambda) with lambda = 1.0.",
		story: `<p>Model selection criteria (AIC/BIC) for regularized regression at <b>StatMetrics</b> compute the model's <b>Effective Degrees of Freedom</b>:
<code>df(lambda) = sum_{j=1}^D sigma_j^2 / (sigma_j^2 + lambda)</code>
where <code>sigma_j</code> are singular values of design matrix <code>X</code>.
Fixed hyperparameter:
<ul>
  <li><code>lambda = 1.0</code></li>
</ul></p>`,
		task: "Given feature count D and D singular values sigma, compute df(lambda = 1.0).",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> positive real numbers representing <code>sigma_1 ... sigma_D</code>.</p>`,
		outputFormat: `<p>Print <code>df</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 20",
			"sigma_j > 0, lambda = 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2407);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1.0 1.0", "1.0000", true, "1/(1+1) + 1/(1+1) = 0.5 + 0.5 = 1.0."));
			tcs.push(makeTc(2, "1\n2.0", "0.8000", true, "4 / (4+1) = 0.8."));

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 6);
				const sigmas = rng.floatArray(D, 0.5, 4.0, 2);
				const df = sigmas.reduce((s, sig) => s + (sig * sig) / (sig * sig + 1.0), 0);
				tcs.push(makeTc(i, `${D}\n${sigmas.join(" ")}`, f4(df)));
			}

			return tcs;
		},
	},

	// 68. Lasso Sparsity Counter
	{
		id: "lr-lasso-sparsity-counter",
		title: "Lasso Feature Sparsity Counter",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "lasso", "sparsity", "feature-selection"],
		description: "Run Lasso coordinate descent with lambda = 0.5, cycles = 30, w_0 = 0 and count zero (|w_j| < 1e-5) vs active features.",
		story: `<p>Biomedical screening at <b>OncoMarker</b> counts how many candidate genes were completely eliminated by L1 Lasso penalty (<code>|w_j| < 1e-5</code>).
Fixed hyperparameters:
<ul>
  <li><code>lambda = 0.5, cycles = 30, w_0 = 0, zero_tolerance = 1e-5</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 cycles of Lasso and output the number of zero features and active features.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>zero_count active_count</code> space-separated.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 4",
			"lambda = 0.5, cycles = 30"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2408);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n0.1 0.1", "2 0", true, "Small signals completely zeroed out by lambda=0.5."));

			const countSparsity = (N: number, D: number, X: number[][], y: number[]): [number, number] => {
				const lambda = 0.5;
				const cycles = 30;
				let w = new Array(D).fill(0);

				const z = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					let s = 0;
					for (let i = 0; i < N; i++) s += X[i][d] * X[i][d];
					z[d] = s / N;
				}

				for (let c = 0; c < cycles; c++) {
					for (let j = 0; j < D; j++) {
						let rho = 0;
						for (let i = 0; i < N; i++) {
							let part = 0;
							for (let k = 0; k < D; k++) {
								if (k !== j) part += w[k] * X[i][k];
							}
							rho += X[i][j] * (y[i] - part);
						}
						rho /= N;

						const sign = rho >= 0 ? 1 : -1;
						const mag = Math.max(0, Math.abs(rho) - lambda);
						w[j] = z[j] === 0 ? 0 : (sign * mag) / z[j];
					}
				}

				let zeroCount = 0;
				for (let d = 0; d < D; d++) {
					if (Math.abs(w[d]) < 1e-5) zeroCount++;
				}
				return [zeroCount, D - zeroCount];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const D = rng.nextInt(2, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const [zC, aC] = countSparsity(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${zC} ${aC}`));
			}

			return tcs;
		},
	},

	// 69. Adaptive Lasso Weights
	{
		id: "lr-adaptive-lasso-weights",
		title: "Adaptive Lasso Penalty Weights",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "adaptive-lasso", "oracle-property"],
		description: "Compute Adaptive Lasso penalty weights w_j = 1 / (|beta_j^{ols}| + 1e-5) using standard OLS beta.",
		story: `<p>To achieve oracle property consistency at <b>CausalAnalytics</b>, <b>Adaptive Lasso</b> assigns individual feature penalty weights inversely proportional to initial OLS estimates:
<code>p_j = 1 / (|beta_j^{ols}| + 1e-5)</code>.</p>`,
		task: "Given N, D, matrix X, and target y, compute OLS beta and output the adaptive penalty weights p_1 ... p_D.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> adaptive weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2409);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n2 5", "0.5000 0.2000", true, "beta=[2, 5]. Weights: 1/2=0.5, 1/5=0.2."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -5, 5, 2);

				const beta = solveOLS(X, y, 1e-7);
				const pWeights = beta.map((b) => 1 / (Math.abs(b) + 1e-5));

				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, pWeights.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 70. Fused Lasso Total Variation Penalty
	{
		id: "lr-fused-lasso-total-variation-penalty",
		title: "Fused Lasso Total Variation Penalty",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "fused-lasso", "total-variation", "signal-smoothing"],
		description: "Compute Fused Lasso penalty P(w) = lambda_1 * sum |w_j| + lambda_2 * sum |w_{j+1} - w_j| with lambda_1 = 0.5, lambda_2 = 1.0.",
		story: `<p>In chromosome copy-number variation analysis at <b>ArrayGenetics</b>, adjacent genomic locations exhibit piecewise-constant levels:
<code>P(w) = lambda_1 * sum_{j=1}^D |w_j| + lambda_2 * sum_{j=1}^{D-1} |w_{j+1} - w_j|</code>.
Fixed hyperparameters:
<ul>
  <li><code>lambda_1 = 0.5, lambda_2 = 1.0</code></li>
</ul></p>`,
		task: "Given D and weight vector w, compute the combined Fused Lasso penalty value.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing <code>w</code>.</p>`,
		outputFormat: `<p>Print the penalty value with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= D <= 50",
			"lambda_1 = 0.5, lambda_2 = 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2410);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 1 2", "3.0000", true, "L1=0.5*(1+1+2)=2.0. TV=1.0*(0 + 1)=1.0. Total=3.0."));

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(3, 8);
				const w = rng.floatArray(D, -3, 3, 2);

				const l1Sum = w.reduce((s, v) => s + Math.abs(v), 0);
				let tvSum = 0;
				for (let j = 0; j < D - 1; j++) tvSum += Math.abs(w[j + 1] - w[j]);
				const penalty = 0.5 * l1Sum + 1.0 * tvSum;

				tcs.push(makeTc(i, `${D}\n${w.join(" ")}`, f4(penalty)));
			}

			return tcs;
		},
	},

	// 71. ElasticNet Mixing Parameter
	{
		id: "lr-elasticnet-mixing-parameter",
		title: "ElasticNet L1-Ratio Mixing Parameterization",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "elastic-net", "l1-ratio"],
		description: "Convert alpha_net = 1.0 and l1_ratio = 0.7 into lambda_1 = 0.7, lambda_2 = 0.3 and run 15 cycles of coordinate descent.",
		story: `<p>Scikit-Learn parameterizes ElasticNet using overall strength <code>alpha_net</code> and mixing ratio <code>l1_ratio in [0, 1]</code>:
<code>lambda_1 = alpha_net * l1_ratio</code>
<code>lambda_2 = alpha_net * (1 - l1_ratio)</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha_net = 1.0, l1_ratio = 0.7 -> lambda_1 = 0.7, lambda_2 = 0.3, cycles = 15, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 15 cycles of ElasticNet coordinate descent and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"lambda_1 = 0.7, lambda_2 = 0.3, cycles = 15"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2411);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.5357", true, "l1=0.7, l2=0.3."));

			const solveENetMix = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const lambda1 = 0.7;
				const lambda2 = 0.3;
				const cycles = 15;
				let w = new Array(D).fill(0);

				const z = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					let s = 0;
					for (let i = 0; i < N; i++) s += X[i][d] * X[i][d];
					z[d] = s / N;
				}

				for (let c = 0; c < cycles; c++) {
					for (let j = 0; j < D; j++) {
						let rho = 0;
						for (let i = 0; i < N; i++) {
							let part = 0;
							for (let k = 0; k < D; k++) {
								if (k !== j) part += w[k] * X[i][k];
							}
							rho += X[i][j] * (y[i] - part);
						}
						rho /= N;

						const sign = rho >= 0 ? 1 : -1;
						const mag = Math.max(0, Math.abs(rho) - lambda1);
						w[j] = (z[j] + lambda2 === 0) ? 0 : (sign * mag) / (z[j] + lambda2);
					}
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveENetMix(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 72. Group Lasso Block Norm
	{
		id: "lr-group-lasso-block-norm",
		title: "Group Lasso Block Penalty",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "group-lasso", "block-penalty"],
		description: "Compute the Group Lasso penalty P(w) = sum_{g=1}^G ||w_g||_2 across G feature groups.",
		story: `<p>In multi-task gene regulation at <b>CellDynamics</b>, biological pathways are organized into <code>G</code> known functional groups:
<code>P(w) = sum_{g=1}^G ||w_g||_2 = sum_{g=1}^G sqrt(sum_{j in group_g} w_j^2)</code>.</p>`,
		task: "Given group count G and for each group its feature weights, compute the overall Group Lasso penalty.",
		inputFormat: `<p>The first line contains integer <code>G</code>.</p>
<p>The next <code>G</code> lines each contain integer <code>K_g</code> followed by <code>K_g</code> real numbers representing <code>w_g</code>.</p>`,
		outputFormat: `<p>Print the total penalty with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= G <= 10",
			"1 <= K_g <= 10"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2412);
			const tcs = [];

			tcs.push(makeTc(1, "2\n2 3 4\n1 2", "7.0000", true, "Group 1 norm = sqrt(9+16)=5. Group 2 norm = 2. Total = 7.0."));

			for (let i = 2; i <= 100; i++) {
				const G = rng.nextInt(2, 4);
				let total = 0;
				const lines: string[] = [];

				for (let g = 0; g < G; g++) {
					const Kg = rng.nextInt(1, 3);
					const wg = rng.floatArray(Kg, -4, 4, 1);
					const n = Math.sqrt(wg.reduce((s, v) => s + v * v, 0));
					total += n;
					lines.push(`${Kg} ${wg.join(" ")}`);
				}

				tcs.push(makeTc(i, `${G}\n${lines.join("\n")}`, f4(total)));
			}

			return tcs;
		},
	},

	// 73. Ridge Regularization Path Evaluation
	{
		id: "lr-ridge-regularization-path",
		title: "Ridge Regularization Path Multi-Lambda",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "regularization-path"],
		description: "Compute Ridge weights across 3 fixed values of lambda in {0.1, 1.0, 10.0}.",
		story: `<p>Hyperparameter diagnostic dashboards at <b>DataTuner</b> trace how increasing the L2 penalty dampens weights toward zero across fixed grid <code>lambda in {0.1, 1.0, 10.0}</code>.</p>`,
		task: "Given N, D, matrix X, and target y, compute Ridge coefficients for lambda = 0.1, 1.0, and 10.0.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print 3 lines, each containing the <code>D</code> coefficients for lambda = 0.1, 1.0, and 10.0 respectively (4 decimals).</p>`,
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
			const rng = new DeterministicRNG(2413);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.9608\n1.6667\n0.6667", true, "Shrinkage progresses with lambda."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = 1;
				const X = Array.from({ length: N }, () => [parseFloat(rng.nextFloat(0.5, 3.0).toFixed(1))]);
				X[0][0] += 1;
				const y = rng.floatArray(N, 1, 10, 1);

				const b1 = solveOLS(X, y, 0.1);
				const b2 = solveOLS(X, y, 1.0);
				const b3 = solveOLS(X, y, 10.0);

				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${b1.map(f4).join(" ")}\n${b2.map(f4).join(" ")}\n${b3.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 74. LARS First Equiangular Step
	{
		id: "lr-lars-first-direction-step",
		title: "Least Angle Regression (LARS) Initial Active Feature",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "lars", "correlation", "greedy"],
		description: "Find the feature x_j with maximum absolute correlation with target y: c_j = |x_j^T y| / ||x_j||_2.",
		story: `<p>In forward stagewise regression at <b>AlgorithmicTrade</b>, <b>LARS (Least Angle Regression)</b> identifies the predictor that has the smallest angle (highest absolute cosine correlation) with response <code>y</code>:
<code>c_j = |x_j^T * y| / (||x_j||_2 * ||y||_2)</code>.</p>`,
		task: "Given N, D, matrix X, and target y, find the 1-based index of the most correlated feature and its correlation magnitude.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the 1-based feature index and correlation with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50",
			"2 <= D <= 10"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2414);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n4 0", "1 1.0000", true, "Feature 1 is perfectly collinear with y."));

			const findLars1 = (N: number, D: number, X: number[][], y: number[]): [number, number] => {
				const yNorm = norm2(y) || 1;
				let bestIdx = 1;
				let maxCorr = -1;

				for (let d = 0; d < D; d++) {
					const col = X.map((r) => r[d]);
					const colNorm = norm2(col) || 1;
					const corr = Math.abs(dot(col, y)) / (colNorm * yNorm);
					if (corr > maxCorr) {
						maxCorr = corr;
						bestIdx = d + 1;
					}
				}
				return [bestIdx, maxCorr];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(2, 4);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -3, 3, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -5, 5, 2);

				const [bestIdx, maxCorr] = findLars1(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${bestIdx} ${f4(maxCorr)}`));
			}

			return tcs;
		},
	},

	// 75. SCAD Thresholding Operator
	{
		id: "lr-scad-thresholding-operator",
		title: "SCAD Non-Convex Thresholding Operator",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "scad", "non-convex", "sparsity"],
		description: "Apply Fan & Li SCAD thresholding operator with fixed lambda = 1.0 and a = 3.7.",
		story: `<p>To avoid the estimation bias of Lasso for large coefficients, <b>SCAD (Smoothly Clipped Absolute Deviation)</b> transitions from soft-thresholding to unbiased estimation:
<ul>
  <li>If <code>|z| <= 2 * lambda</code>: <code>S_{scad}(z) = sign(z) * max(0, |z| - lambda)</code></li>
  <li>If <code>2 * lambda < |z| <= a * lambda</code>: <code>S_{scad}(z) = sign(z) * ((a - 1) * |z| - a * lambda) / (a - 2)</code></li>
  <li>If <code>|z| > a * lambda</code>: <code>S_{scad}(z) = z</code></li>
</ul>
Fixed hyperparameters:
<ul>
  <li><code>lambda = 1.0, a = 3.7</code></li>
</ul></p>`,
		task: "Given length N and array z, compute SCAD thresholded values.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N</code> thresholded values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"lambda = 1.0, a = 3.7"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2415);
			const tcs = [];

			tcs.push(makeTc(1, "4\n0.5 1.5 3.0 5.0", "0.0000 0.5000 2.5882 5.0000", true, "SCAD partitions into 3 regimes."));

			const scadOp = (z: number[]): string => {
				const lambda = 1.0;
				const a = 3.7;
				return z.map((val) => {
					const sign = val >= 0 ? 1 : -1;
					const absZ = Math.abs(val);
					let res = 0;
					if (absZ <= 2 * lambda) {
						res = sign * Math.max(0, absZ - lambda);
					} else if (absZ <= a * lambda) {
						res = sign * (((a - 1) * absZ - a * lambda) / (a - 2));
					} else {
						res = val;
					}
					return f4(res);
				}).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const z = rng.floatArray(N, -6, 6, 2);
				tcs.push(makeTc(i, `${N}\n${z.join(" ")}`, scadOp(z)));
			}

			return tcs;
		},
	},
];
