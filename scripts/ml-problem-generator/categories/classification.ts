import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const classificationProblems: MLProblemDefinition[] = [
	// 11. Cyber Sentinel Malware Logistic Regression
	{
		id: "cyber-sentinel-malware-logistic",
		title: "Cyber Sentinel Malware Logistic Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "logistic-regression", "sigmoid", "classification"],
		description: "Compute the sigmoid activation probability P(y=1|x) = 1 / (1 + exp(-z)) and predicted class label.",
		story: `<p>A cybersecurity defense network detects malicious network payloads. Given learned model weights <code>w[1]...w[D]</code> and bias <code>b</code>, the model computes logit <code>z = b + sum(w_j * x_j)</code> and predicted malware probability <code>p = 1 / (1 + exp(-z))</code>. If <code>p >= 0.5</code>, the packet is flagged as MALWARE (1), otherwise BENIGN (0).</p>`,
		task: "Given model parameters [b, w] and T test packet feature vectors, output the predicted probability and binary classification (0 or 1) for each packet.",
		inputFormat: `<p>The first line contains integers <code>D</code> (dimension) and <code>T</code> (number of test instances).</p>
<p>The second line contains <code>D + 1</code> real numbers: <code>b w[1] ... w[D]</code>.</p>
<p>The next <code>T</code> lines each contain <code>D</code> real numbers representing packet features.</p>`,
		outputFormat: `<p>Print <code>T</code> lines, each containing <code>probability prediction</code> where probability has 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"1 <= T <= 50"
		]),
		points: 130,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(201);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n0.0 1.0 1.0\n0.0 0.0\n1.0 1.0", "0.5000 1\n0.8808 1", true, "z=0 -> p=0.5 (class 1). z=2 -> p=0.8808 (class 1)."));
			tcs.push(makeTc(2, "1 1\n-2.0 1.0\n0.0", "0.1192 0", true, "z=-2 -> p=0.1192 (class 0)."));

			const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(1, 4);
				const T = rng.nextInt(2, 10);
				const b = parseFloat(rng.nextFloat(-3, 3).toFixed(2));
				const w = rng.floatArray(D, -2, 2, 2);
				const tests: number[][] = [];
				const outs: string[] = [];

				for (let t = 0; t < T; t++) {
					const x = rng.floatArray(D, -3, 3, 2);
					tests.push(x);
					let z = b;
					for (let d = 0; d < D; d++) z += w[d] * x[d];
					const p = sigmoid(z);
					const label = p >= 0.5 ? 1 : 0;
					outs.push(`${f4(p)} ${label}`);
				}

				let inStr = `${D} ${T}\n${b} ${w.join(" ")}\n`;
				inStr += tests.map((row) => row.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outs.join("\n")));
			}

			return tcs;
		},
	},

	// 12. Astral Spectral Star KNN Classifier
	{
		id: "astral-spectral-star-knn",
		title: "Astral Spectral Star KNN Classifier",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "knn", "classification", "euclidean-distance"],
		description: "Classify unseen astronomical spectra using k-Nearest Neighbors with majority voting.",
		story: `<p>Spectroscopic telescopes classify newly discovered stars into spectral types (Class 0: Red Dwarf, Class 1: Main Sequence, Class 2: Blue Giant). Using a training database of labeled stars, predict the class of query stars using the <b>k-Nearest Neighbors</b> algorithm with Euclidean distance.</p>`,
		task: "Given N training examples (x_1, ..., x_D, class_id), integer K, and a query point q, output the majority class. Break ties by choosing the class of the closest neighbor among tied classes.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and <code>K</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers followed by integer <code>class_id</code>.</p>
<p>The last line contains <code>D</code> real numbers: query point <code>q</code>.</p>`,
		outputFormat: `<p>Print the predicted integer <code>class_id</code>.</p>`,
		constraints: formatConstraints([
			"1 <= K <= N <= 100",
			"1 <= D <= 10",
			"class_id in {0, 1, 2}"
		]),
		points: 140,
		customCheckerType: "exact",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(202);
			const tcs = [];

			tcs.push(makeTc(1, "4 2 3\n0 0 0\n0 1 0\n1 0 1\n10 10 2\n0.1 0.1", "0", true, "Nearest 3 neighbors are at (0,0)[0], (0,1)[0], (1,0)[1]. Majority class 0 wins."));
			tcs.push(makeTc(2, "2 1 1\n1 0\n5 1\n2", "0", true, "1-NN query closest to (1, 0)."));

			const solveKNN = (N: number, D: number, K: number, data: { x: number[]; c: number }[], q: number[]): number => {
				const dists = data.map((item) => {
					let sumSq = 0;
					for (let d = 0; d < D; d++) sumSq += (item.x[d] - q[d]) ** 2;
					return { d: Math.sqrt(sumSq), c: item.c };
				});
				dists.sort((a, b) => a.d - b.d);
				const topK = dists.slice(0, K);
				const votes: Record<number, number> = {};
				for (const item of topK) votes[item.c] = (votes[item.c] || 0) + 1;

				let maxVote = -1;
				let bestClass = -1;
				for (const cStr of Object.keys(votes)) {
					const c = parseInt(cStr, 10);
					const v = votes[c];
					if (v > maxVote) {
						maxVote = v;
						bestClass = c;
					} else if (v === maxVote) {
						// tie-break by closest appearance in topK
						const firstA = topK.findIndex((item) => item.c === bestClass);
						const firstB = topK.findIndex((item) => item.c === c);
						if (firstB < firstA) bestClass = c;
					}
				}
				return bestClass;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(6, 25);
				const D = rng.nextInt(2, 3);
				const K = rng.nextInt(1, 5);
				const data: { x: number[]; c: number }[] = [];
				for (let n = 0; n < N; n++) {
					data.push({ x: rng.floatArray(D, -10, 10, 2), c: rng.nextInt(0, 2) });
				}
				const q = rng.floatArray(D, -10, 10, 2);
				const pred = solveKNN(N, D, K, data, q);

				let inStr = `${N} ${D} ${K}\n`;
				inStr += data.map((d) => `${d.x.join(" ")} ${d.c}`).join("\n") + "\n";
				inStr += q.join(" ");
				tcs.push(makeTc(i, inStr, pred.toString()));
			}

			return tcs;
		},
	},

	// 13. Bio-Pathogen Gaussian Naive Bayes
	{
		id: "bio-pathogen-gaussian-naive-bayes",
		title: "Bio-Pathogen Gaussian Naive Bayes",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "naive-bayes", "classification", "probability"],
		description: "Compute the log posterior probability for binary classes assuming Gaussian feature likelihoods.",
		story: `<p>A viral epidemiology unit uses Gaussian Naive Bayes to screen for pathogen strains (Class 0: Benign, Class 1: Pathogenic). For each class <code>c</code>, each feature <code>j</code> follows a normal distribution with mean <code>mu_cj</code> and population variance <code>sigma2_cj = (1 / N_c) * sum (x_{ij} - mu_cj)^2</code> (with variance floor <code>eps = 1e-6</code>, i.e., <code>max(sigma2_cj, 1e-6)</code>). The class prior is <code>P(c) = N_c / N</code>.</p>`,
		task: "Given training data, compute the unnormalized log-posterior: log(P(c)) + sum(-0.5 * log(2*pi*sigma2_cj) - ((x_j - mu_cj)^2 / (2*sigma2_cj))) for both classes, and output the predicted class (0 or 1). Use population variance with epsilon floor 1e-6.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>D</code> (features).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers followed by binary label <code>c</code> (0 or 1).</p>
<p>The last line contains <code>D</code> real numbers: query instance <code>q</code>.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>The first line: <code>log_post_0 log_post_1</code> (4 decimal places).</p>
<p>The second line: <code>predicted_class</code> (0 or 1).</p>`,
		constraints: formatConstraints([
			"4 <= N <= 100",
			"1 <= D <= 5",
			"Both classes have at least 2 samples",
			"Use population variance: sigma2_cj = (1 / N_c) * sum (x_ij - mu_cj)^2",
			"Variance floor: max(sigma2_cj, 1e-6)"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(203);
			const tcs = [];

			const solveGNB = (N: number, D: number, rows: { x: number[]; c: number }[], q: number[]) => {
				const c0 = rows.filter((r) => r.c === 0);
				const c1 = rows.filter((r) => r.c === 1);
				const prior0 = c0.length / N;
				const prior1 = c1.length / N;

				const getParams = (group: { x: number[] }[]) => {
					const mus = new Array(D).fill(0);
					const vars = new Array(D).fill(0);
					for (let d = 0; d < D; d++) {
						let sum = 0;
						for (const g of group) sum += g.x[d];
						mus[d] = sum / group.length;
						let sVar = 0;
						for (const g of group) sVar += (g.x[d] - mus[d]) ** 2;
						vars[d] = Math.max(sVar / group.length, 1e-6); // variance with epsilon
					}
					return { mus, vars };
				};

				const p0 = getParams(c0);
				const p1 = getParams(c1);

				const logPost = (prior: number, mus: number[], vars: number[]) => {
					let lp = Math.log(prior);
					for (let d = 0; d < D; d++) {
						const v = vars[d];
						lp += -0.5 * Math.log(2 * Math.PI * v) - ((q[d] - mus[d]) ** 2) / (2 * v);
					}
					return lp;
				};

				const lp0 = logPost(prior0, p0.mus, p0.vars);
				const lp1 = logPost(prior1, p1.mus, p1.vars);
				const pred = lp1 > lp0 ? 1 : 0;
				return { lp0, lp1, pred };
			};

			// Sample 1
			const s1Data = [
				{ x: [1, 2], c: 0 }, { x: [2, 3], c: 0 },
				{ x: [8, 9], c: 1 }, { x: [9, 10], c: 1 }
			];
			const s1 = solveGNB(4, 2, s1Data, [1.5, 2.5]);
			tcs.push(makeTc(1, "4 2\n1 2 0\n2 3 0\n8 9 1\n9 10 1\n1.5 2.5", `${f4(s1.lp0)} ${f4(s1.lp1)}\n${s1.pred}`, true, "Query close to class 0 cluster."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(6, 20);
				const D = rng.nextInt(1, 3);
				const rows: { x: number[]; c: number }[] = [];
				for (let n = 0; n < N; n++) {
					const c = n < Math.floor(N / 2) ? 0 : 1;
					const center = c === 0 ? -5 : 5;
					const x = rng.floatArray(D, center - 2, center + 2, 2);
					rows.push({ x, c });
				}
				const q = rng.floatArray(D, -6, 6, 2);
				const res = solveGNB(N, D, rows, q);

				let inStr = `${N} ${D}\n`;
				inStr += rows.map((r) => `${r.x.join(" ")} ${r.c}`).join("\n") + "\n";
				inStr += q.join(" ");
				tcs.push(makeTc(i, inStr, `${f4(res.lp0)} ${f4(res.lp1)}\n${res.pred}`));
			}

			return tcs;
		},
	},

	// 14. Credit Guardian Decision Tree Shannon Entropy
	{
		id: "credit-guardian-decision-tree-entropy",
		title: "Credit Guardian Decision Tree Shannon Entropy",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "decision-trees", "information-theory", "entropy"],
		description: "Compute Shannon Entropy H(S) = -sum(p_i * log2(p_i)) for multi-class loan defaults.",
		story: `<p>A risk governance algorithm at Credit Guardian evaluates loan applicant groupings to build an optimal decision tree. The first step in evaluating a potential node split is calculating the node's <b>Shannon Entropy</b>: <code>H(S) = - sum(p_i * log2(p_i))</code>, with <code>0 * log2(0) = 0</code>.</p>`,
		task: "Given the counts of K classes at a decision tree node, calculate the Shannon entropy in bits.",
		inputFormat: `<p>The first line contains integer <code>K</code> (number of classes).</p>
<p>The second line contains <code>K</code> non-negative integers representing class frequencies.</p>`,
		outputFormat: `<p>Print the entropy formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= 20",
			"Sum of counts > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(204);
			const tcs = [];

			tcs.push(makeTc(1, "2\n5 5", "1.0000", true, "Two equal classes have maximum entropy = 1.0000 bit."));
			tcs.push(makeTc(2, "2\n10 0", "0.0000", true, "Pure node has 0 entropy."));
			tcs.push(makeTc(3, "4\n1 1 1 1", "2.0000", true, "Four uniform classes have entropy = log2(4) = 2.0000 bits."));

			const computeEntropy = (counts: number[]): number => {
				const total = counts.reduce((a, b) => a + b, 0);
				let H = 0;
				for (const c of counts) {
					if (c > 0) {
						const p = c / total;
						H -= p * Math.log2(p);
					}
				}
				return H;
			};

			for (let i = 4; i <= 100; i++) {
				const K = rng.nextInt(2, 6);
				const counts = rng.intArray(K, 0, 50);
				if (counts.every((c) => c === 0)) counts[0] = 5;
				const H = computeEntropy(counts);
				tcs.push(makeTc(i, `${K}\n${counts.join(" ")}`, f4(H)));
			}

			return tcs;
		},
	},

	// 15. Pharma Compound Gini Impurity
	{
		id: "pharma-compound-gini-impurity",
		title: "Pharma Compound Gini Impurity",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "decision-trees", "gini-impurity", "cart"],
		description: "Compute the Gini Impurity I_G = 1 - sum(p_i^2) for a classification tree node.",
		story: `<p>In synthesis screening of bioactive molecules, CART decision trees split candidate chemical pools to maximize purity. The criterion used is <b>Gini Impurity</b>: <code>I_G = 1 - sum(p_i^2)</code>, where <code>p_i</code> is the fraction of items belonging to class <code>i</code>.</p>`,
		task: "Given the counts of K classes at a candidate tree node, compute its Gini Impurity.",
		inputFormat: `<p>The first line contains integer <code>K</code>.</p>
<p>The second line contains <code>K</code> non-negative integers representing class frequencies.</p>`,
		outputFormat: `<p>Print the Gini impurity formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K <= 20",
			"Sum of counts > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(205);
			const tcs = [];

			tcs.push(makeTc(1, "2\n5 5", "0.5000", true, "1 - (0.5^2 + 0.5^2) = 0.5000."));
			tcs.push(makeTc(2, "3\n10 0 0", "0.0000", true, "Pure node Gini = 0."));
			tcs.push(makeTc(3, "3\n1 1 1", "0.6667", true, "1 - 3*(1/3)^2 = 2/3 = 0.6667."));

			const computeGini = (counts: number[]): number => {
				const total = counts.reduce((a, b) => a + b, 0);
				let sumSq = 0;
				for (const c of counts) {
					const p = c / total;
					sumSq += p * p;
				}
				return 1 - sumSq;
			};

			for (let i = 4; i <= 100; i++) {
				const K = rng.nextInt(2, 5);
				const counts = rng.intArray(K, 0, 40);
				if (counts.every((c) => c === 0)) counts[0] = 10;
				const gini = computeGini(counts);
				tcs.push(makeTc(i, `${K}\n${counts.join(" ")}`, f4(gini)));
			}

			return tcs;
		},
	},

	// 16. Draco Fraud Detector Precision and Recall
	{
		id: "draco-fraud-detector-precision-recall",
		title: "Draco Fraud Detector Precision and Recall",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "metrics", "classification", "evaluation"],
		description: "Compute the Confusion Matrix (TP, FP, FN, TN), Precision, Recall, and F1-Score.",
		story: `<p>Draco E-Commerce deploys a fraud detection engine to intercept fraudulent credit card transactions. Fraud analysts require an automated validation report detailing the Confusion Matrix entries (TP, FP, FN, TN), Precision, Recall, and F1-Score from binary test predictions (1: Fraud, 0: Legitimate).</p>`,
		task: "Given N pairs of ground truth and predicted labels (0 or 1), calculate TP, FP, FN, TN, and print Precision, Recall, and F1-score with 4 decimal places.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated ground truth binary labels (0 or 1).</p>
<p>The third line contains <code>N</code> space-separated predicted binary labels (0 or 1).</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>TP FP FN TN</code> (integers).</p>
<p>Line 2: <code>Precision Recall F1</code> (4 decimal places, 0.0000 if denominator is 0).</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"Labels are in {0, 1}"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(206);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 1 0 0\n1 0 1 0", "1 1 1 1\n0.5000 0.5000 0.5000", true, "TP=1, FP=1, FN=1, TN=1."));
			tcs.push(makeTc(2, "3\n1 1 1\n1 1 1", "3 0 0 0\n1.0000 1.0000 1.0000", true, "Perfect fraud detection."));

			const evalMetrics = (yTrue: number[], yPred: number[]) => {
				let TP = 0, FP = 0, FN = 0, TN = 0;
				for (let i = 0; i < yTrue.length; i++) {
					if (yTrue[i] === 1 && yPred[i] === 1) TP++;
					else if (yTrue[i] === 0 && yPred[i] === 1) FP++;
					else if (yTrue[i] === 1 && yPred[i] === 0) FN++;
					else TN++;
				}
				const prec = TP + FP > 0 ? TP / (TP + FP) : 0;
				const rec = TP + FN > 0 ? TP / (TP + FN) : 0;
				const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
				return { TP, FP, FN, TN, prec, rec, f1 };
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const yTrue = rng.intArray(n, 0, 1);
				const yPred = rng.intArray(n, 0, 1);
				const m = evalMetrics(yTrue, yPred);
				const inStr = `${n}\n${yTrue.join(" ")}\n${yPred.join(" ")}`;
				const outStr = `${m.TP} ${m.FP} ${m.FN} ${m.TN}\n${f4(m.prec)} ${f4(m.rec)} ${f4(m.f1)}`;
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 17. Sentinel Intrusion Perceptron Learning
	{
		id: "sentinel-intrusion-perceptron",
		title: "Sentinel Intrusion Perceptron Learning",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "perceptron", "neural-networks", "classification"],
		description: "Simulate Rosenblatt's Perceptron learning algorithm over multiple training epochs.",
		story: `<p>A perimeter sensor unit runs a classical Rosenblatt Perceptron. Given training vectors with binary labels <code>y in {-1, +1}</code> and learning rate <code>&eta; = 1</code>, on each misclassified instance (where <code>y_i * dot(w, x_i) <= 0</code>), the weight vector updates: <code>w := w + y_i * x_i</code>.</p>`,
		task: "Initialize w = [0, 0, ..., 0] of dimension D. Process training points in given order across E epochs. Output final weight vector w.",
		inputFormat: `<p>The first line contains integers <code>D</code> (dimension), <code>N</code> (examples), and <code>E</code> (epochs).</p>
<p>The next <code>N</code> lines each contain <code>D</code> integers followed by label <code>y</code> (-1 or 1).</p>`,
		outputFormat: `<p>Print the <code>D</code> final integer weights separated by spaces.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"1 <= N <= 20",
			"1 <= E <= 10"
		]),
		points: 130,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(207);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 1\n1 1 1\n-1 -1 -1", "2 2", true, "Point 1: 0<=0, w becomes [1, 1]. Point 2: -1*(-2) = 2 > 0, correctly classified."));
			tcs.push(makeTc(2, "1 1 2\n2 1", "2", true, "Two epochs on 1 example."));

			const runPerceptron = (D: number, N: number, E: number, data: { x: number[]; y: number }[]): number[] => {
				const w = new Array(D).fill(0);
				for (let ep = 0; ep < E; ep++) {
					for (const item of data) {
						let dot = 0;
						for (let d = 0; d < D; d++) dot += w[d] * item.x[d];
						if (item.y * dot <= 0) {
							for (let d = 0; d < D; d++) w[d] += item.y * item.x[d];
						}
					}
				}
				return w;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const N = rng.nextInt(3, 10);
				const E = rng.nextInt(1, 5);
				const data: { x: number[]; y: number }[] = [];
				for (let n = 0; n < N; n++) {
					data.push({ x: rng.intArray(D, -5, 5), y: rng.choice([-1, 1]) });
				}
				const w = runPerceptron(D, N, E, data);
				let inStr = `${D} ${N} ${E}\n`;
				inStr += data.map((d) => `${d.x.join(" ")} ${d.y}`).join("\n");
				tcs.push(makeTc(i, inStr, w.join(" ")));
			}

			return tcs;
		},
	},

	// 18. Omni-Channel Customer Multinomial Naive Bayes
	{
		id: "omni-channel-customer-multinomial-nb",
		title: "Omni-Channel Customer Multinomial Naive Bayes",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "multinomial-naive-bayes", "nlp", "classification"],
		description: "Compute word/token probabilities with Laplace add-one smoothing for text classification.",
		story: `<p>A customer feedback classifier assigns user reviews into categories (Class 0: Negative, Class 1: Positive). With a vocabulary of <code>V</code> tokens, each feature represents token occurrences in a document. To prevent zero-frequency multiplication, use <b>Laplace add-one smoothing</b>: <code>P(w_i | c) = (count(w_i, c) + 1) / (total_tokens_in_c + V)</code>.</p>`,
		task: "Given vocabulary size V, token count frequencies for both classes, and a test document's token counts, calculate the log-likelihood sum(count_i * log(P(w_i|c))) + log(P(c)) and output the winning class.",
		inputFormat: `<p>The first line contains integer <code>V</code> (vocabulary size).</p>
<p>The second line contains <code>V</code> integers: token frequencies in Class 0, followed by total documents <code>N0</code>.</p>
<p>The third line contains <code>V</code> integers: token frequencies in Class 1, followed by total documents <code>N1</code>.</p>
<p>The fourth line contains <code>V</code> integers: token counts in the test document.</p>`,
		outputFormat: `<p>Print the predicted class (0 or 1).</p>`,
		constraints: formatConstraints([
			"2 <= V <= 50",
			"Token counts are non-negative integers"
		]),
		points: 140,
		customCheckerType: "exact",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(208);
			const tcs = [];

			tcs.push(makeTc(1, "3\n10 0 2 5\n0 10 2 5\n5 0 0", "0", true, "Test doc contains token 0 which heavily belongs to Class 0."));
			tcs.push(makeTc(2, "2\n5 1 3\n1 5 3\n0 4", "1", true, "Test doc contains token 1 which belongs to Class 1."));

			const solveMNB = (V: number, c0Counts: number[], n0: number, c1Counts: number[], n1: number, testDoc: number[]): number => {
				const sum0 = c0Counts.reduce((a, b) => a + b, 0);
				const sum1 = c1Counts.reduce((a, b) => a + b, 0);
				const prior0 = n0 / (n0 + n1);
				const prior1 = n1 / (n0 + n1);

				let logP0 = Math.log(prior0);
				let logP1 = Math.log(prior1);

				for (let i = 0; i < V; i++) {
					const theta0 = (c0Counts[i] + 1) / (sum0 + V);
					const theta1 = (c1Counts[i] + 1) / (sum1 + V);
					logP0 += testDoc[i] * Math.log(theta0);
					logP1 += testDoc[i] * Math.log(theta1);
				}

				return logP1 > logP0 ? 1 : 0;
			};

			for (let i = 3; i <= 100; i++) {
				const V = rng.nextInt(3, 8);
				const c0 = rng.intArray(V, 0, 30);
				const n0 = rng.nextInt(5, 50);
				const c1 = rng.intArray(V, 0, 30);
				const n1 = rng.nextInt(5, 50);
				const test = rng.intArray(V, 0, 5);

				const pred = solveMNB(V, c0, n0, c1, n1, test);
				const inStr = `${V}\n${c0.join(" ")} ${n0}\n${c1.join(" ")} ${n1}\n${test.join(" ")}`;
				tcs.push(makeTc(i, inStr, pred.toString()));
			}

			return tcs;
		},
	},

	// 19. Fleet Breakdown ROC AUC Calculation
	{
		id: "fleet-breakdown-roc-auc",
		title: "Fleet Breakdown ROC AUC Calculation",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "metrics", "roc-auc", "evaluation"],
		description: "Compute the Area Under the Receiver Operating Characteristic Curve (ROC-AUC) using the trapezoidal rule.",
		story: `<p>A predictive maintenance team ranks delivery trucks by breakdown probability. The standard discrimination metric across all thresholds is <b>ROC-AUC</b>, representing the probability that a randomly chosen broken truck receives a higher risk score than a healthy truck.</p>`,
		task: "Given N samples with true binary labels y in {0, 1} and predicted probabilities, compute the ROC-AUC score using the trapezoidal rule (or Wilcoxon-Mann-Whitney rank sum).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> binary labels <code>y</code>.</p>
<p>The third line contains <code>N</code> predicted risk scores between 0 and 1.</p>`,
		outputFormat: `<p>Print the ROC-AUC score formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"At least one 0 and at least one 1 in labels"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(209);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 1 0 0\n0.9 0.8 0.3 0.1", "1.0000", true, "Perfect ranking yields AUC = 1.0000."));
			tcs.push(makeTc(2, "4\n1 1 0 0\n0.1 0.2 0.8 0.9", "0.0000", true, "Completely inverted ranking yields AUC = 0.0000."));
			tcs.push(makeTc(3, "4\n1 0 1 0\n0.5 0.5 0.5 0.5", "0.5000", true, "Equal scores yield random baseline AUC = 0.5000."));

			const computeAUC = (y: number[], scores: number[]): number => {
				const posScores = scores.filter((_, idx) => y[idx] === 1);
				const negScores = scores.filter((_, idx) => y[idx] === 0);
				let pairs = 0;
				for (const p of posScores) {
					for (const n of negScores) {
						if (p > n) pairs += 1.0;
						else if (p === n) pairs += 0.5;
					}
				}
				return pairs / (posScores.length * negScores.length);
			};

			for (let i = 4; i <= 100; i++) {
				const n = rng.nextInt(6, 30);
				const y = rng.intArray(n, 0, 1);
				if (!y.includes(0)) y[0] = 0;
				if (!y.includes(1)) y[1] = 1;
				const scores = rng.floatArray(n, 0.01, 0.99, 2);
				const auc = computeAUC(y, scores);
				tcs.push(makeTc(i, `${n}\n${y.join(" ")}\n${scores.join(" ")}`, f4(auc)));
			}

			return tcs;
		},
	},

	// 20. Saturn Rover Support Vector Margin
	{
		id: "saturn-rover-support-vector-margin",
		title: "Saturn Rover Support Vector Margin",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "svm", "support-vector-machine", "optimization"],
		description: "Compute the geometric margin 2 / ||w||_2 and identify support vectors on the decision boundary.",
		story: `<p>A terrain navigation rover on Saturn's moon Titan classifies terrain as Navigable (+1) or Hazard (-1) using a Hard-Margin Linear Support Vector Machine. Given the separating hyperplane parameters <code>w</code> and <code>b</code>, the geometric margin is <code>M = 2 / ||w||_2</code>. Support vectors are data points that satisfy <code>|y_i * (dot(w, x_i) + b) - 1.0| <= 1e-3</code>.</p>`,
		task: "Given hyperplane parameters [b, w] and N points, output the geometric margin and the count of support vectors.",
		inputFormat: `<p>The first line contains integers <code>D</code> (dimension) and <code>N</code> (number of points).</p>
<p>The second line contains <code>b</code> followed by <code>D</code> weights <code>w[1] ... w[D]</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> coordinates followed by label <code>y</code> (-1 or 1).</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>margin</code> (4 decimal places).</p>
<p>Line 2: integer count of support vectors.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"2 <= N <= 50",
			"||w|| > 0",
			"Support vector condition: |y_i * (dot(w, x_i) + b) - 1.0| <= 1e-3"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(210);
			const tcs = [];

			tcs.push(makeTc(1, "1 2\n0 1\n1 1\n-1 -1", "2.0000\n2", true, "w=[1], norm=1, margin = 2/1 = 2. Points (1) and (-1) are both on boundary."));
			tcs.push(makeTc(2, "2 3\n0 1 1\n1 0 1\n0 1 1\n-1 0 -1", "1.4142\n3", true, "w=[1,1], norm=sqrt(2). Margin = 2/sqrt(2) = 1.4142."));

			const evalSVM = (D: number, b: number, w: number[], data: { x: number[]; y: number }[]) => {
				let normSq = 0;
				for (const val of w) normSq += val * val;
				const norm = Math.sqrt(normSq);
				const margin = 2.0 / norm;

				let svCount = 0;
				for (const item of data) {
					let dot = b;
					for (let d = 0; d < D; d++) dot += w[d] * item.x[d];
					if (Math.abs(item.y * dot - 1.0) < 1e-3) {
						svCount++;
					}
				}
				return { margin, svCount };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 3);
				const N = rng.nextInt(4, 15);
				const b = rng.nextInt(-3, 3);
				const w = rng.intArray(D, 1, 3);
				const data: { x: number[]; y: number }[] = [];
				for (let n = 0; n < N; n++) {
					data.push({ x: rng.intArray(D, -5, 5), y: rng.choice([-1, 1]) });
				}
				const res = evalSVM(D, b, w, data);
				let inStr = `${D} ${N}\n${b} ${w.join(" ")}\n`;
				inStr += data.map((d) => `${d.x.join(" ")} ${d.y}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(res.margin)}\n${res.svCount}`));
			}

			return tcs;
		},
	},
];
