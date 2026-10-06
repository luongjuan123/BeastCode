import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const deepLearningProblems: MLProblemDefinition[] = [
	// 57. Perceptron Activation Functions Zoo
	{
		id: "perceptron-activation-functions-zoo",
		title: "Perceptron Activation Functions Zoo",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "activation-functions", "neural-networks"],
		description: "Compute standard neural activation functions: sigmoid, tanh, relu, leaky_relu, and softmax.",
		story: `<p>A high-throughput inference engine at <b>NeuroCore Systems</b> dynamically activates neurons across heterogeneous hardware accelerators. To ensure cross-platform precision, the runtime must reliably execute fundamental activation functions:
<ul>
  <li><code>sigmoid</code>: <code>1 / (1 + exp(-x))</code></li>
  <li><code>tanh</code>: <code>tanh(x)</code></li>
  <li><code>relu</code>: <code>max(0, x)</code></li>
  <li><code>leaky_relu</code>: <code>x if x >= 0 else 0.01 * x</code></li>
  <li><code>softmax</code>: <code>exp(x_i - max(x)) / sum(exp(x_j - max(x)))</code></li>
</ul>
Numerically stable softmax subtracts the maximum value in the array before exponentiation.</p>`,
		task: "Given the activation name, array length N, and N numbers, compute and print the activated vector.",
		inputFormat: `<p>The first line contains a string: <code>sigmoid</code>, <code>tanh</code>, <code>relu</code>, <code>leaky_relu</code>, or <code>softmax</code>.</p>
<p>The second line contains integer <code>N</code>.</p>
<p>The third line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N</code> resulting values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"-50.0 <= x_i <= 50.0",
			"activation is one of: sigmoid, tanh, relu, leaky_relu, softmax"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(701);
			const tcs = [];

			tcs.push(makeTc(1, "sigmoid\n3\n0 2 -2", "0.5000 0.8808 0.1192", true, "Sigmoid of 0 is 0.5."));
			tcs.push(makeTc(2, "relu\n3\n-5 0 5", "0.0000 0.0000 5.0000", true, "ReLU clamps negatives to 0."));
			tcs.push(makeTc(3, "softmax\n3\n1 2 3", "0.0900 0.2447 0.6652", true, "Softmax normalizes probabilities."));

			const evalAct = (act: string, arr: number[]): string => {
				if (act === "sigmoid") return arr.map((x) => f4(1 / (1 + Math.exp(-x)))).join(" ");
				if (act === "tanh") return arr.map((x) => f4(Math.tanh(x))).join(" ");
				if (act === "relu") return arr.map((x) => f4(Math.max(0, x))).join(" ");
				if (act === "leaky_relu") return arr.map((x) => f4(x >= 0 ? x : 0.01 * x)).join(" ");
				if (act === "softmax") {
					const max = Math.max(...arr);
					const exps = arr.map((x) => Math.exp(x - max));
					const sum = exps.reduce((a, b) => a + b, 0);
					return exps.map((e) => f4(e / sum)).join(" ");
				}
				return "";
			};

			const acts = ["sigmoid", "tanh", "relu", "leaky_relu", "softmax"];
			for (let i = 4; i <= 100; i++) {
				const act = acts[i % acts.length];
				const N = rng.nextInt(2, 10);
				const arr = rng.floatArray(N, -10, 10, 2);
				const out = evalAct(act, arr);
				tcs.push(makeTc(i, `${act}\n${N}\n${arr.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 58. Deep Cortex Multilayer Forward Pass
	{
		id: "deep-cortex-multilayer-forward-pass",
		title: "Deep Cortex Multilayer Forward Pass",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "forward-pass", "neural-networks"],
		description: "Compute the forward propagation of a fully connected dense layer with ReLU activation: a = ReLU(W * x + b).",
		story: `<p>Neuromorphic robotics laboratory <b>Deep Cortex</b> is verifying edge firmware for a bionic prosthetic limb. Sensor readings vector <code>x in R^D</code> is fed into a dense hidden layer with weight matrix <code>W in R^(M x D)</code> and bias vector <code>b in R^M</code>. The pre-activation is <code>z = W * x + b</code> and the final activation is <code>a = max(0, z)</code> (element-wise ReLU).</p>`,
		task: "Given dimensions D and M, input vector x, weight matrix W, and bias vector b, compute the activated output vector a.",
		inputFormat: `<p>The first line contains integers <code>D</code> (input dimension) and <code>M</code> (output units).</p>
<p>The second line contains <code>D</code> real numbers representing vector <code>x</code>.</p>
<p>The next <code>M</code> lines each contain <code>D</code> real numbers representing the rows of matrix <code>W</code>.</p>
<p>The last line contains <code>M</code> real numbers representing bias vector <code>b</code>.</p>`,
		outputFormat: `<p>Print the <code>M</code> activated values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 20",
			"1 <= M <= 20",
			"-20.0 <= values <= 20.0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(702);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 2\n1 0\n0 1\n0.5 -1.5", "1.5000 0.5000", true, "z = [1*1+0.5, 2*1-1.5] = [1.5, 0.5]."));
			tcs.push(makeTc(2, "2 1\n1 -1\n2 3\n-5", "0.0000", true, "z = 2(1)+3(-1)-5 = -6 <= 0 -> ReLU is 0.0000."));

			const forwardDense = (D: number, M: number, x: number[], W: number[][], b: number[]): string => {
				const a: number[] = [];
				for (let i = 0; i < M; i++) {
					let z = b[i];
					for (let j = 0; j < D; j++) z += W[i][j] * x[j];
					a.push(Math.max(0, z));
				}
				return a.map(f4).join(" ");
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 6);
				const M = rng.nextInt(2, 6);
				const x = rng.floatArray(D, -5, 5, 2);
				const W = Array.from({ length: M }, () => rng.floatArray(D, -3, 3, 2));
				const b = rng.floatArray(M, -2, 2, 2);

				const out = forwardDense(D, M, x, W, b);
				let inStr = `${D} ${M}\n${x.join(" ")}\n` + W.map((r) => r.join(" ")).join("\n") + `\n${b.join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 59. Neural Foundry Cross-Entropy Loss
	{
		id: "neural-foundry-cross-entropy-loss",
		title: "Neural Foundry Cross-Entropy Loss",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "loss-function", "cross-entropy"],
		description: "Compute the categorical cross-entropy loss over N predictions and K classes.",
		story: `<p>At <b>Neural Foundry</b>, an automated quality control inspection model classifies manufactured silicon wafers into defective classes. Training loss is tracked using the categorical cross-entropy loss:
<code>L = -1/N * sum_{i=1}^N sum_{k=1}^K y_{ik} * ln(y_hat_{ik} + eps)</code>
where <code>eps = 1e-15</code> prevents numerical instability from taking the logarithm of zero.</p>`,
		task: "Given N samples, K classes, one-hot ground truth labels Y, and predicted probabilities Y_hat, compute the mean cross-entropy loss.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>K</code> (classes).</p>
<p>The next <code>N</code> lines each contain <code>K</code> binary integers (one-hot ground truth).</p>
<p>The next <code>N</code> lines each contain <code>K</code> real numbers (predicted probabilities).</p>`,
		outputFormat: `<p>Print the mean cross-entropy loss with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"2 <= K <= 10",
			"0.0 <= y_hat <= 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(703);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n0.8 0.2\n0.1 0.9", "0.1643", true, "L = -0.5*(ln(0.8) + ln(0.9)) = 0.1643."));
			tcs.push(makeTc(2, "1 3\n0 1 0\n0.1 0.7 0.2", "0.3567", true, "L = -ln(0.7) = 0.3567."));

			const crossEntropy = (N: number, K: number, Y: number[][], YHat: number[][]): number => {
				const eps = 1e-15;
				let total = 0;
				for (let i = 0; i < N; i++) {
					for (let k = 0; k < K; k++) {
						if (Y[i][k] === 1) {
							total -= Math.log(Math.max(YHat[i][k], eps));
						}
					}
				}
				return total / N;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(2, 8);
				const K = rng.nextInt(2, 4);
				const Y: number[][] = [];
				const YHat: number[][] = [];

				for (let n = 0; n < N; n++) {
					const trueK = rng.nextInt(0, K - 1);
					const rowY = new Array(K).fill(0);
					rowY[trueK] = 1;
					Y.push(rowY);

					const rawProbs = rng.floatArray(K, 0.1, 5.0, 2);
					const sum = rawProbs.reduce((a, b) => a + b, 0);
					YHat.push(rawProbs.map((p) => parseFloat((p / sum).toFixed(4))));
				}

				const out = f4(crossEntropy(N, K, Y, YHat));
				let inStr = `${N} ${K}\n` + Y.map((r) => r.join(" ")).join("\n") + "\n" + YHat.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 60. Backprop Gradient Computation Single Layer
	{
		id: "backprop-gradient-computation-single-layer",
		title: "Backprop Gradient Computation Single Layer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "backpropagation", "gradients"],
		description: "Compute weight and bias gradients for a linear dense layer given input x and incoming error delta.",
		story: `<p>Inside an open-source deep learning framework development team, engineers are writing kernel tests for the backward pass of a linear layer <code>z = W * x + b</code>. Given input activation vector <code>x in R^D</code> and incoming backpropagated loss gradient <code>delta = dL/dz in R^M</code>, compute the gradients:
<ul>
  <li><code>dL/dW = delta * x^T</code> (an <code>M x D</code> matrix where <code>(dL/dW)_{ij} = delta_i * x_j</code>)</li>
  <li><code>dL/db = delta</code> (an <code>M</code>-dimensional vector)</li>
</ul></p>`,
		task: "Given D, M, input vector x, and delta gradient, compute and print the dL/dW gradient matrix followed by dL/db.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>M</code>.</p>
<p>The second line contains <code>D</code> real numbers representing <code>x</code>.</p>
<p>The third line contains <code>M</code> real numbers representing <code>delta</code>.</p>`,
		outputFormat: `<p>Print <code>M</code> lines representing matrix <code>dL/dW</code> with 4 decimals.</p>
<p>Print the last line containing <code>M</code> values representing <code>dL/db</code> with 4 decimals.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"1 <= M <= 10",
			"-20.0 <= values <= 20.0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(704);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 2\n0.5 -1", "0.5000 1.0000\n-1.0000 -2.0000\n0.5000 -1.0000", true, "dL/dW = delta x^T, dL/db = delta."));
			tcs.push(makeTc(2, "1 2\n3\n2 4", "6.0000\n12.0000\n2.0000 4.0000", true, "1D input vector broadcast against delta."));

			const computeGradients = (D: number, M: number, x: number[], delta: number[]): string[] => {
				const lines: string[] = [];
				for (let i = 0; i < M; i++) {
					const row = [];
					for (let j = 0; j < D; j++) {
						row.push(f4(delta[i] * x[j]));
					}
					lines.push(row.join(" "));
				}
				lines.push(delta.map(f4).join(" "));
				return lines;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 5);
				const M = rng.nextInt(1, 5);
				const x = rng.floatArray(D, -5, 5, 2);
				const delta = rng.floatArray(M, -3, 3, 2);

				const out = computeGradients(D, M, x, delta);
				const inStr = `${D} ${M}\n${x.join(" ")}\n${delta.join(" ")}`;
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 61. Dropout Regularization Mask Generator
	{
		id: "dropout-regularization-mask-generator",
		title: "Dropout Regularization Mask Generator",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "regularization", "dropout"],
		description: "Apply inverted dropout to an activation vector using a binary keep mask and probability p.",
		story: `<p>During the training of transformer models at <b>Aura AI</b>, <b>Inverted Dropout</b> is applied to prevent co-adaptation of features. To keep the expected sum of activations unchanged during training, surviving elements are scaled by <code>1 / (1 - p)</code>, where <code>p in [0, 1)</code> is the dropout probability:
<code>y_i = (x_i * mask_i) / (1 - p)</code>, where <code>mask_i in {0, 1}</code>.</p>`,
		task: "Given length N, dropout probability p, input activations x, and binary mask array, compute the scaled output activations.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>p</code>.</p>
<p>The second line contains <code>N</code> real numbers representing <code>x</code>.</p>
<p>The third line contains <code>N</code> binary integers (0 or 1) representing the <code>mask</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> resulting values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"0.0 <= p < 1.0",
			"mask_i in {0, 1}"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(705);
			const tcs = [];

			tcs.push(makeTc(1, "4 0.5\n2 4 6 8\n1 0 1 0", "4.0000 0.0000 12.0000 0.0000", true, "Scale factor = 1/(1-0.5) = 2. Surviving values doubled."));
			tcs.push(makeTc(2, "2 0.2\n10 20\n1 1", "12.5000 25.0000", true, "Scale factor = 1/0.8 = 1.25."));

			const applyDropout = (N: number, p: number, x: number[], mask: number[]): string => {
				const scale = 1 / (1 - p);
				return x.map((val, idx) => f4(mask[idx] === 1 ? val * scale : 0)).join(" ");
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const p = rng.choice([0.1, 0.2, 0.25, 0.5, 0.75]);
				const x = rng.floatArray(N, -10, 10, 2);
				const mask = Array.from({ length: N }, () => (rng.next() > p ? 1 : 0));
				if (mask.every((m) => m === 0)) mask[0] = 1;

				const out = applyDropout(N, p, x, mask);
				const inStr = `${N} ${p}\n${x.join(" ")}\n${mask.join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 62. Batch Normalization Forward Step
	{
		id: "batch-normalization-forward-step",
		title: "Batch Normalization Forward Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "batch-norm", "normalization"],
		description: "Compute the forward batch normalization transformation: y = gamma * (x - mu)/sqrt(var + eps) + beta.",
		story: `<p>To accelerate convergence in deep convolutional networks, <b>Spectra Vision</b> integrates <b>Batch Normalization</b>. For a mini-batch of scalar activations <code>x = [x_1, ..., x_N]</code>, the layer computes:
<ul>
  <li>Mini-batch mean: <code>mu = 1/N * sum(x_i)</code></li>
  <li>Mini-batch variance: <code>var = 1/N * sum((x_i - mu)^2)</code></li>
  <li>Normalized activations: <code>x_hat_i = (x_i - mu) / sqrt(var + eps)</code> with <code>eps = 1e-5</code></li>
  <li>Affine transform: <code>y_i = gamma * x_hat_i + beta</code></li>
</ul></p>`,
		task: "Given N, gamma, beta, and batch activations x, compute and print the transformed outputs y.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real numbers <code>gamma</code> and <code>beta</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N</code> transformed values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"-10.0 <= gamma, beta <= 10.0",
			"eps = 1e-5"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(706);
			const tcs = [];

			tcs.push(makeTc(1, "2 1.0 0.0\n0 2", "-1.0000 1.0000", true, "mu=1, var=1. Normalizes to -1 and 1."));
			tcs.push(makeTc(2, "3 2.0 1.0\n10 20 30", "-1.4495 1.0000 3.4495", true, "Scaled by gamma=2 and shifted by beta=1."));

			const batchNorm = (N: number, gamma: number, beta: number, x: number[]): string => {
				const eps = 1e-5;
				const mu = x.reduce((a, b) => a + b, 0) / N;
				const variance = x.reduce((a, b) => a + (b - mu) ** 2, 0) / N;
				const denom = Math.sqrt(variance + eps);
				return x.map((val) => f4(gamma * ((val - mu) / denom) + beta)).join(" ");
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const gamma = parseFloat(rng.nextFloat(0.5, 3.0).toFixed(2));
				const beta = parseFloat(rng.nextFloat(-2.0, 2.0).toFixed(2));
				const x = rng.floatArray(N, -15, 15, 2);
				x[0] += 5; // ensure variance > 0

				const out = batchNorm(N, gamma, beta, x);
				tcs.push(makeTc(i, `${N} ${gamma} ${beta}\n${x.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 63. Layer Normalization Transformer Step
	{
		id: "layer-normalization-transformer-step",
		title: "Layer Normalization Transformer Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "transformers", "layer-norm"],
		description: "Compute Layer Normalization across the feature dimension for an embedding vector.",
		story: `<p>Inside modern Large Language Model architecture at <b>OmniLexicon</b>, <b>Layer Normalization</b> normalizes across the feature channel dimension <code>D</code> for each token representation independently:
<code>mu = 1/D * sum(x_d)</code>
<code>var = 1/D * sum((x_d - mu)^2)</code>
<code>y_d = g_d * (x_d - mu) / sqrt(var + 1e-5) + b_d</code>
where <code>g</code> is a learnable gain vector and <code>b</code> is a learnable bias vector.</p>`,
		task: "Given feature dimension D, token embedding x, gain vector g, and bias vector b, compute the layer-normalized vector y.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing vector <code>x</code>.</p>
<p>The third line contains <code>D</code> real numbers representing gain <code>g</code>.</p>
<p>The fourth line contains <code>D</code> real numbers representing bias <code>b</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> normalized values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= D <= 50",
			"-20.0 <= values <= 20.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(707);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 3\n1 1\n0 0", "-1.0000 1.0000", true, "mu=2, var=1. Normalized to -1 and 1."));
			tcs.push(makeTc(2, "3\n10 10 10\n1 1 1\n0 0 0", "0.0000 0.0000 0.0000", true, "Constant vector has zero variance."));

			const layerNorm = (D: number, x: number[], g: number[], b: number[]): string => {
				const eps = 1e-5;
				const mu = x.reduce((s, v) => s + v, 0) / D;
				const variance = x.reduce((s, v) => s + (v - mu) ** 2, 0) / D;
				const denom = Math.sqrt(variance + eps);
				return x.map((v, i) => f4(g[i] * ((v - mu) / denom) + b[i])).join(" ");
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(3, 10);
				const x = rng.floatArray(D, -10, 10, 2);
				x[0] += 3;
				const g = rng.floatArray(D, 0.5, 2.0, 2);
				const b = rng.floatArray(D, -1.0, 1.0, 2);

				const out = layerNorm(D, x, g, b);
				const inStr = `${D}\n${x.join(" ")}\n${g.join(" ")}\n${b.join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 64. Convolution 1D Feature Extractor
	{
		id: "convolution-1d-feature-extractor",
		title: "Convolution 1D Feature Extractor",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "convolution", "signal-processing"],
		description: "Compute 1D discrete valid convolution of an input signal with a kernel filter.",
		story: `<p>An acoustic anomaly detector at <b>AeroSonics</b> processes high-frequency engine vibration waveforms. To extract harmonic resonance features, raw telemetry is processed by a 1D Convolutional Neural Network layer with stride 1 and valid padding (no padding). For input <code>x</code> of length <code>L</code> and kernel <code>k</code> of length <code>K</code> (<code>K <= L</code>):
<code>y[i] = sum_{j=0}^{K-1} x[i + j] * k[j]</code> for <code>i = 0, ..., L - K</code>.</p>`,
		task: "Given L, K, signal x, and kernel k, compute the resulting feature map of length L - K + 1.",
		inputFormat: `<p>The first line contains integers <code>L</code> (signal length) and <code>K</code> (kernel length).</p>
<p>The second line contains <code>L</code> real numbers representing signal <code>x</code>.</p>
<p>The third line contains <code>K</code> real numbers representing kernel <code>k</code>.</p>`,
		outputFormat: `<p>Print the <code>L - K + 1</code> convoluted values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= L <= 100",
			"-50.0 <= x_i, k_i <= 50.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(708);
			const tcs = [];

			tcs.push(makeTc(1, "4 2\n1 2 3 4\n1 -1", "-1.0000 -1.0000 -1.0000", true, "Finite difference: [1-2, 2-3, 3-4]."));
			tcs.push(makeTc(2, "3 3\n2 4 6\n0.5 0.5 0.5", "6.0000", true, "Averaging kernel: 0.5*(2+4+6) = 6.0000."));

			const conv1d = (L: number, K: number, x: number[], k: number[]): string => {
				const outLen = L - K + 1;
				const res: number[] = [];
				for (let i = 0; i < outLen; i++) {
					let sum = 0;
					for (let j = 0; j < K; j++) {
						sum += x[i + j] * k[j];
					}
					res.push(sum);
				}
				return res.map(f4).join(" ");
			};

			for (let i = 3; i <= 100; i++) {
				const L = rng.nextInt(4, 15);
				const K = rng.nextInt(2, Math.min(5, L));
				const x = rng.floatArray(L, -10, 10, 2);
				const k = rng.floatArray(K, -3, 3, 2);

				const out = conv1d(L, K, x, k);
				tcs.push(makeTc(i, `${L} ${K}\n${x.join(" ")}\n${k.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 65. Vision Core 2D Max Pooling
	{
		id: "vision-core-2d-max-pooling",
		title: "Vision Core 2D Max Pooling",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "cnn", "computer-vision"],
		description: "Apply 2D spatial max-pooling with non-overlapping window size P over an H x W feature map.",
		story: `<p>In autonomous vehicle perception pipelines at <b>VisionCore</b>, convolutional activations must be spatially downsampled to ensure translational invariance and reduce memory bandwidth. The network applies non-overlapping <b>2D Max Pooling</b> with pool size <code>P x P</code> and stride <code>P</code> across an <code>H x W</code> feature map (where <code>H</code> and <code>W</code> are divisible by <code>P</code>).</p>`,
		task: "Given H, W, P, and the matrix, compute the downsampled (H/P) x (W/P) matrix.",
		inputFormat: `<p>The first line contains integers <code>H</code>, <code>W</code>, and <code>P</code>.</p>
<p>The next <code>H</code> lines each contain <code>W</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>H/P</code> lines, each containing <code>W/P</code> real numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= H, W <= 50",
			"2 <= P <= 5",
			"H % P == 0 and W % P == 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(709);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 2\n1 3\n4 2", "4.0000", true, "Max of 2x2 grid is 4."));
			tcs.push(makeTc(2, "4 4 2\n1 2 5 6\n3 4 7 8\n9 1 3 2\n0 5 4 6", "4.0000 8.0000\n9.0000 6.0000", true, "2x2 pool windows downsample to 2x2 grid."));

			const maxPool2d = (H: number, W: number, P: number, mat: number[][]): string[] => {
				const outH = H / P;
				const outW = W / P;
				const result: string[] = [];

				for (let oh = 0; oh < outH; oh++) {
					const row: string[] = [];
					for (let ow = 0; ow < outW; ow++) {
						let maxVal = -Infinity;
						for (let ph = 0; ph < P; ph++) {
							for (let pw = 0; pw < P; pw++) {
								const val = mat[oh * P + ph][ow * P + pw];
								if (val > maxVal) maxVal = val;
							}
						}
						row.push(f4(maxVal));
					}
					result.push(row.join(" "));
				}
				return result;
			};

			for (let i = 3; i <= 100; i++) {
				const P = rng.choice([2, 3]);
				const numBlocksH = rng.nextInt(1, 3);
				const numBlocksW = rng.nextInt(1, 3);
				const H = numBlocksH * P;
				const W = numBlocksW * P;

				const mat = Array.from({ length: H }, () => rng.floatArray(W, -20, 20, 1));
				const out = maxPool2d(H, W, P, mat);
				let inStr = `${H} ${W} ${P}\n` + mat.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 66. Self-Attention Scaled Dot-Product
	{
		id: "self-attention-scaled-dot-product",
		title: "Self-Attention Scaled Dot-Product",
		difficulty: "Hard",
		category: "machine-learning",
		tags: ["machine-learning", "deep-learning", "transformers", "attention"],
		description: "Compute scaled dot-product attention: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.",
		story: `<p>At <b>Cortex Frontier</b>, researchers are deploying custom transformer cores. The cornerstone of the transformer architecture is <b>Scaled Dot-Product Attention</b>. Given Query matrix <code>Q in R^(T x D_k)</code>, Key matrix <code>K in R^(T x D_k)</code>, and Value matrix <code>V in R^(T x D_v)</code>:
<ol>
  <li>Compute raw attention scores: <code>S = (Q * K^T) / sqrt(D_k)</code></li>
  <li>Apply row-wise softmax: <code>A = softmax(S)</code> (using numerical stabilization)</li>
  <li>Compute weighted context representations: <code>O = A * V in R^(T x D_v)</code></li>
</ol></p>`,
		task: "Given token length T, key dimension D_k, and value dimension D_v, followed by matrices Q, K, and V, compute output matrix O.",
		inputFormat: `<p>The first line contains integers <code>T</code>, <code>D_k</code>, and <code>D_v</code>.</p>
<p>The next <code>T</code> lines each contain <code>D_k</code> real numbers representing <code>Q</code>.</p>
<p>The next <code>T</code> lines each contain <code>D_k</code> real numbers representing <code>K</code>.</p>
<p>The next <code>T</code> lines each contain <code>D_v</code> real numbers representing <code>V</code>.</p>`,
		outputFormat: `<p>Print <code>T</code> lines, each containing <code>D_v</code> real numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= T <= 10",
			"1 <= D_k <= 10",
			"1 <= D_v <= 10",
			"-20.0 <= values <= 20.0"
		]),
		points: 200,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(710);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 2\n1 0\n0 1\n1 0\n0 1\n2 3\n4 5", "2.5358 3.5358\n3.4642 4.4642", true, "Scaled dot product attention with identity queries and keys."));

			const attention = (T: number, Dk: number, Dv: number, Q: number[][], K: number[][], V: number[][]): string[] => {
				const sqrtDk = Math.sqrt(Dk);
				// S = Q * K^T / sqrt(Dk)
				const S: number[][] = [];
				for (let i = 0; i < T; i++) {
					const row: number[] = [];
					for (let j = 0; j < T; j++) {
						let dot = 0;
						for (let k = 0; k < Dk; k++) dot += Q[i][k] * K[j][k];
						row.push(dot / sqrtDk);
					}
					S.push(row);
				}

				// Softmax row-wise
				const A: number[][] = [];
				for (let i = 0; i < T; i++) {
					const maxVal = Math.max(...S[i]);
					const exps = S[i].map((s) => Math.exp(s - maxVal));
					const sumExp = exps.reduce((a, b) => a + b, 0);
					A.push(exps.map((e) => e / sumExp));
				}

				// O = A * V
				const O: string[] = [];
				for (let i = 0; i < T; i++) {
					const row: string[] = [];
					for (let j = 0; j < Dv; j++) {
						let val = 0;
						for (let t = 0; t < T; t++) val += A[i][t] * V[t][j];
						row.push(f4(val));
					}
					O.push(row.join(" "));
				}
				return O;
			};

			for (let i = 2; i <= 100; i++) {
				const T = rng.nextInt(2, 4);
				const Dk = rng.nextInt(2, 3);
				const Dv = rng.nextInt(2, 3);

				const Q = Array.from({ length: T }, () => rng.floatArray(Dk, -3, 3, 2));
				const K = Array.from({ length: T }, () => rng.floatArray(Dk, -3, 3, 2));
				const V = Array.from({ length: T }, () => rng.floatArray(Dv, -5, 5, 2));

				const out = attention(T, Dk, Dv, Q, K, V);
				let inStr = `${T} ${Dk} ${Dv}\n` +
					Q.map((r) => r.join(" ")).join("\n") + "\n" +
					K.map((r) => r.join(" ")).join("\n") + "\n" +
					V.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},
];
