import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const optimizationProblems: MLProblemDefinition[] = [
	// 31. Helios Reactor Batch Gradient Descent
	{
		id: "helios-reactor-batch-gradient-descent",
		title: "Helios Reactor Batch Gradient Descent",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "gradient-descent", "optimization"],
		description: "Compute the updated parameter vector after N steps of Batch Gradient Descent on a quadratic bowl.",
		story: `<p>Fusion magnetic confinement coils in the Helios Reactor adjust parameters to minimize plasma turbulence. The cost function is quadratic: <code>J(w) = 0.5 * w^T A w - b^T w</code>, with gradient <code>grad = A*w - b</code>. In each step, <code>w := w - alpha * grad</code>.</p>`,
		task: "Given diagonal matrix A, vector b, initial weights w0, step size alpha, and K iterations, output the final weight vector.",
		inputFormat: `<p>The first line contains integers <code>D</code> (dimension), <code>K</code> (steps), and real number <code>alpha</code>.</p>
<p>The second line contains <code>D</code> positive diagonal elements of matrix <code>A</code>.</p>
<p>The third line contains <code>D</code> values of vector <code>b</code>.</p>
<p>The fourth line contains <code>D</code> initial weights <code>w0</code>.</p>`,
		outputFormat: `<p>Print the final <code>D</code> weights formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"1 <= K <= 100",
			"alpha > 0",
			"A[i] > 0"
		]),
		points: 130,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(401);
			const tcs = [];

			tcs.push(makeTc(1, "2 1 0.1\n2 4\n4 8\n0 0", "0.4000 0.8000", true, "grad = A*w - b = [0, 0] - [4, 8] = [-4, -8]. w = 0 - 0.1*(-4) = 0.4."));
			tcs.push(makeTc(2, "1 2 0.5\n2\n4\n0", "1.5000", true, "Two steps on 1D bowl: w1 = 0 - 0.5*(-4) = 2. grad2 = 2*2 - 4 = 0. w2 = 2."));

			const runGD = (D: number, K: number, alpha: number, A: number[], b: number[], w0: number[]): number[] => {
				const w = [...w0];
				for (let k = 0; k < K; k++) {
					for (let d = 0; d < D; d++) {
						const grad = A[d] * w[d] - b[d];
						w[d] -= alpha * grad;
					}
				}
				return w;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const K = rng.nextInt(5, 20);
				const alpha = parseFloat(rng.nextFloat(0.01, 0.1).toFixed(3));
				const A = rng.intArray(D, 1, 5);
				const b = rng.intArray(D, -10, 10);
				const w0 = rng.floatArray(D, -5, 5, 2);
				const w = runGD(D, K, alpha, A, b, w0);
				const inStr = `${D} ${K} ${alpha}\n${A.join(" ")}\n${b.join(" ")}\n${w0.join(" ")}`;
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 32. Kinetic Missile Momentum Optimizer
	{
		id: "kinetic-missile-momentum-optimizer",
		title: "Kinetic Missile Momentum Optimizer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "momentum", "optimization", "deep-learning"],
		description: "Compute the velocity and weight updates under Classical Momentum optimization.",
		story: `<p>A missile trajectory tracker avoids local oscillations using the <b>Momentum Optimizer</b>. Given past velocity vector <code>v</code>, decay factor <code>beta</code>, learning rate <code>alpha</code>, and current gradient <code>g</code>, updates proceed as: <code>v := beta * v + alpha * g</code> and <code>w := w - v</code>.</p>`,
		task: "Given D, K steps, beta, alpha, initial w, initial v, and K gradients, compute the final weights w and velocity v.",
		inputFormat: `<p>The first line contains integers <code>D</code>, <code>K</code>, and real numbers <code>beta</code> and <code>alpha</code>.</p>
<p>The second line contains <code>D</code> initial weights <code>w</code>.</p>
<p>The third line contains <code>D</code> initial velocities <code>v</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> gradient values.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>final_w</code> (4 decimal places).</p>
<p>Line 2: <code>final_v</code> (4 decimal places).</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"1 <= K <= 20",
			"0 <= beta < 1",
			"alpha > 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(402);
			const tcs = [];

			tcs.push(makeTc(1, "1 1 0.9 0.1\n0.0\n0.0\n1.0", "-0.1000\n0.1000", true, "v = 0.9*0 + 0.1*1 = 0.1. w = 0 - 0.1 = -0.1."));
			tcs.push(makeTc(2, "1 2 0.9 0.1\n0.0\n0.0\n1.0\n1.0", "-0.2900\n0.1900", true, "Step 2: v = 0.9*0.1 + 0.1*1 = 0.19. w = -0.1 - 0.19 = -0.29."));

			const runMomentum = (D: number, K: number, beta: number, alpha: number, w0: number[], v0: number[], grads: number[][]) => {
				const w = [...w0];
				const v = [...v0];
				for (const g of grads) {
					for (let d = 0; d < D; d++) {
						v[d] = beta * v[d] + alpha * g[d];
						w[d] -= v[d];
					}
				}
				return { w, v };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 3);
				const K = rng.nextInt(2, 10);
				const beta = parseFloat(rng.nextFloat(0.5, 0.95).toFixed(2));
				const alpha = parseFloat(rng.nextFloat(0.01, 0.1).toFixed(3));
				const w0 = rng.floatArray(D, -5, 5, 2);
				const v0 = new Array(D).fill(0);
				const grads = Array.from({ length: K }, () => rng.floatArray(D, -2, 2, 2));

				const res = runMomentum(D, K, beta, alpha, w0, v0, grads);
				let inStr = `${D} ${K} ${beta} ${alpha}\n${w0.join(" ")}\n${v0.join(" ")}\n`;
				inStr += grads.map((g) => g.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, `${res.w.map(f4).join(" ")}\n${res.v.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 33. Crypto Volatility AdaGrad Optimizer
	{
		id: "crypto-volatility-adagrad-optimizer",
		title: "Crypto Volatility AdaGrad Optimizer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "adagrad", "optimization", "deep-learning"],
		description: "Apply AdaGrad adaptive learning rate updates using accumulated historical squared gradients.",
		story: `<p>A high-frequency crypto trading model uses <b>AdaGrad</b> to adapt learning rates across diverse market features. Frequent signals receive decayed step sizes, while sparse volatility spikes maintain larger steps: <code>G := G + g^2</code> and <code>w := w - (alpha / (sqrt(G) + eps)) * g</code>.</p>`,
		task: "Given D, K steps, alpha, eps=1e-8, initial w, initial G=0, and K gradients, compute final weights w and accumulated squared gradients G.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>K</code>, and real number <code>alpha</code>.</p>
<p>The second line contains <code>D</code> initial weights <code>w</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> gradient values.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>final_w</code> (4 decimal places).</p>
<p>Line 2: <code>final_G</code> (4 decimal places).</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"1 <= K <= 20",
			"alpha > 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(403);
			const tcs = [];

			tcs.push(makeTc(1, "1 1 0.1\n0.0\n2.0", "-0.1000\n4.0000", true, "G = 2^2 = 4. w = 0 - (0.1 / 2) * 2 = -0.1."));
			tcs.push(makeTc(2, "1 2 0.1\n0.0\n1.0\n1.0", "-0.1707\n2.0000", true, "G becomes 2. w becomes -0.1 - 0.1/sqrt(2) = -0.1707."));

			const runAdaGrad = (D: number, K: number, alpha: number, w0: number[], grads: number[][]) => {
				const w = [...w0];
				const G = new Array(D).fill(0);
				const eps = 1e-8;
				for (const g of grads) {
					for (let d = 0; d < D; d++) {
						G[d] += g[d] * g[d];
						w[d] -= (alpha / (Math.sqrt(G[d]) + eps)) * g[d];
					}
				}
				return { w, G };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 3);
				const K = rng.nextInt(2, 8);
				const alpha = parseFloat(rng.nextFloat(0.05, 0.5).toFixed(2));
				const w0 = rng.floatArray(D, -3, 3, 2);
				const grads = Array.from({ length: K }, () => rng.floatArray(D, -2, 2, 2));
				const res = runAdaGrad(D, K, alpha, w0, grads);

				let inStr = `${D} ${K} ${alpha}\n${w0.join(" ")}\n`;
				inStr += grads.map((g) => g.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, `${res.w.map(f4).join(" ")}\n${res.G.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 34. Pulsar Radio RMSprop Update
	{
		id: "pulsar-radio-rmsprop-update",
		title: "Pulsar Radio RMSprop Update",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "rmsprop", "optimization", "deep-learning"],
		description: "Compute RMSprop parameter updates with exponentially decaying average of squared gradients.",
		story: `<p>Radio astronomy filters processing pulsar sweeps use <b>RMSprop</b> to eliminate vanishing/exploding gradients. Running squared gradient average <code>v</code> updates via: <code>v := beta * v + (1 - beta) * g^2</code>, followed by parameter step: <code>w := w - (alpha / (sqrt(v) + eps)) * g</code>.</p>`,
		task: "Given D, K steps, beta, alpha, eps=1e-8, initial w, initial v=0, and K gradients, compute final w and v.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>K</code>, and real numbers <code>beta</code> and <code>alpha</code>.</p>
<p>The second line contains <code>D</code> initial weights <code>w</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> gradient values.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>final_w</code> (4 decimal places).</p>
<p>Line 2: <code>final_v</code> (4 decimal places).</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"1 <= K <= 20",
			"0 < beta < 1",
			"alpha > 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(404);
			const tcs = [];

			tcs.push(makeTc(1, "1 1 0.9 0.01\n0.0\n1.0", "-0.0316\n0.1000", true, "v = 0.1 * 1^2 = 0.1. w = 0 - (0.01 / sqrt(0.1)) * 1 = -0.0316."));
			tcs.push(makeTc(2, "1 1 0.9 0.1\n5.0\n0.0", "5.0000\n0.0000", true, "Zero gradient keeps weights unchanged."));

			const runRMSprop = (D: number, K: number, beta: number, alpha: number, w0: number[], grads: number[][]) => {
				const w = [...w0];
				const v = new Array(D).fill(0);
				const eps = 1e-8;
				for (const g of grads) {
					for (let d = 0; d < D; d++) {
						v[d] = beta * v[d] + (1 - beta) * g[d] * g[d];
						w[d] -= (alpha / (Math.sqrt(v[d]) + eps)) * g[d];
					}
				}
				return { w, v };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 3);
				const K = rng.nextInt(2, 8);
				const beta = parseFloat(rng.nextFloat(0.8, 0.99).toFixed(2));
				const alpha = parseFloat(rng.nextFloat(0.01, 0.1).toFixed(3));
				const w0 = rng.floatArray(D, -3, 3, 2);
				const grads = Array.from({ length: K }, () => rng.floatArray(D, -2, 2, 2));
				const res = runRMSprop(D, K, beta, alpha, w0, grads);

				let inStr = `${D} ${K} ${beta} ${alpha}\n${w0.join(" ")}\n`;
				inStr += grads.map((g) => g.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, `${res.w.map(f4).join(" ")}\n${res.v.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 35. Neural Forge Adam Optimizer Step
	{
		id: "neural-forge-adam-optimizer",
		title: "Neural Forge Adam Optimizer Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "adam", "optimization", "deep-learning"],
		description: "Compute the complete Adam Optimizer update including bias-corrected first and second moments.",
		story: `<p>Deep learning models in Neural Forge rely on the <b>Adam (Adaptive Moment Estimation) Optimizer</b>. At timestep <code>t</code>:
<code>m_t = beta1 * m_{t-1} + (1 - beta1) * g_t</code>
<code>v_t = beta2 * v_{t-1} + (1 - beta2) * g_t^2</code>
Bias corrections: <code>m_hat = m_t / (1 - beta1^t)</code>, <code>v_hat = v_t / (1 - beta2^t)</code>
Parameter update: <code>w_t = w_{t-1} - alpha * m_hat / (sqrt(v_hat) + eps)</code>.</p>`,
		task: "Given D, K timesteps (t=1...K), beta1, beta2, alpha, eps=1e-8, initial w, initial m=0, and initial v=0, compute the final weights w.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>K</code>, and real numbers <code>beta1</code>, <code>beta2</code>, and <code>alpha</code>.</p>
<p>The second line contains <code>D</code> initial weights <code>w</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> gradient values at step t.</p>`,
		outputFormat: `<p>Print the final <code>D</code> weights formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"1 <= K <= 20",
			"0 < beta1 < beta2 < 1",
			"alpha > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(405);
			const tcs = [];

			tcs.push(makeTc(1, "1 1 0.9 0.999 0.001\n0.0\n1.0", "-0.0010", true, "At step 1: m_hat = 1, v_hat = 1. Update = -0.001 * 1 / 1 = -0.0010."));
			tcs.push(makeTc(2, "1 1 0.9 0.999 0.01\n10.0\n-2.0", "10.0100", true, "Negative gradient steps forward."));

			const runAdam = (D: number, K: number, beta1: number, beta2: number, alpha: number, w0: number[], grads: number[][]) => {
				const w = [...w0];
				const m = new Array(D).fill(0);
				const v = new Array(D).fill(0);
				const eps = 1e-8;

				for (let t = 1; t <= K; t++) {
					const g = grads[t - 1];
					for (let d = 0; d < D; d++) {
						m[d] = beta1 * m[d] + (1 - beta1) * g[d];
						v[d] = beta2 * v[d] + (1 - beta2) * g[d] * g[d];
						const mHat = m[d] / (1 - Math.pow(beta1, t));
						const vHat = v[d] / (1 - Math.pow(beta2, t));
						w[d] -= (alpha * mHat) / (Math.sqrt(vHat) + eps);
					}
				}
				return w;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 3);
				const K = rng.nextInt(2, 6);
				const beta1 = 0.9;
				const beta2 = 0.999;
				const alpha = parseFloat(rng.nextFloat(0.001, 0.05).toFixed(3));
				const w0 = rng.floatArray(D, -2, 2, 2);
				const grads = Array.from({ length: K }, () => rng.floatArray(D, -2, 2, 2));
				const w = runAdam(D, K, beta1, beta2, alpha, w0, grads);

				let inStr = `${D} ${K} ${beta1} ${beta2} ${alpha}\n${w0.join(" ")}\n`;
				inStr += grads.map((g) => g.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, w.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 36. Supercollider Learning Rate Decay Schedules
	{
		id: "supercollider-learning-rate-decay",
		title: "Supercollider Learning Rate Decay Schedules",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "learning-rate", "optimization", "deep-learning"],
		description: "Compute the effective learning rate at epoch t under Step Decay, Exponential Decay, and Cosine Annealing.",
		story: `<p>Particle collision classifiers adjust learning rate schedules across training epochs. Given initial learning rate <code>eta_0</code>, decay factor <code>gamma</code>, step size <code>S</code>, and total epochs <code>T</code>, calculate:
1. <b>Step Decay</b>: <code>eta_0 * gamma^(floor(t / S))</code>
2. <b>Exponential Decay</b>: <code>eta_0 * exp(-gamma * t)</code>
3. <b>Cosine Annealing</b>: <code>eta_0 * 0.5 * (1 + cos(pi * t / T))</code>.</p>`,
		task: "Given eta_0, gamma, S, T, and epoch t, output the learning rate under Step, Exponential, and Cosine schedules.",
		inputFormat: `<p>A single line containing real numbers <code>eta_0</code> and <code>gamma</code>, and integers <code>S</code>, <code>T</code>, and <code>t</code>.</p>`,
		outputFormat: `<p>Print three real numbers: <code>step_lr exp_lr cosine_lr</code> with 6 decimal places.</p>`,
		constraints: formatConstraints([
			"0 < eta_0 <= 1.0",
			"0 < gamma < 1.0",
			"1 <= S <= T <= 1000",
			"0 <= t <= T"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(406);
			const tcs = [];

			tcs.push(makeTc(1, "0.1 0.5 10 100 0", "0.100000 0.100000 0.100000", true, "At epoch 0, all schedules equal eta_0 = 0.1."));
			tcs.push(makeTc(2, "0.1 0.5 10 100 100", "0.000098 0.000000 0.000000", true, "At final epoch T=100, cosine annealing drops to 0."));

			const evalSchedules = (eta0: number, gamma: number, S: number, T: number, t: number) => {
				const step = eta0 * Math.pow(gamma, Math.floor(t / S));
				const exp = eta0 * Math.exp(-gamma * t);
				const cosine = eta0 * 0.5 * (1 + Math.cos((Math.PI * t) / T));
				return { step, exp, cosine };
			};

			for (let i = 3; i <= 100; i++) {
				const eta0 = parseFloat(rng.nextFloat(0.01, 0.5).toFixed(3));
				const gamma = parseFloat(rng.nextFloat(0.1, 0.8).toFixed(2));
				const S = rng.nextInt(5, 20);
				const T = rng.nextInt(50, 200);
				const t = rng.nextInt(0, T);
				const res = evalSchedules(eta0, gamma, S, T, t);
				const outStr = `${res.step.toFixed(6)} ${res.exp.toFixed(6)} ${res.cosine.toFixed(6)}`;
				tcs.push(makeTc(i, `${eta0} ${gamma} ${S} ${T} ${t}`, outStr));
			}

			return tcs;
		},
	},

	// 37. Deep Mine Backtracking Line Search
	{
		id: "deep-mine-backtracking-line-search",
		title: "Deep Mine Backtracking Line Search",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "line-search", "armijo", "optimization"],
		description: "Find the step size alpha satisfying the Armijo condition f(x + alpha*p) <= f(x) + c1*alpha*grad^T*p.",
		story: `<p>Geotechnical drill simulators optimize shaft boring angles via line search. Starting with step size <code>alpha = 1.0</code>, it repeatedly contracts <code>alpha := alpha * rho</code> (where <code>0 < rho < 1</code>) until the <b>Armijo Sufficient Decrease condition</b> is satisfied: <code>f(x + alpha*p) <= f_0 + c1 * alpha * directional_deriv</code>.</p>`,
		task: "Given f_0, directional_derivative (< 0), contraction rho, constant c1, and an array of trial function values for alpha = rho^0, rho^1, rho^2, ..., find the first alpha that satisfies the Armijo condition.",
		inputFormat: `<p>The first line contains real numbers <code>f_0</code>, <code>d_deriv</code>, <code>rho</code>, <code>c1</code>, and integer <code>M</code> (trial count).</p>
<p>The second line contains <code>M</code> real numbers: trial function values <code>f_vals[0] ... f_vals[M-1]</code> for <code>alpha = rho^0, rho^1, ...</code></p>`,
		outputFormat: `<p>Print the selected step size <code>alpha</code> formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= M <= 20",
			"0 < rho < 1",
			"0 < c1 < 1",
			"d_deriv < 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(407);
			const tcs = [];

			tcs.push(makeTc(1, "10.0 -4.0 0.5 0.1 3\n11.0 9.0 8.0", "0.5000", true, "alpha=1: 11 <= 10 - 0.4=9.6 (False). alpha=0.5: 9.0 <= 10 - 0.1*0.5*4=9.8 (True). alpha=0.5000 selected."));
			tcs.push(makeTc(2, "5.0 -2.0 0.5 0.1 2\n4.5 4.0", "1.0000", true, "alpha=1: 4.5 <= 5 - 0.2=4.8 (True). Immediate satisfaction at alpha=1.0000."));

			const solveArmijo = (f0: number, dDeriv: number, rho: number, c1: number, fVals: number[]): number => {
				let alpha = 1.0;
				for (let k = 0; k < fVals.length; k++) {
					const required = f0 + c1 * alpha * dDeriv;
					if (fVals[k] <= required) return alpha;
					alpha *= rho;
				}
				return alpha;
			};

			for (let i = 3; i <= 100; i++) {
				const f0 = parseFloat(rng.nextFloat(5, 50).toFixed(1));
				const dDeriv = -parseFloat(rng.nextFloat(1, 10).toFixed(1));
				const rho = 0.5;
				const c1 = 0.1;
				const M = rng.nextInt(3, 8);
				const satisfyIdx = rng.nextInt(0, M - 1);
				const fVals: number[] = [];
				let a = 1.0;
				for (let k = 0; k < M; k++) {
					const req = f0 + c1 * a * dDeriv;
					if (k < satisfyIdx) {
						fVals.push(parseFloat((req + rng.nextFloat(0.5, 3)).toFixed(2)));
					} else {
						fVals.push(parseFloat((req - rng.nextFloat(0.1, 1)).toFixed(2)));
					}
					a *= rho;
				}
				const ans = solveArmijo(f0, dDeriv, rho, c1, fVals);
				let inStr = `${f0} ${dDeriv} ${rho} ${c1} ${M}\n${fVals.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(ans)));
			}

			return tcs;
		},
	},

	// 38. Orbital Docking BFGS Curvature Condition
	{
		id: "orbital-docking-l-bfgs-two-loop",
		title: "Orbital Docking BFGS Curvature Condition",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "bfgs", "optimization", "quasi-newton"],
		description: "Compute the Quasi-Newton curvature condition dot(s_k, y_k) and verify positive definiteness.",
		story: `<p>Autonomous spacecraft docking thrusters use the BFGS Quasi-Newton optimizer. For the inverse Hessian approximation to remain positive definite, the <b>Curvature Condition</b> must hold: <code>s_k^T * y_k > 0</code>, where displacement vector <code>s_k = x_{k+1} - x_k</code> and gradient change vector <code>y_k = grad_{k+1} - grad_k</code>.</p>`,
		task: "Given x_k, x_{k+1}, grad_k, and grad_{k+1}, compute dot(s_k, y_k) and print 'VALID' if > 0, else 'INVALID'.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The next 4 lines contain <code>D</code> real numbers each: <code>x_k</code>, <code>x_{k+1}</code>, <code>grad_k</code>, and <code>grad_{k+1}</code>.</p>`,
		outputFormat: `<p>Print a single line: <code>dot_product STATUS</code> where dot_product has 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(408);
			const tcs = [];

			tcs.push(makeTc(1, "2\n0 0\n1 1\n0 0\n2 2", "4.0000 VALID", true, "s=[1,1], y=[2,2]. dot = 1*2 + 1*2 = 4 > 0 -> VALID."));
			tcs.push(makeTc(2, "1\n0\n1\n2\n1", "-1.0000 INVALID", true, "s=[1], y=[-1]. dot = -1 < 0 -> INVALID."));

			const evalCurvature = (D: number, xk: number[], xk1: number[], gk: number[], gk1: number[]) => {
				let dot = 0;
				for (let d = 0; d < D; d++) {
					const s = xk1[d] - xk[d];
					const y = gk1[d] - gk[d];
					dot += s * y;
				}
				const status = dot > 0 ? "VALID" : "INVALID";
				return { dot, status };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 5);
				const xk = rng.floatArray(D, -5, 5, 2);
				const xk1 = xk.map((x) => parseFloat((x + rng.nextFloat(-2, 2)).toFixed(2)));
				const gk = rng.floatArray(D, -5, 5, 2);
				const gk1 = gk.map((g) => parseFloat((g + rng.nextFloat(-2, 2)).toFixed(2)));
				const res = evalCurvature(D, xk, xk1, gk, gk1);
				let inStr = `${D}\n${xk.join(" ")}\n${xk1.join(" ")}\n${gk.join(" ")}\n${gk1.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${f4(res.dot)} ${res.status}`));
			}

			return tcs;
		},
	},

	// 39. Quantum Annealer Gradient Norm Clipping
	{
		id: "quantum-annealer-gradient-clipping",
		title: "Quantum Annealer Gradient Norm Clipping",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "gradient-clipping", "deep-learning", "optimization"],
		description: "Clip gradient vector norm to threshold C: g_clipped = g * (C / max(||g||_2, C)).",
		story: `<p>Deep recurrent neural networks frequently suffer from exploding gradients. Gradient Norm Clipping stabilizes training by rescaling the entire gradient vector <code>g</code> if its L2 norm <code>||g||_2</code> exceeds max norm threshold <code>C</code>: <code>g_clipped = (C / ||g||_2) * g</code>.</p>`,
		task: "Given max norm C and D-dimensional gradient vector g, compute the clipped gradient vector.",
		inputFormat: `<p>The first line contains integer <code>D</code> and real number <code>C</code> (&gt; 0).</p>
<p>The second line contains <code>D</code> real numbers representing gradient <code>g</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> clipped values formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 100",
			"C > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(409);
			const tcs = [];

			tcs.push(makeTc(1, "2 5.0\n3.0 4.0", "3.0000 4.0000", true, "Norm is sqrt(3^2 + 4^2) = 5.0 <= C=5.0. No clipping needed."));
			tcs.push(makeTc(2, "2 2.5\n3.0 4.0", "1.5000 2.0000", true, "Norm 5.0 > 2.5. Rescaled by 2.5 / 5.0 = 0.5. [1.5, 2.0]."));

			const clipGrad = (g: number[], C: number): number[] => {
				let normSq = 0;
				for (const val of g) normSq += val * val;
				const norm = Math.sqrt(normSq);
				if (norm <= C || norm === 0) return [...g];
				const factor = C / norm;
				return g.map((v) => v * factor);
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 6);
				const C = parseFloat(rng.nextFloat(2.0, 10.0).toFixed(1));
				const g = rng.floatArray(D, -15, 15, 2);
				const clipped = clipGrad(g, C);
				tcs.push(makeTc(i, `${D} ${C}\n${g.join(" ")}`, clipped.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 40. Nano-Device Subgradient Descent Step
	{
		id: "nano-device-subgradient-descent",
		title: "Nano-Device Subgradient Descent Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "subgradient", "optimization", "convex"],
		description: "Compute the subgradient update for non-smooth L1 loss |w - target| with step size alpha.",
		story: `<p>Ultra-low-power microchips optimize a non-smooth L1 loss: <code>L(w) = sum |w_j - target_j|</code>. Because absolute value is non-differentiable at 0, the optimizer uses a <b>subgradient</b>: <code>g_j = 1</code> if <code>w_j > target_j</code>, <code>-1</code> if <code>w_j < target_j</code>, and <code>0</code> if <code>w_j == target_j</code>. The update is <code>w := w - alpha * g</code>.</p>`,
		task: "Given dimension D, step size alpha, current weights w, and target vector, compute the updated weights after one subgradient step.",
		inputFormat: `<p>The first line contains integer <code>D</code> and real number <code>alpha</code>.</p>
<p>The second line contains <code>D</code> current weights <code>w</code>.</p>
<p>The third line contains <code>D</code> target values.</p>`,
		outputFormat: `<p>Print the <code>D</code> updated weights formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 20",
			"alpha > 0"
		]),
		points: 110,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(410);
			const tcs = [];

			tcs.push(makeTc(1, "3 0.5\n2.0 0.0 -1.0\n1.0 0.0 2.0", "1.5000 0.0000 -0.5000", true, "w1>target1 (g=1, w1=1.5). w2==target2 (g=0, w2=0). w3<target3 (g=-1, w3=-0.5)."));
			tcs.push(makeTc(2, "1 1.0\n5.0\n5.0", "5.0000", true, "Exact match subgradient is 0."));

			const subgradStep = (w: number[], targets: number[], alpha: number): number[] => {
				return w.map((val, idx) => {
					const t = targets[idx];
					let g = 0;
					if (val > t) g = 1;
					else if (val < t) g = -1;
					return val - alpha * g;
				});
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 6);
				const alpha = parseFloat(rng.nextFloat(0.1, 1.0).toFixed(2));
				const w = rng.floatArray(D, -10, 10, 2);
				const targets = rng.floatArray(D, -10, 10, 2);
				const updated = subgradStep(w, targets, alpha);
				tcs.push(makeTc(i, `${D} ${alpha}\n${w.join(" ")}\n${targets.join(" ")}`, updated.map(f4).join(" ")));
			}

			return tcs;
		},
	},
];
