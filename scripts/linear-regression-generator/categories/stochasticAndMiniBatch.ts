import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, dot, norm2 } from "../utils";

export const stochasticAndMiniBatchProblems: LRProblemDefinition[] = [
	// 46. Pure Online SGD Single Sample Update
	{
		id: "lr-sgd-single-sample-update",
		title: "Online SGD Single Sample Update",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "sgd", "online-learning", "streaming"],
		description: "Compute single-sample SGD update w_{new} = w + alpha * (y - x^T w) * x with fixed alpha = 0.05.",
		story: `<p>A streaming network packet classifier at <b>PacketFlow AI</b> updates bandwidth prediction weights <code>w in R^D</code> online upon packet arrival:
<code>e = y - x^T * w</code>
<code>w_{new} = w + alpha * e * x</code>.
Fixed hyperparameter:
<ul>
  <li><code>alpha = 0.05</code></li>
</ul></p>`,
		task: "Given D, current weights w, observation vector x, and target y, compute the updated weight vector w_{new}.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing current <code>w</code>.</p>
<p>The third line contains <code>D</code> real numbers representing <code>x</code>.</p>
<p>The fourth line contains real number <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> updated weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"alpha = 0.05"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2301);
			const tcs = [];

			tcs.push(makeTc(1, "2\n0 0\n1 2\n10", "0.5000 1.0000", true, "Error is 10. w = [0.05*10*1, 0.05*10*2] = [0.5, 1.0]."));

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const w = rng.floatArray(D, -2, 2, 2);
				const x = rng.floatArray(D, -3, 3, 2);
				const y = parseFloat(rng.nextFloat(-10, 10).toFixed(2));

				const pred = dot(x, w);
				const err = y - pred;
				const wNew = w.map((wi, d) => wi + 0.05 * err * x[d]);

				const inStr = `${D}\n${w.join(" ")}\n${x.join(" ")}\n${y}`;
				tcs.push(makeTc(i, inStr, wNew.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 47. SGD Sequential Single Epoch
	{
		id: "lr-sgd-sequential-single-epoch",
		title: "Sequential Single-Epoch Online SGD",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "sgd", "epoch", "online-learning"],
		description: "Pass sequentially through N samples updating w <- w + alpha * (y_i - x_i^T w) * x_i with alpha = 0.02, w_0 = 0.",
		story: `<p>Low-latency telemetry processing at <b>TelemetryStream</b> trains linear weights incrementally in a single sequential pass over <code>N</code> samples:
For <code>i = 1, ..., N</code>:
<code>w <- w + alpha * (y_i - x_i^T * w) * x_i</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 1 sequential epoch of SGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"alpha = 0.02, w_0 = 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2302);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.1968", true, "Step 1: w=0.04. Step 2: e=4-0.08=3.92, w=0.04+0.02*3.92*2=0.1968."));

			const solveSgdEpoch = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.02;
				let w = new Array(D).fill(0);
				for (let i = 0; i < N; i++) {
					const pred = dot(X[i], w);
					const err = y[i] - pred;
					w = w.map((wi, d) => wi + alpha * err * X[i][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 15);
				const D = rng.nextInt(1, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -5, 5, 2);

				const w = solveSgdEpoch(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 48. SGD Decaying Step Size
	{
		id: "lr-sgd-decaying-step-size",
		title: "SGD with Inverse-Time Learning Rate Decay",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "sgd", "learning-rate-decay", "robbins-monro"],
		description: "Apply Robbins-Monro style step decay alpha_t = alpha_0 / (1 + lambda * t) with alpha_0 = 0.1, lambda = 0.01, w_0 = 0.",
		story: `<p>Robbins-Monro stochastic approximation conditions require learning rates to satisfy <code>sum alpha_t = inf</code> and <code>sum alpha_t^2 < inf</code>. At <b>QuantumScale</b>, streaming SGD applies inverse-time decay:
<code>alpha_t = alpha_0 / (1 + lambda * t)</code> for step <code>t = 0, ..., N-1</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha_0 = 0.1, lambda = 0.01, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run sequential SGD with inverse-time decay and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"alpha_0 = 0.1, lambda = 0.01"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2303);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.9129", true, "Inverse-time decay over 2 steps reaches 0.9129."));

			const solveDecaySgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha0 = 0.1;
				const lambda = 0.01;
				let w = new Array(D).fill(0);

				for (let t = 0; t < N; t++) {
					const alphaT = alpha0 / (1 + lambda * t);
					const pred = dot(X[t], w);
					const err = y[t] - pred;
					w = w.map((wi, d) => wi + alphaT * err * X[t][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 15);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -5, 5, 2);

				const w = solveDecaySgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 49. Mini-Batch GD Fixed Batch Size
	{
		id: "lr-minibatch-gd-fixed-batch-size",
		title: "Mini-Batch Gradient Descent (Batch Size B=2)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "mini-batch", "gradient-descent"],
		description: "Perform 1 epoch of Mini-Batch GD with non-overlapping batches of size B=2 (alpha = 0.05, w_0 = 0).",
		story: `<p>Parallel GPU tensor cores at <b>TensorLab</b> process vector streams in micro-batches of size <code>B = 2</code>. For each batch <code>k</code> consisting of samples <code>[2k, 2k+1]</code>:
<code>grad = 1/B * sum_{i in batch} (x_i^T * w - y_i) * x_i</code>
<code>w <- w - alpha * grad</code>.
Fixed hyperparameters:
<ul>
  <li><code>B = 2, alpha = 0.05, w_0 = 0</code></li>
</ul></p>`,
		task: "Given even N, D, matrix X, and target y, run 1 epoch of mini-batch GD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> (even) and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50 (N is even)",
			"1 <= D <= 3",
			"B = 2, alpha = 0.05"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2304);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n2\n1\n2\n2 4 2 4", "0.4688", true, "2 batches of size 2 reaches 0.4688."));

			const solveMiniBatch = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const B = 2;
				const alpha = 0.05;
				let w = new Array(D).fill(0);

				for (let start = 0; start < N; start += B) {
					const grad = new Array(D).fill(0);
					for (let i = start; i < start + B; i++) {
						const pred = dot(X[i], w);
						const diff = pred - y[i];
						for (let d = 0; d < D; d++) grad[d] += diff * X[i][d];
					}
					for (let d = 0; d < D; d++) grad[d] /= B;
					w = w.map((wi, d) => wi - alpha * grad[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const numBatches = rng.nextInt(2, 6);
				const N = numBatches * 2;
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveMiniBatch(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 50. Averaged SGD Polyak-Ruppert
	{
		id: "lr-averaged-sgd-polyak-ruppert",
		title: "Polyak-Ruppert Averaged SGD (ASGD)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "asgd", "averaging", "stochastic-approximation"],
		description: "Compute the running average of weights w_bar = 1/N * sum_{t=1}^N w_t across online SGD updates (alpha = 0.05, w_0 = 0).",
		story: `<p>Statistical estimators at <b>Aura Analytics</b> improve generalization variance using <b>Polyak-Ruppert Averaged SGD (ASGD)</b>:
At each sample <code>t = 1, ..., N</code>:
<code>w_t = w_{t-1} + alpha * (y_t - x_t^T * w_{t-1}) * x_t</code>
The final output is the running average <code>w_bar = 1/N * sum_{t=1}^N w_t</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.05, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, compute the final averaged weight vector w_bar.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> averaged weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"alpha = 0.05"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2305);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.2900", true, "w_1=0.1, w_2=0.48. Average = 0.2900."));

			const solveAsgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				let w = new Array(D).fill(0);
				const sumW = new Array(D).fill(0);

				for (let t = 0; t < N; t++) {
					const pred = dot(X[t], w);
					const err = y[t] - pred;
					w = w.map((wi, d) => wi + alpha * err * X[t][d]);
					for (let d = 0; d < D; d++) sumW[d] += w[d];
				}
				return sumW.map((sw) => sw / N);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const wBar = solveAsgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, wBar.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 51. SGD Online Ridge Weight Decay
	{
		id: "lr-sgd-online-ridge-weight-decay",
		title: "Online SGD with L2 Weight Decay",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "weight-decay", "online-ridge", "sgd"],
		description: "Apply weight decay: w <- (1 - alpha * lambda) * w + alpha * (y_i - x_i^T w) * x_i with alpha = 0.02, lambda = 0.1, w_0 = 0.",
		story: `<p>Online spam score regressors at <b>CyberFilter</b> guard against unbounded coefficient creep by shrinking weights toward zero at every streaming sample:
<code>w <- (1 - alpha * lambda) * w + alpha * (y_i - x_i^T * w) * x_i</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, lambda = 0.1, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 1 epoch of online Ridge SGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"alpha = 0.02, lambda = 0.1"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2306);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.1967", true, "Shrinkage factor (1 - 0.002) = 0.998, reaching 0.1967."));

			const solveOnlineRidge = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.02;
				const lambda = 0.1;
				let w = new Array(D).fill(0);

				for (let i = 0; i < N; i++) {
					const pred = dot(X[i], w);
					const err = y[i] - pred;
					w = w.map((wi, d) => (1 - alpha * lambda) * wi + alpha * err * X[i][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveOnlineRidge(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 52. Passive-Aggressive Regression
	{
		id: "lr-passive-aggressive-regression",
		title: "Passive-Aggressive Regression (PA-I)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "passive-aggressive", "online-learning"],
		description: "Apply PA-I algorithm: loss = max(0, |y - w^T x| - eps), tau = min(C, loss / (||x||^2 + 1e-8)), w <- w + sign(y - w^T x) * tau * x (eps = 0.1, C = 1.0, w_0 = 0).",
		story: `<p>In real-time trading engines at <b>LatencyPro</b>, <b>Passive-Aggressive (PA-I)</b> regression updates weights only when the absolute prediction error exceeds margin <code>eps = 0.1</code>:
<code>loss = max(0, |y_i - x_i^T * w| - eps)</code>
<code>tau = min(C, loss / (||x_i||^2 + 1e-8))</code>
<code>w <- w + sign(y_i - x_i^T * w) * tau * x_i</code>.
Fixed hyperparameters:
<ul>
  <li><code>eps = 0.1, C = 1.0, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 1 pass of PA-I regression and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"eps = 0.1, C = 1.0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2307);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "1.9500", true, "Step 1: err=2, loss=1.9, tau=min(1, 1.9)=1 -> w=1. Step 2: err=2, loss=1.9, tau=1.9/4=0.475 -> w=1+0.475*2=1.95."));

			const solvePa1 = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const eps = 0.1;
				const C = 1.0;
				let w = new Array(D).fill(0);

				for (let i = 0; i < N; i++) {
					const pred = dot(X[i], w);
					const err = y[i] - pred;
					const absErr = Math.abs(err);
					const loss = Math.max(0, absErr - eps);
					if (loss > 0) {
						const normSq = dot(X[i], X[i]) + 1e-8;
						const tau = Math.min(C, loss / normSq);
						const s = err >= 0 ? 1 : -1;
						w = w.map((wi, d) => wi + s * tau * X[i][d]);
					}
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solvePa1(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 53. Mini-Batch Momentum
	{
		id: "lr-minibatch-momentum",
		title: "Mini-Batch SGD with Momentum",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "mini-batch", "momentum"],
		description: "Apply momentum on batches of size B=2: v <- beta * v + alpha * grad_B, w <- w - v (B = 2, alpha = 0.02, beta = 0.9, w_0 = 0, v_0 = 0).",
		story: `<p>Parallel compute clusters at <b>HyperCluster AI</b> accelerate mini-batch learning using momentum:
For each batch of size <code>B = 2</code>:
<code>v <- beta * v + alpha * grad_B</code>
<code>w <- w - v</code>.
Fixed hyperparameters:
<ul>
  <li><code>B = 2, alpha = 0.02, beta = 0.9, w_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given even N, D, matrix X, and target y, run 1 epoch of mini-batch momentum SGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> (even) and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50 (N is even)",
			"1 <= D <= 3",
			"B = 2, alpha = 0.02, beta = 0.9"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2308);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n2\n1\n2\n2 4 2 4", "0.2850", true, "Mini-batch momentum over 2 batches reaches 0.2850."));

			const solveMiniMomentum = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const B = 2;
				const alpha = 0.02;
				const beta = 0.9;
				let w = new Array(D).fill(0);
				let v = new Array(D).fill(0);

				for (let start = 0; start < N; start += B) {
					const grad = new Array(D).fill(0);
					for (let i = start; i < start + B; i++) {
						const pred = dot(X[i], w);
						const diff = pred - y[i];
						for (let d = 0; d < D; d++) grad[d] += diff * X[i][d];
					}
					for (let d = 0; d < D; d++) grad[d] /= B;
					v = v.map((vi, d) => beta * vi + alpha * grad[d]);
					w = w.map((wi, d) => wi - v[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const numBatches = rng.nextInt(2, 5);
				const N = numBatches * 2;
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveMiniMomentum(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 54. Mini-Batch RMSprop
	{
		id: "lr-minibatch-rmsprop",
		title: "Mini-Batch SGD with RMSprop",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "mini-batch", "rmsprop"],
		description: "Apply RMSprop over batches of size B=2: v <- beta * v + (1 - beta) * grad_B^2, w <- w - alpha / sqrt(v + 1e-8) * grad_B (B = 2, alpha = 0.05, beta = 0.9, w_0 = 0, v_0 = 0).",
		story: `<p>At <b>SensorFlow Analytics</b>, mini-batch RMSprop normalizes gradient updates per coordinate:
For each batch of size <code>B = 2</code>:
<code>v <- beta * v + (1 - beta) * grad_B^2</code>
<code>w <- w - alpha / sqrt(v + 1e-8) * grad_B</code>.
Fixed hyperparameters:
<ul>
  <li><code>B = 2, alpha = 0.05, beta = 0.9, w_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given even N, D, matrix X, and target y, run 1 epoch of mini-batch RMSprop and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> (even) and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50 (N is even)",
			"1 <= D <= 3",
			"B = 2, alpha = 0.05, beta = 0.9"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2309);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n2\n1\n2\n2 4 2 4", "0.2682", true, "Mini-batch RMSprop progression reaches 0.2682."));

			const solveMiniRMSprop = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const B = 2;
				const alpha = 0.05;
				const beta = 0.9;
				let w = new Array(D).fill(0);
				let v = new Array(D).fill(0);

				for (let start = 0; start < N; start += B) {
					const grad = new Array(D).fill(0);
					for (let i = start; i < start + B; i++) {
						const pred = dot(X[i], w);
						const diff = pred - y[i];
						for (let d = 0; d < D; d++) grad[d] += diff * X[i][d];
					}
					for (let d = 0; d < D; d++) grad[d] /= B;
					v = v.map((vi, d) => beta * vi + (1 - beta) * grad[d] * grad[d]);
					w = w.map((wi, d) => wi - (alpha / Math.sqrt(v[d] + 1e-8)) * grad[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const numBatches = rng.nextInt(2, 5);
				const N = numBatches * 2;
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveMiniRMSprop(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 55. SGD Huber Loss Gradient
	{
		id: "lr-sgd-huber-loss-gradient",
		title: "Online SGD with Huber Robust Loss",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "huber-loss", "robustness", "sgd"],
		description: "Apply Huber gradient: if |e_i| <= delta: g = -e_i * x_i; else g = -delta * sign(e_i) * x_i with delta = 1.0, alpha = 0.02, w_0 = 0.",
		story: `<p>Financial fraud detectors at <b>SafePay Core</b> mitigate high-magnitude outlier transactions using <b>Huber Loss SGD</b>:
For error <code>e_i = y_i - x_i^T * w</code>:
<ul>
  <li>If <code>|e_i| <= delta</code>: <code>g = -e_i * x_i</code></li>
  <li>If <code>|e_i| > delta</code>: <code>g = -delta * sign(e_i) * x_i</code></li>
</ul>
<code>w <- w - alpha * g</code>.
Fixed hyperparameters:
<ul>
  <li><code>delta = 1.0, alpha = 0.02, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 1 sequential epoch of Huber SGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"delta = 1.0, alpha = 0.02"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2310);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n10 20", "0.0600", true, "Both errors > 1.0; capped at delta=1.0."));

			const solveHuberSgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const delta = 1.0;
				const alpha = 0.02;
				let w = new Array(D).fill(0);

				for (let i = 0; i < N; i++) {
					const pred = dot(X[i], w);
					const err = y[i] - pred;
					const absErr = Math.abs(err);
					const factor = absErr <= delta ? err : delta * (err >= 0 ? 1 : -1);
					w = w.map((wi, d) => wi + alpha * factor * X[i][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -10, 10, 1);

				const w = solveHuberSgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 56. SGD Gradient Accumulation
	{
		id: "lr-sgd-gradient-accumulation",
		title: "SGD with Micro-Batch Gradient Accumulation",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-accumulation", "micro-batch"],
		description: "Accumulate gradients across chunks of K=2 micro-samples before applying weight update w <- w - alpha * g_acc (alpha = 0.05, K = 2, w_0 = 0).",
		story: `<p>Memory-constrained accelerators at <b>MicroEdge</b> emulate larger batch sizes via <b>Gradient Accumulation</b> across <code>K = 2</code> micro-steps:
<code>g_acc = 1/K * sum_{k=1}^K (x_k^T * w - y_k) * x_k</code>
<code>w <- w - alpha * g_acc</code>.
Fixed hyperparameters:
<ul>
  <li><code>K = 2, alpha = 0.05, w_0 = 0</code></li>
</ul></p>`,
		task: "Given even N, D, matrix X, and target y, run 1 pass of accumulated SGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> (even) and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50 (even N)",
			"1 <= D <= 3",
			"K = 2, alpha = 0.05"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2311);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n2\n1\n2\n2 4 2 4", "0.4688", true, "Accumulates 2 samples before updating, reaching 0.4688."));

			const solveAccum = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const K = 2;
				const alpha = 0.05;
				let w = new Array(D).fill(0);

				for (let start = 0; start < N; start += K) {
					const gAcc = new Array(D).fill(0);
					for (let i = start; i < start + K; i++) {
						const pred = dot(X[i], w);
						const diff = pred - y[i];
						for (let d = 0; d < D; d++) gAcc[d] += diff * X[i][d];
					}
					for (let d = 0; d < D; d++) gAcc[d] /= K;
					w = w.map((wi, d) => wi - alpha * gAcc[d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const numChunks = rng.nextInt(2, 5);
				const N = numChunks * 2;
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveAccum(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 57. Barzilai-Borwein Step-Size Calculation
	{
		id: "lr-barzilai-borwein-sgd",
		title: "Barzilai-Borwein Adaptive Step Size",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "barzilai-borwein", "adaptive-step-size", "optimization"],
		description: "Compute the Barzilai-Borwein step size alpha_BB = (s^T s) / |s^T y_g| for successive weights and gradients.",
		story: `<p>Quasi-Newton optimization at <b>QuasiTech</b> approximates the local inverse Hessian scalar using the <b>Barzilai-Borwein (BB) formula</b>:
Given displacement <code>s = w_t - w_{t-1}</code> and gradient difference <code>y_g = grad_t - grad_{t-1}</code>:
<code>alpha_{BB} = (s^T * s) / (|s^T * y_g| + 1e-8)</code>.</p>`,
		task: "Given D, displacement vector s, and gradient difference vector y_g, compute alpha_{BB}.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing <code>s</code>.</p>
<p>The third line contains <code>D</code> real numbers representing <code>y_g</code>.</p>`,
		outputFormat: `<p>Print <code>alpha_{BB}</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"||s|| > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2312);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 2\n2 4", "0.5000", true, "s^T s = 5, s^T y_g = 10. alpha = 5/10 = 0.5."));

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 5);
				const s = rng.floatArray(D, -3, 3, 2);
				s[0] += 1;
				const yg = rng.floatArray(D, -5, 5, 2);

				const sNormSq = dot(s, s);
				const sy = Math.abs(dot(s, yg));
				const alpha = sNormSq / (sy + 1e-8);

				const inStr = `${D}\n${s.join(" ")}\n${yg.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(alpha)));
			}

			return tcs;
		},
	},

	// 58. Mini-Batch Gradient Variance
	{
		id: "lr-minibatch-gradient-variance",
		title: "Mini-Batch Gradient Variance Diagnostic",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-variance", "stochasticity"],
		description: "Compute the variance of mini-batch gradients Var = 1/M * sum ||g_m - g_bar||^2 evaluated at w_0 = 0 with B = 2.",
		story: `<p>Convergence diagnosticians at <b>StatConvergence</b> monitor stochastic gradient noise by computing the empirical variance of mini-batch gradients:
For <code>M</code> batches of size <code>B = 2</code>, calculate each batch's gradient <code>g_m</code> at initial weights <code>w = 0</code>:
<code>g_m = -1/B * sum_{i in batch} y_i * x_i</code>
<code>g_bar = 1/M * sum g_m</code>
<code>Variance = 1/M * sum_{m=1}^M ||g_m - g_bar||^2</code>.</p>`,
		task: "Given even N, D, matrix X, and target y, compute the gradient variance across batches of size 2.",
		inputFormat: `<p>The first line contains integers <code>N</code> (even) and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the variance with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"4 <= N <= 50 (even N)",
			"1 <= D <= 3",
			"B = 2, w_0 = 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2313);
			const tcs = [];

			tcs.push(makeTc(1, "4 1\n1\n1\n1\n1\n2 2 -2 -2", "16.0000", true, "Batch 1 grad=-2, Batch 2 grad=+2. g_bar=0. Var = 0.5*(4+4)*..."));

			const calcGradVar = (N: number, D: number, X: number[][], y: number[]): number => {
				const B = 2;
				const M = N / B;
				const grads: number[][] = [];

				for (let m = 0; m < M; m++) {
					const gm = new Array(D).fill(0);
					for (let i = m * B; i < (m + 1) * B; i++) {
						for (let d = 0; d < D; d++) gm[d] -= y[i] * X[i][d];
					}
					for (let d = 0; d < D; d++) gm[d] /= B;
					grads.push(gm);
				}

				const gBar = new Array(D).fill(0);
				for (let m = 0; m < M; m++) {
					for (let d = 0; d < D; d++) gBar[d] += grads[m][d];
				}
				for (let d = 0; d < D; d++) gBar[d] /= M;

				let totalVar = 0;
				for (let m = 0; m < M; m++) {
					let sqDist = 0;
					for (let d = 0; d < D; d++) sqDist += (grads[m][d] - gBar[d]) ** 2;
					totalVar += sqDist;
				}
				return totalVar / M;
			};

			for (let i = 2; i <= 100; i++) {
				const numBatches = rng.nextInt(2, 6);
				const N = numBatches * 2;
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -5, 5, 2);

				const v = calcGradVar(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(v)));
			}

			return tcs;
		},
	},

	// 59. SGD Cosine Annealing Schedule
	{
		id: "lr-sgd-cosine-annealing-schedule",
		title: "SGD with Cosine Annealing Learning Rate",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "cosine-annealing", "learning-rate-schedule", "sgd"],
		description: "Apply cosine annealing: alpha_t = alpha_min + 0.5 * (alpha_max - alpha_min) * (1 + cos(pi * t / T)) with alpha_max = 0.1, alpha_min = 0.001, w_0 = 0.",
		story: `<p>In smooth cyclic learning rates at <b>CycleAI</b>, step sizes follow <b>Cosine Annealing</b> across total steps <code>T = N</code>:
<code>alpha_t = alpha_min + 0.5 * (alpha_max - alpha_min) * (1 + cos(pi * t / T))</code> for <code>t = 0, ..., N-1</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha_max = 0.1, alpha_min = 0.001, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run sequential SGD with cosine annealing and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"alpha_max = 0.1, alpha_min = 0.001"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2314);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.5636", true, "Cosine annealing progression over 2 steps reaches 0.5636."));

			const solveCosineSgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alphaMax = 0.1;
				const alphaMin = 0.001;
				let w = new Array(D).fill(0);

				for (let t = 0; t < N; t++) {
					const alphaT = alphaMin + 0.5 * (alphaMax - alphaMin) * (1 + Math.cos((Math.PI * t) / N));
					const pred = dot(X[t], w);
					const err = y[t] - pred;
					w = w.map((wi, d) => wi + alphaT * err * X[t][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 15);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveCosineSgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 60. Streaming Exponential Forgetting SGD
	{
		id: "lr-streaming-exponential-sgd",
		title: "Streaming SGD with Exponential Memory Forgetting",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "streaming", "forgetting-factor", "time-varying"],
		description: "Apply exponential decay to prior weights: w_t = lambda * w_{t-1} + alpha * (y_t - x_t^T w_{t-1}) * x_t with lambda = 0.95, alpha = 0.05, w_0 = 0.",
		story: `<p>In dynamic real-time market regime adaptation at <b>FluxTrading</b>, older parameter memories decay exponentially with forgetting factor <code>lambda = 0.95</code>:
<code>w_t = lambda * w_{t-1} + alpha * (y_t - x_t^T * w_{t-1}) * x_t</code>.
Fixed hyperparameters:
<ul>
  <li><code>lambda = 0.95, alpha = 0.05, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run sequential streaming SGD with exponential forgetting and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 3",
			"lambda = 0.95, alpha = 0.05"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2315);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", "0.4750", true, "Prior memory decays by 0.95 each step."));

			const solveExpForget = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const lambda = 0.95;
				const alpha = 0.05;
				let w = new Array(D).fill(0);

				for (let t = 0; t < N; t++) {
					const pred = dot(X[t], w);
					const err = y[t] - pred;
					w = w.map((wi, d) => lambda * wi + alpha * err * X[t][d]);
				}
				return w;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 15);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -4, 4, 2);

				const w = solveExpForget(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},
];
