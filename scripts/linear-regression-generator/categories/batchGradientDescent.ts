import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, matVecMul, transpose, dot, norm2 } from "../utils";

export const batchGradientDescentProblems: LRProblemDefinition[] = [
	// 31. BGD Fixed Iterations
	{
		id: "lr-bgd-fixed-iterations",
		title: "Batch Gradient Descent Fixed Iterations",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-descent", "optimization", "batch-gd"],
		description: "Run exactly 50 iterations of Batch Gradient Descent with fixed step size alpha = 0.05 and w_0 = 0.",
		story: `<p>A high-performance FPGA compiler at <b>SiliconLogic</b> optimizes routing delay weights using standard <b>Batch Gradient Descent (BGD)</b> on Mean Squared Error <code>L(w) = 1/(2N) * ||Xw - y||^2</code>:
<code>grad = 1/N * X^T * (X * w - y)</code>
<code>w_{t+1} = w_t - alpha * grad</code>.
All runs execute with <b>strictly fixed hyperparameters</b>:
<ul>
  <li>Initial weight vector: <code>w_0 = 0</code></li>
  <li>Step size: <code>alpha = 0.05</code></li>
  <li>Fixed iterations: <code>max_iter = 50</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run exactly 50 iterations of BGD and output the final weight vector w_{50}.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>D</code> (features).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 4",
			"alpha = 0.05, max_iter = 50, w_0 = 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2201);
			const tcs = [];

			const solveBgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				const maxIter = 50;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				for (let iter = 0; iter < maxIter; iter++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					w = w.map((wi, d) => wi - alpha * grad[d]);
				}
				return w;
			};

			const s1W = solveBgd(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s1W.map(f4).join(" "), true, "Single feature line y=2x reaches ~1.9975 after 50 steps."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const D = rng.nextInt(1, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const wFinal = solveBgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, wFinal.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 32. BGD Gradient Norm Tolerance
	{
		id: "lr-bgd-gradient-norm-tolerance",
		title: "BGD with Gradient Norm Stopping Criterion",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-descent", "convergence", "stopping-criteria"],
		description: "Stop BGD when ||grad||_2 < eps (eps = 1e-4) or max_iter = 200 (alpha = 0.02, w_0 = 0).",
		story: `<p>In real-time embedded systems at <b>IoTEdge</b>, power savings require terminating gradient iterations as soon as the gradient norm falls below tolerance: <code>||grad||_2 < eps</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, eps = 1e-4, max_iter = 200, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run BGD and output the total iterations executed and final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the integer iterations on line 1, and the <code>D</code> weights on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.02, eps = 1e-4, max_iter = 200"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2202);
			const tcs = [];

			const solveNormTol = (N: number, D: number, X: number[][], y: number[]): [number, number[]] => {
				const alpha = 0.02;
				const eps = 1e-4;
				const maxIter = 200;
				let w = new Array(D).fill(0);
				const XT = transpose(X);
				let iters = 0;

				for (let iter = 0; iter < maxIter; iter++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					const gNorm = norm2(grad);
					if (gNorm < eps) {
						iters = iter;
						return [iters, w];
					}
					w = w.map((wi, d) => wi - alpha * grad[d]);
					iters = iter + 1;
				}
				return [iters, w];
			};

			const [s1Iters, s1W] = solveNormTol(2, 1, [[0], [0]], [0, 0]);
			tcs.push(makeTc(1, "2 1\n0\n0\n0 0", `${s1Iters}\n${s1W.map(f4).join(" ")}`, true, "Zero target converges immediately at iter 0."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.2, 1.2, 2));
				X[0][0] += 0.8;
				const y = rng.floatArray(N, -2, 2, 2);

				const [iters, w] = solveNormTol(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${iters}\n${w.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 33. BGD Loss Change Tolerance
	{
		id: "lr-bgd-loss-change-tolerance",
		title: "BGD with Objective Loss Change Tolerance",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-descent", "loss-tolerance"],
		description: "Stop BGD when |L_t - L_{t-1}| < eps with eps = 1e-5 (alpha = 0.01, max_iter = 150, w_0 = 0).",
		story: `<p>In iterative structural optimization at <b>CortexEng</b>, training halts when reduction in Mean Squared Error <code>L(w) = 1/(2N) * sum (x_i^T w - y_i)^2</code> plateaus: <code>|L_t - L_{t-1}| < eps</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.01, eps = 1e-5, max_iter = 150, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, compute total iterations taken and final loss L.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the integer iterations on line 1, and final loss on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.01, eps = 1e-5, max_iter = 150"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2203);
			const tcs = [];

			const solveLossTol = (N: number, D: number, X: number[][], y: number[]): [number, number] => {
				const alpha = 0.01;
				const eps = 1e-5;
				const maxIter = 150;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				const getLoss = (weights: number[]): number => {
					const diff = matVecMul(X, weights).map((yh, i) => yh - y[i]);
					return dot(diff, diff) / (2 * N);
				};

				let prevLoss = getLoss(w);
				let iters = 0;

				for (let iter = 1; iter <= maxIter; iter++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					w = w.map((wi, d) => wi - alpha * grad[d]);

					const curLoss = getLoss(w);
					iters = iter;
					if (Math.abs(curLoss - prevLoss) < eps) {
						return [iters, curLoss];
					}
					prevLoss = curLoss;
				}
				return [iters, prevLoss];
			};

			const [s33Iters, s33Loss] = solveLossTol(2, 1, [[0], [0]], [0, 0]);
			tcs.push(makeTc(1, "2 1\n0\n0\n0 0", `${s33Iters}\n${f4(s33Loss)}`, true, "Zero target converges immediately at step 1."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.0, 1.0, 2));
				X[0][0] += 0.8;
				const y = rng.floatArray(N, -2, 2, 2);

				const [iters, loss] = solveLossTol(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${iters}\n${f4(loss)}`));
			}

			return tcs;
		},
	},

	// 34. BGD Classical Momentum
	{
		id: "lr-bgd-classical-momentum",
		title: "BGD with Classical Polyak Momentum",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "momentum", "optimization", "polyak"],
		description: "Apply classical momentum v_{t+1} = beta * v_t + alpha * grad, w_{t+1} = w_t - v_{t+1} (alpha = 0.02, beta = 0.9, max_iter = 30).",
		story: `<p>Rocket trajectory optimization at <b>AeroSpace Pro</b> accelerates valley traversal using <b>Polyak Momentum</b>:
<code>v_{t+1} = beta * v_t + alpha * grad</code>
<code>w_{t+1} = w_t - v_{t+1}</code>
where <code>grad = 1/N * X^T (Xw_t - y)</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, beta = 0.9, max_iter = 30, w_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 iterations of classical momentum and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.02, beta = 0.9, max_iter = 30"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2204);
			const tcs = [];

			const solveMomentum = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.02;
				const beta = 0.9;
				const maxIter = 30;
				let w = new Array(D).fill(0);
				let v = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					v = v.map((vi, d) => beta * vi + alpha * grad[d]);
					w = w.map((wi, d) => wi - v[d]);
				}
				return w;
			};

			const s34W = solveMomentum(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s34W.map(f4).join(" "), true, "Momentum accelerates convergence to 1.6059 after 30 steps."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveMomentum(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 35. BGD Nesterov Accelerated Gradient
	{
		id: "lr-bgd-nesterov-accelerated",
		title: "BGD with Nesterov Accelerated Gradient (NAG)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "nesterov", "optimization", "accelerated-gradient"],
		description: "Compute NAG updates: w_look = w_t - beta * v_t, v_{t+1} = beta * v_t + alpha * grad(w_look), w_{t+1} = w_t - v_{t+1} (alpha = 0.02, beta = 0.9, max_iter = 30).",
		story: `<p>At <b>OptimaRobotics</b>, arm servos prevent momentum overshoot using <b>Nesterov Accelerated Gradient (NAG)</b> by evaluating the gradient at the 'lookahead' point:
<ul>
  <li><code>w_look = w_t - beta * v_t</code></li>
  <li><code>g = 1/N * X^T (X * w_look - y)</code></li>
  <li><code>v_{t+1} = beta * v_t + alpha * g</code></li>
  <li><code>w_{t+1} = w_t - v_{t+1}</code></li>
</ul>
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, beta = 0.9, max_iter = 30, w_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 iterations of NAG and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.02, beta = 0.9, max_iter = 30"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2205);
			const tcs = [];

			const solveNesterov = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.02;
				const beta = 0.9;
				const maxIter = 30;
				let w = new Array(D).fill(0);
				let v = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const wLook = w.map((wi, d) => wi - beta * v[d]);
					const yHat = matVecMul(X, wLook);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					v = v.map((vi, d) => beta * vi + alpha * grad[d]);
					w = w.map((wi, d) => wi - v[d]);
				}
				return w;
			};

			const s35W = solveNesterov(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s35W.map(f4).join(" "), true, "Nesterov lookahead reaches 1.8044 after 30 steps."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveNesterov(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 36. BGD AdaGrad Optimizer
	{
		id: "lr-bgd-adagrad-optimizer",
		title: "BGD with AdaGrad Optimizer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "adagrad", "adaptive-learning-rate"],
		description: "Apply AdaGrad G_{t+1} = G_t + g_t^2, w_{t+1} = w_t - alpha / sqrt(G_{t+1} + 1e-8) * g_t (alpha = 0.1, max_iter = 40).",
		story: `<p>In text feature regression at <b>SearchEngine X</b>, features have varying sparsity. <b>AdaGrad</b> divides step size by the square root of accumulated past squared gradients:
<code>G_{t+1} = G_t + g_t^2</code>
<code>w_{t+1} = w_t - alpha / sqrt(G_{t+1} + 1e-8) * g_t</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.1, max_iter = 40, w_0 = 0, G_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 40 iterations of AdaGrad and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.1, max_iter = 40"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2206);
			const tcs = [];

			const solveAdaGrad = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.1;
				const maxIter = 40;
				let w = new Array(D).fill(0);
				let G = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					G = G.map((gi, d) => gi + grad[d] * grad[d]);
					w = w.map((wi, d) => wi - (alpha / Math.sqrt(G[d] + 1e-8)) * grad[d]);
				}
				return w;
			};

			const s36W = solveAdaGrad(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s36W.map(f4).join(" "), true, "AdaGrad adapts step size automatically."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveAdaGrad(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 37. BGD RMSprop Optimizer
	{
		id: "lr-bgd-rmsprop-optimizer",
		title: "BGD with RMSprop Optimizer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "rmsprop", "exponential-moving-average"],
		description: "Apply RMSprop v_{t+1} = beta * v_t + (1 - beta) * g_t^2, w_{t+1} = w_t - alpha / sqrt(v_{t+1} + 1e-8) * g_t (alpha = 0.05, beta = 0.9, max_iter = 40).",
		story: `<p>Non-stationary financial tracking at <b>AlphaQuant</b> prevents step sizes from shrinking to zero using <b>RMSprop</b> with exponential decay:
<code>v_{t+1} = beta * v_t + (1 - beta) * g_t^2</code>
<code>w_{t+1} = w_t - alpha / sqrt(v_{t+1} + 1e-8) * g_t</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.05, beta = 0.9, max_iter = 40, w_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 40 iterations of RMSprop and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.05, beta = 0.9, max_iter = 40"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2207);
			const tcs = [];

			const solveRMSprop = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				const beta = 0.9;
				const maxIter = 40;
				let w = new Array(D).fill(0);
				let v = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					v = v.map((vi, d) => beta * vi + (1 - beta) * grad[d] * grad[d]);
					w = w.map((wi, d) => wi - (alpha / Math.sqrt(v[d] + 1e-8)) * grad[d]);
				}
				return w;
			};

			const s37W = solveRMSprop(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s37W.map(f4).join(" "), true, "RMSprop steps to 1.8058 after 40 iterations."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveRMSprop(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 38. BGD Adam Optimizer
	{
		id: "lr-bgd-adam-optimizer",
		title: "BGD with Adam Optimizer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "adam", "adaptive-moments"],
		description: "Apply Adam optimizer with bias correction (alpha = 0.1, beta1 = 0.9, beta2 = 0.999, max_iter = 30).",
		story: `<p>At <b>DeepAI Systems</b>, regression weights are trained using the <b>Adam (Adaptive Moment Estimation)</b> optimizer:
<ul>
  <li><code>m_t = beta_1 * m_{t-1} + (1 - beta_1) * g_t</code></li>
  <li><code>v_t = beta_2 * v_{t-1} + (1 - beta_2) * g_t^2</code></li>
  <li><code>m_hat = m_t / (1 - beta_1^t), v_hat = v_t / (1 - beta_2^t)</code></li>
  <li><code>w_t = w_{t-1} - alpha / (sqrt(v_hat) + 1e-8) * m_hat</code></li>
</ul>
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.1, beta_1 = 0.9, beta_2 = 0.999, max_iter = 30, w_0 = 0, m_0 = 0, v_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 iterations of Adam and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.1, beta_1 = 0.9, beta_2 = 0.999, max_iter = 30"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2208);
			const tcs = [];

			const solveAdam = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.1;
				const beta1 = 0.9;
				const beta2 = 0.999;
				const maxIter = 30;
				let w = new Array(D).fill(0);
				let m = new Array(D).fill(0);
				let v = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 1; t <= maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);

					m = m.map((mi, d) => beta1 * mi + (1 - beta1) * grad[d]);
					v = v.map((vi, d) => beta2 * vi + (1 - beta2) * grad[d] * grad[d]);

					const mHat = m.map((mi) => mi / (1 - beta1 ** t));
					const vHat = v.map((vi) => vi / (1 - beta2 ** t));

					w = w.map((wi, d) => wi - (alpha / (Math.sqrt(vHat[d]) + 1e-8)) * mHat[d]);
				}
				return w;
			};

			const s38W = solveAdam(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s38W.map(f4).join(" "), true, "Adam converges reliably."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveAdam(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 39. BGD Step-Decay Schedule
	{
		id: "lr-bgd-step-decay-schedule",
		title: "BGD with Step-Decay Learning Rate Schedule",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "learning-rate-schedule", "step-decay"],
		description: "Apply step decay alpha_t = alpha_0 * gamma^(floor(t / s)) with alpha_0 = 0.1, gamma = 0.5, s = 10, max_iter = 30.",
		story: `<p>At <b>QuantSim Labs</b>, training schedules cut the learning rate in half every <code>s = 10</code> epochs to settle into sharp quadratic minima:
<code>alpha_t = alpha_0 * gamma^{floor(t / s)}</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha_0 = 0.1, gamma = 0.5, s = 10, max_iter = 30, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 30 iterations with step decay schedule and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha_0 = 0.1, gamma = 0.5, s = 10, max_iter = 30"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2209);
			const tcs = [];

			const solveStepDecay = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha0 = 0.1;
				const gamma = 0.5;
				const s = 10;
				const maxIter = 30;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const alphaT = alpha0 * (gamma ** Math.floor(t / s));
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					w = w.map((wi, d) => wi - alphaT * grad[d]);
				}
				return w;
			};

			const s39W = solveStepDecay(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s39W.map(f4).join(" "), true, "Step decay schedule reaches 1.9845."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.2, 1.2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveStepDecay(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 40. BGD Exponential Decay Schedule
	{
		id: "lr-bgd-exponential-decay-schedule",
		title: "BGD with Exponential Learning Rate Decay",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "learning-rate-schedule", "exponential-decay"],
		description: "Apply exponential decay alpha_t = alpha_0 * exp(-k * t) with alpha_0 = 0.08, k = 0.05, max_iter = 40.",
		story: `<p>A high-speed optical tracking loop at <b>LaserSonde</b> continuously anneals step size smoothly via exponential decay:
<code>alpha_t = alpha_0 * exp(-k * t)</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha_0 = 0.08, k = 0.05, max_iter = 40, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 40 iterations and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha_0 = 0.08, k = 0.05, max_iter = 40"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2210);
			const tcs = [];

			const solveExpDecay = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha0 = 0.08;
				const k = 0.05;
				const maxIter = 40;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const alphaT = alpha0 * Math.exp(-k * t);
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g) => g / N);
					w = w.map((wi, d) => wi - alphaT * grad[d]);
				}
				return w;
			};

			const s40W = solveExpDecay(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s40W.map(f4).join(" "), true, "Exponential decay reaches 1.9739."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.2, 1.2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveExpDecay(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 41. Backtracking Armijo Line Search
	{
		id: "lr-bgd-backtracking-line-search",
		title: "Backtracking Armijo Line Search Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "line-search", "armijo-condition", "optimization"],
		description: "Find the largest step size alpha in {1.0, 0.5, 0.25, ...} satisfying Armijo condition L(w - alpha * grad) <= L(w) - c * alpha * ||grad||^2 with c = 0.1.",
		story: `<p>Numerical optimization algorithms at <b>SciCompute</b> determine adaptive step size using the <b>Armijo Sufficient Decrease Condition</b>:
<code>L(w - alpha * grad) <= L(w) - c * alpha * ||grad||^2</code>
Starting with trial step <code>alpha = 1.0</code>, multiply by <code>rho = 0.5</code> until the condition holds.
Fixed hyperparameters:
<ul>
  <li><code>c = 0.1, rho = 0.5, alpha_initial = 1.0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, target y, and initial point w, find the accepted alpha and updated weights w_next.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing initial <code>w</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the accepted <code>alpha</code> followed by <code>w_next</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 3",
			"c = 0.1, rho = 0.5"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2211);
			const tcs = [];

			const solveArmijo = (N: number, D: number, w: number[], X: number[][], y: number[]): [number, number[]] => {
				const c = 0.1;
				const rho = 0.5;
				const XT = transpose(X);

				const loss = (weights: number[]): number => {
					const diff = matVecMul(X, weights).map((yh, i) => yh - y[i]);
					return dot(diff, diff) / (2 * N);
				};

				const curL = loss(w);
				const yHat = matVecMul(X, w);
				const diff = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, diff).map((g) => g / N);
				const gradNormSq = dot(grad, grad);

				let alpha = 1.0;
				for (let iter = 0; iter < 20; iter++) {
					const trialW = w.map((wi, d) => wi - alpha * grad[d]);
					const trialL = loss(trialW);
					if (trialL <= curL - c * alpha * gradNormSq) {
						return [alpha, trialW];
					}
					alpha *= rho;
				}
				const nextW = w.map((wi, d) => wi - alpha * grad[d]);
				return [alpha, nextW];
			};

			const [s41Alpha, s41NextW] = solveArmijo(2, 1, [0], [[1], [1]], [2, 2]);
			tcs.push(makeTc(1, "2 1\n0.0\n1\n1\n2 2", `${f4(s41Alpha)} ${s41NextW.map(f4).join(" ")}`, true, "Armijo accepts step size."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const wInit = rng.floatArray(D, -2, 2, 1);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const [alphaAccepted, wNext] = solveArmijo(N, D, wInit, X, y);
				let inStr = `${N} ${D}\n${wInit.join(" ")}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${f4(alphaAccepted)} ${wNext.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 42. BGD Gradient Clipping
	{
		id: "lr-bgd-gradient-clipping",
		title: "BGD with L2 Gradient Norm Clipping",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "gradient-clipping", "robustness"],
		description: "Clip gradient to maximum L2-norm threshold C = 1.0 (alpha = 0.05, max_iter = 25, w_0 = 0).",
		story: `<p>In distributed sensor networks at <b>SensorMesh</b>, transmission glitches introduce wild outliers that cause gradient explosion. The learner applies <b>L2 Gradient Clipping</b> with threshold <code>C = 1.0</code>:
<code>if ||grad||_2 > C: grad_clipped = (C / ||grad||_2) * grad</code>
<code>w_{t+1} = w_t - alpha * grad_clipped</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.05, C = 1.0, max_iter = 25, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 25 iterations of clipped BGD and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.05, C = 1.0, max_iter = 25"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2212);
			const tcs = [];

			const solveClipped = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.05;
				const C = 1.0;
				const maxIter = 25;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					let grad = matVecMul(XT, diff).map((g) => g / N);
					const gNorm = norm2(grad);
					if (gNorm > C) {
						const scale = C / gNorm;
						grad = grad.map((g) => g * scale);
					}
					w = w.map((wi, d) => wi - alpha * grad[d]);
				}
				return w;
			};

			const s42W = solveClipped(2, 1, [[1], [2]], [10, 20]);
			tcs.push(makeTc(1, "2 1\n1\n2\n10 20", s42W.map(f4).join(" "), true, "Gradient clipped to 1.0 each step: 25 * 0.05 * 1.0 = 1.25."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -2, 2, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -15, 15, 1);

				const w = solveClipped(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 43. BGD Ridge Regularized
	{
		id: "lr-bgd-ridge-regularized",
		title: "BGD with L2 Ridge Weight Decay",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "weight-decay", "gradient-descent"],
		description: "Apply BGD on Ridge objective grad = 1/N * X^T (Xw - y) + lambda * w with alpha = 0.02, lambda = 0.1, max_iter = 50.",
		story: `<p>At <b>BioChem Informatics</b>, linear models prevent overfitting by applying gradient descent directly to the Ridge objective:
<code>grad = 1/N * X^T * (X * w - y) + lambda * w</code>
<code>w_{t+1} = w_t - alpha * grad</code>.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, lambda = 0.1, max_iter = 50, w_0 = 0</code></li>
</ul></p>`,
		task: "Given N, D, matrix X, and target y, run 50 iterations of Ridge gradient descent and output final weights.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> weights space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"alpha = 0.02, lambda = 0.1, max_iter = 50"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2213);
			const tcs = [];

			const solveRidgeBgd = (N: number, D: number, X: number[][], y: number[]): number[] => {
				const alpha = 0.02;
				const lambda = 0.1;
				const maxIter = 50;
				let w = new Array(D).fill(0);
				const XT = transpose(X);

				for (let t = 0; t < maxIter; t++) {
					const yHat = matVecMul(X, w);
					const diff = yHat.map((yh, i) => yh - y[i]);
					const grad = matVecMul(XT, diff).map((g, d) => g / N + lambda * w[d]);
					w = w.map((wi, d) => wi - alpha * grad[d]);
				}
				return w;
			};

			const s43W = solveRidgeBgd(2, 1, [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 1\n1\n2\n2 4", s43W.map(f4).join(" "), true, "Ridge weight decay reaches 1.8463."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -1.5, 1.5, 2));
				X[0][0] += 1;
				const y = rng.floatArray(N, -3, 3, 2);

				const w = solveRidgeBgd(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 44. BGD Early Stopping Validation
	{
		id: "lr-bgd-early-stopping-validation",
		title: "BGD with Validation Patience Early Stopping",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "early-stopping", "validation", "overfitting"],
		description: "Train with BGD (alpha = 0.02, max_iter = 50) and stop early if validation MSE fails to decrease for patience = 3 consecutive epochs.",
		story: `<p>At <b>ModelOps Sentinel</b>, automated pipelines prevent overfitting on training noise using <b>Early Stopping with Patience</b>:
Every iteration <code>t=1, ..., 50</code>, evaluate validation set MSE. If validation MSE fails to strictly improve upon the lowest seen validation loss for <code>patience = 3</code> consecutive checks, training halts immediately and restores the best parameters.
Fixed hyperparameters:
<ul>
  <li><code>alpha = 0.02, patience = 3, max_iter = 50, w_0 = 0</code></li>
</ul></p>`,
		task: "Given training set (N_tr, D) and validation set (N_val, D), output the best epoch index and the restored best weights.",
		inputFormat: `<p>The first line contains integers <code>N_tr</code>, <code>N_val</code>, and <code>D</code>.</p>
<p>The next <code>N_tr</code> lines contain training features <code>X_tr</code> followed by target <code>y_tr</code>.</p>
<p>The next <code>N_val</code> lines contain validation features <code>X_val</code> followed by target <code>y_val</code>.</p>`,
		outputFormat: `<p>Print the best integer epoch on line 1, and the <code>D</code> restored weights on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"1 <= D <= 2",
			"2 <= N_tr, N_val <= 20",
			"alpha = 0.02, patience = 3, max_iter = 50"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2214);
			const tcs = [];

			const solveEarlyStop = (Ntr: number, Nval: number, D: number, Xtr: number[][], ytr: number[], Xval: number[][], yval: number[]): [number, number[]] => {
				const alpha = 0.02;
				const patience = 3;
				const maxIter = 50;
				let w = new Array(D).fill(0);
				const XTtr = transpose(Xtr);

				const valMse = (weights: number[]): number => {
					const diff = matVecMul(Xval, weights).map((yh, i) => yh - yval[i]);
					return dot(diff, diff) / Nval;
				};

				let bestValLoss = Infinity;
				let bestEpoch = 1;
				let bestW = [...w];
				let badSteps = 0;

				for (let t = 1; t <= maxIter; t++) {
					const yHat = matVecMul(Xtr, w);
					const diff = yHat.map((yh, i) => yh - ytr[i]);
					const grad = matVecMul(XTtr, diff).map((g) => g / Ntr);
					w = w.map((wi, d) => wi - alpha * grad[d]);

					const curValLoss = valMse(w);
					if (curValLoss < bestValLoss - 1e-6) {
						bestValLoss = curValLoss;
						bestEpoch = t;
						bestW = [...w];
						badSteps = 0;
					} else {
						badSteps++;
						if (badSteps >= patience) break;
					}
				}
				return [bestEpoch, bestW];
			};

			const [s44Epoch, s44W] = solveEarlyStop(2, 2, 1, [[1], [2]], [2, 4], [[1], [2]], [2, 4]);
			tcs.push(makeTc(1, "2 2 1\n1 2\n2 4\n1 2\n2 4", `${s44Epoch}\n${s44W.map(f4).join(" ")}`, true, "Validation perfectly matches train; runs full 50 epochs."));

			for (let i = 2; i <= 100; i++) {
				const Ntr = rng.nextInt(3, 6);
				const Nval = rng.nextInt(3, 6);
				const D = 1;

				const trRows: number[][] = [];
				for (let j = 0; j < Ntr; j++) {
					const x = parseFloat(rng.nextFloat(0.5, 3.0).toFixed(1));
					const y = parseFloat((2.0 * x + rng.nextFloat(-0.5, 0.5)).toFixed(2));
					trRows.push([x, y]);
				}
				const valRows: number[][] = [];
				for (let j = 0; j < Nval; j++) {
					const x = parseFloat(rng.nextFloat(0.5, 3.0).toFixed(1));
					const y = parseFloat((2.0 * x + rng.nextFloat(-0.5, 0.5)).toFixed(2));
					valRows.push([x, y]);
				}

				const Xtr = trRows.map((r) => [r[0]]);
				const ytr = trRows.map((r) => r[1]);
				const Xval = valRows.map((r) => [r[0]]);
				const yval = valRows.map((r) => r[1]);

				const [bestEpoch, bestW] = solveEarlyStop(Ntr, Nval, D, Xtr, ytr, Xval, yval);
				let inStr = `${Ntr} ${Nval} ${D}\n` +
					trRows.map((r) => r.join(" ")).join("\n") + "\n" +
					valRows.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, `${bestEpoch}\n${bestW.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 45. Standardized vs Unstandardized BGD
	{
		id: "lr-bgd-standardized-vs-unstandardized",
		title: "BGD Convergence: Standardized vs Raw Features",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "standardization", "gradient-descent", "feature-scaling"],
		description: "Compare MSE after 10 iterations of BGD on raw features vs standardized features (alpha = 0.01, steps = 10, w_0 = 0).",
		story: `<p>Data engineering instructors at <b>ML Academy</b> demonstrate why feature scaling accelerates gradient descent. For design matrix <code>X in R^(N x D)</code> and target <code>y</code>:
<ol>
  <li>Run 10 steps of BGD on raw features <code>X</code> with <code>alpha = 0.01, w_0 = 0</code> and compute final training MSE.</li>
  <li>Standardize each column of <code>X</code>: <code>Z_{ij} = (X_{ij} - mu_j) / sigma_j</code>. Run 10 steps of BGD on <code>Z</code> with <code>alpha = 0.01, w_0 = 0</code> and compute its final training MSE.</li>
</ol></p>`,
		task: "Given N, D, matrix X, and target y, output the raw MSE and standardized MSE after 10 steps.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>raw_mse std_mse</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 2",
			"sigma_j > 0 for all columns",
			"alpha = 0.01, steps = 10"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2215);
			const tcs = [];

			const solveCompare = (N: number, D: number, X: number[][], y: number[]): [number, number] => {
				const alpha = 0.01;
				const steps = 10;

				const runSteps = (mat: number[][]): number => {
					let w = new Array(D).fill(0);
					const MT = transpose(mat);
					for (let t = 0; t < steps; t++) {
						const yHat = matVecMul(mat, w);
						const diff = yHat.map((yh, i) => yh - y[i]);
						const grad = matVecMul(MT, diff).map((g) => g / N);
						w = w.map((wi, d) => wi - alpha * grad[d]);
					}
					const finalDiff = matVecMul(mat, w).map((yh, i) => yh - y[i]);
					return dot(finalDiff, finalDiff) / N;
				};

				const rawMse = runSteps(X);

				// Standardize columns
				const Z = Array.from({ length: N }, () => new Array(D).fill(0));
				for (let d = 0; d < D; d++) {
					const col = X.map((r) => r[d]);
					const mu = col.reduce((s, v) => s + v, 0) / N;
					const sigma = Math.sqrt(col.reduce((s, v) => s + (v - mu) ** 2, 0) / N) || 1;
					for (let i = 0; i < N; i++) Z[i][d] = (col[i] - mu) / sigma;
				}
				const stdMse = runSteps(Z);

				return [rawMse, stdMse];
			};

			const [s45Raw, s45Std] = solveCompare(2, 1, [[10], [20]], [20, 40]);
			tcs.push(makeTc(1, "2 1\n10\n20\n20 40", `${f4(s45Raw)} ${f4(s45Std)}`, true, "Raw vs standardized feature convergence MSE comparison."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = 1;
				const X = Array.from({ length: N }, () => [parseFloat(rng.nextFloat(5, 30).toFixed(1))]);
				X[0][0] += 10;
				const y = rng.floatArray(N, 10, 50, 1);

				const [rMse, sMse] = solveCompare(N, D, X, y);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${f4(rMse)} ${f4(sMse)}`));
			}

			return tcs;
		},
	},
];
