import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const preprocessingProblems: MLProblemDefinition[] = [
	// 49. Clinical Trial StandardScaler (Z-Score Normalization)
	{
		id: "clinical-trial-standard-scaler",
		title: "Clinical Trial StandardScaler",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "preprocessing", "feature-scaling", "statistics"],
		description: "Standardize features by removing the mean and scaling to unit variance: z = (x - mu) / sigma.",
		story: `<p>A clinical trial dataset combines biomarker levels from blood assays. Because laboratory equipment yields vastly different numerical units, statistical algorithms require zero-mean and unit-variance standardization: <code>z = (x - mu) / sigma</code>, where <code>sigma = sqrt(sum(x - mu)^2 / N)</code>.</p>`,
		task: "Compute the column mean and standard deviation for an N x D matrix, then output the standardized matrix.",
		inputFormat: `<p>The first line contains integers <code>N</code> (rows) and <code>D</code> (columns).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers.</p>`,
		outputFormat: `<p>Print <code>N</code> lines representing the standardized matrix with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"1 <= D <= 5",
			"sigma > 0 for all columns"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(601);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n0\n2", "-1.0000\n1.0000", true, "Mean=1, std=1. Standardized: -1 and +1."));
			tcs.push(makeTc(2, "3 1\n10\n20\n30", "-1.2247\n0.0000\n1.2247", true, "Mean=20, std=sqrt(200/3)=8.1650."));

			const standardScale = (N: number, D: number, mat: number[][]): string[] => {
				const mus = new Array(D).fill(0);
				const sigmas = new Array(D).fill(0);

				for (let d = 0; d < D; d++) {
					let sum = 0;
					for (let i = 0; i < N; i++) sum += mat[i][d];
					mus[d] = sum / N;

					let sumSq = 0;
					for (let i = 0; i < N; i++) sumSq += (mat[i][d] - mus[d]) ** 2;
					sigmas[d] = Math.sqrt(sumSq / N);
					if (sigmas[d] === 0) sigmas[d] = 1;
				}

				return mat.map((row) =>
					row.map((val, d) => f4((val - mus[d]) / sigmas[d])).join(" ")
				);
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const D = rng.nextInt(1, 3);
				const mat = Array.from({ length: N }, () => rng.floatArray(D, -20, 20, 1));
				// Ensure non-zero variance
				for (let d = 0; d < D; d++) mat[0][d] += 5;
				const out = standardScale(N, D, mat);
				let inStr = `${N} ${D}\n` + mat.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 50. Sensor Grid Min-Max Normalization
	{
		id: "sensor-grid-min-max-normalization",
		title: "Sensor Grid Min-Max Normalization",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "preprocessing", "normalization"],
		description: "Scale features to the bounded interval [0.0, 1.0]: x_norm = (x - x_min) / (x_max - x_min).",
		story: `<p>Environmental sensor nodes broadcast temperature telemetry. Neural networks processing this stream train faster when each sensor feature is normalized to the bounded range <code>[0.0, 1.0]</code> via <b>Min-Max Feature Scaling</b>: <code>x_norm = (x - min) / (max - min)</code>.</p>`,
		task: "Given an array of N real numbers, compute x_min and x_max, and print the normalized array in [0, 1].",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N</code> normalized values with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 200",
			"x_min < x_max"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(602);
			const tcs = [];

			tcs.push(makeTc(1, "3\n10 20 30", "0.0000 0.5000 1.0000", true, "min=10, max=30. (20-10)/(30-10) = 0.5."));
			tcs.push(makeTc(2, "2\n-5 5", "0.0000 1.0000", true, "Interval scaled to [0, 1]."));

			const minMax = (xs: number[]): number[] => {
				const min = Math.min(...xs);
				const max = Math.max(...xs);
				const denom = max - min;
				return xs.map((x) => (denom > 0 ? (x - min) / denom : 0));
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(3, 20);
				const xs = rng.floatArray(n, -50, 50, 1);
				if (Math.min(...xs) === Math.max(...xs)) xs[0] += 10;
				const norm = minMax(xs);
				tcs.push(makeTc(i, `${n}\n${xs.join(" ")}`, norm.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 51. Smart City One-Hot Encoder
	{
		id: "smart-city-one-hot-encoder",
		title: "Smart City One-Hot Encoder",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "preprocessing", "one-hot-encoding", "features"],
		description: "Encode categorical string attributes into binary indicator vectors with alphabetical category ordering.",
		story: `<p>A smart city dispatch platform ingests categorical traffic event categories (e.g. 'ACCIDENT', 'CONSTRUCTION', 'FOG'). Machine learning models require these discrete strings to be converted into <b>One-Hot Encoded</b> binary indicator vectors matching the alphabetically sorted vocabulary.</p>`,
		task: "Given N category strings, construct the unique sorted vocabulary of size V. Output V, the vocabulary list, and the N one-hot encoded binary vectors.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain a category string.</p>`,
		outputFormat: `<p>Line 1: <code>V</code> (unique categories count).</p>
<p>Line 2: <code>V</code> space-separated sorted category names.</p>
<p>The next <code>N</code> lines each contain <code>V</code> space-separated binary integers (0 or 1).</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"Strings consist of uppercase alphanumeric characters"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(603);
			const tcs = [];

			tcs.push(makeTc(1, "3\nRED\nBLUE\nRED", "2\nBLUE RED\n0 1\n1 0\n0 1", true, "Sorted vocab: BLUE, RED. RED -> [0, 1], BLUE -> [1, 0]."));
			tcs.push(makeTc(2, "1\nSUNNY", "1\nSUNNY\n1", true, "Single category -> [1]."));

			const solveOHE = (items: string[]) => {
				const vocab = Array.from(new Set(items)).sort();
				const vMap = new Map(vocab.map((v, idx) => [v, idx]));
				const vectors = items.map((item) => {
					const vec = new Array(vocab.length).fill(0);
					vec[vMap.get(item)!] = 1;
					return vec.join(" ");
				});
				return { vocab, vectors };
			};

			const pool = ["BUS", "CAR", "BIKE", "TRAIN", "SUBWAY", "WALK", "SCOOTER"];

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(3, 12);
				const items = Array.from({ length: n }, () => rng.choice(pool));
				const { vocab, vectors } = solveOHE(items);
				let inStr = `${n}\n` + items.join("\n");
				let outStr = `${vocab.length}\n${vocab.join(" ")}\n` + vectors.join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 52. Hydrology Missing Data Imputation
	{
		id: "hydrology-missing-data-imputation",
		title: "Hydrology Missing Data Imputation",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "preprocessing", "imputation", "data-cleaning"],
		description: "Impute missing sensor values (encoded as -999) using the feature column mean of observed values.",
		story: `<p>Hydrological river depth sensors occasionally experience telemetry dropouts, transmitting a sentinel missing value <code>-999</code>. To prevent data rejection, preprocessing pipelines perform <b>Mean Imputation</b>: replacing each <code>-999</code> with the arithmetic mean of all non-missing values in that column.</p>`,
		task: "Given an N x D matrix containing observed values and missing values (-999), replace every -999 with the column mean of valid values.",
		inputFormat: `<p>The first line contains integers <code>N</code> (rows) and <code>D</code> (columns).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers (missing values are -999).</p>`,
		outputFormat: `<p>Print <code>N</code> lines representing the imputed matrix with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= D <= 5",
			"Each column has at least one non-missing value"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(604);
			const tcs = [];

			tcs.push(makeTc(1, "3 1\n10\n-999\n20", "10.0000\n15.0000\n20.0000", true, "Observed: 10, 20. Mean = 15.0. Imputed middle row."));
			tcs.push(makeTc(2, "2 2\n5 -999\n-999 10", "5.0000 10.0000\n5.0000 10.0000", true, "Col 0 mean=5, Col 1 mean=10."));

			const imputeMean = (N: number, D: number, mat: number[][]): string[] => {
				const colMeans = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					let sum = 0, count = 0;
					for (let i = 0; i < N; i++) {
						if (mat[i][d] !== -999) {
							sum += mat[i][d];
							count++;
						}
					}
					colMeans[d] = count > 0 ? sum / count : 0;
				}

				return mat.map((row) =>
					row.map((val, d) => (val === -999 ? f4(colMeans[d]) : f4(val))).join(" ")
				);
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const D = rng.nextInt(1, 3);
				const mat: number[][] = [];
				for (let r = 0; r < N; r++) {
					const row: number[] = [];
					for (let c = 0; c < D; c++) {
						row.push(rng.nextInt(1, 100) < 25 ? -999 : rng.nextInt(1, 50));
					}
					mat.push(row);
				}
				// Ensure at least one valid per column
				for (let d = 0; d < D; d++) {
					if (mat.every((r) => r[d] === -999)) mat[0][d] = 10;
				}
				const out = imputeMean(N, D, mat);
				let inStr = `${N} ${D}\n` + mat.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 53. Automotive Polynomial Feature Expansion
	{
		id: "automotive-polynomial-feature-expansion",
		title: "Automotive Polynomial Feature Expansion",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "feature-engineering", "polynomial"],
		description: "Generate degree-2 polynomial expansion terms: [1, x1, x2, x1^2, x1*x2, x2^2] for 2D inputs.",
		story: `<p>Vehicle dynamics controllers predict tire friction by expanding 2D measurements <code>[x_1, x_2]</code> (load and slip angle) into degree-2 polynomial interactions: <code>[1, x_1, x_2, x_1^2, x_1*x_2, x_2^2]</code>.</p>`,
		task: "Given N pairs (x_1, x_2), output the 6-dimensional expanded polynomial feature vector for each row.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two real numbers <code>x_1 x_2</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines, each containing 6 space-separated values: <code>1 x1 x2 x1^2 x1*x2 x2^2</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"-100 <= x1, x2 <= 100"
		]),
		points: 110,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(605);
			const tcs = [];

			tcs.push(makeTc(1, "1\n2.0 3.0", "1.0000 2.0000 3.0000 4.0000 6.0000 9.0000", true, "1, 2, 3, 2^2=4, 2*3=6, 3^2=9."));
			tcs.push(makeTc(2, "1\n0.0 0.0", "1.0000 0.0000 0.0000 0.0000 0.0000 0.0000", true, "Origin expansion."));

			const expandPoly2 = (pts: [number, number][]): string[] => {
				return pts.map(([x1, x2]) =>
					[1.0, x1, x2, x1 * x1, x1 * x2, x2 * x2].map(f4).join(" ")
				);
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(2, 10);
				const pts: [number, number][] = Array.from({ length: N }, () => [
					parseFloat(rng.nextFloat(-5, 5).toFixed(1)),
					parseFloat(rng.nextFloat(-5, 5).toFixed(1)),
				]);
				const out = expandPoly2(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 54. Text Stream Target Encoding with Smoothing
	{
		id: "text-stream-target-encoding",
		title: "Text Stream Target Encoding with Smoothing",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "target-encoding", "feature-engineering"],
		description: "Compute Bayesian Smoothed Target Encoding for high-cardinality categorical features.",
		story: `<p>Click-Through Rate (CTR) models at an ad exchange encode high-cardinality publisher domains using <b>Smoothed Target Encoding</b>: <code>S_c = (n_c * mean_c + m * global_mean) / (n_c + m)</code>, where <code>n_c</code> is category count, <code>mean_c</code> is category target mean, <code>global_mean</code> is overall target mean, and <code>m</code> is smoothing weight.</p>`,
		task: "Given smoothing weight m, category labels, and binary target y, compute the smoothed target encoding for each unique category (sorted alphabetically).",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>m</code> (&ge; 0).</p>
<p>The next <code>N</code> lines each contain a category string and a binary target <code>y</code> (0 or 1).</p>`,
		outputFormat: `<p>Print each unique category and its smoothed target encoding score formatted to 4 decimal places, sorted alphabetically by category name.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"m >= 0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(606);
			const tcs = [];

			tcs.push(makeTc(1, "4 2.0\nA 1\nA 1\nB 0\nB 0", "A 0.7500\nB 0.2500", true, "global_mean = 0.5. For A: (2*1 + 2*0.5)/(2+2) = 3/4 = 0.75. For B: (2*0 + 2*0.5)/4 = 1/4 = 0.25."));
			tcs.push(makeTc(2, "2 0.0\nA 1\nB 0", "A 1.0000\nB 0.0000", true, "m=0 gives pure empirical means."));

			const solveTargetEncoding = (N: number, m: number, rows: { cat: string; y: number }[]): string[] => {
				const globalMean = rows.reduce((sum, r) => sum + r.y, 0) / N;
				const catStats: Record<string, { count: number; sum: number }> = {};
				for (const r of rows) {
					if (!catStats[r.cat]) catStats[r.cat] = { count: 0, sum: 0 };
					catStats[r.cat].count++;
					catStats[r.cat].sum += r.y;
				}

				const sortedCats = Object.keys(catStats).sort();
				return sortedCats.map((cat) => {
					const { count, sum } = catStats[cat];
					const meanC = sum / count;
					const score = (count * meanC + m * globalMean) / (count + m);
					return `${cat} ${f4(score)}`;
				});
			};

			const pool = ["NEWS", "BLOG", "SHOP", "TECH", "SPORTS"];

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(4, 20);
				const m = parseFloat(rng.nextFloat(0.5, 5.0).toFixed(1));
				const rows = Array.from({ length: N }, () => ({
					cat: rng.choice(pool),
					y: rng.nextInt(0, 1),
				}));
				const ans = solveTargetEncoding(N, m, rows);
				let inStr = `${N} ${m}\n` + rows.map((r) => `${r.cat} ${r.y}`).join("\n");
				tcs.push(makeTc(i, inStr, ans.join("\n")));
			}

			return tcs;
		},
	},

	// 55. Avionics Quantile Binning Transformer
	{
		id: "avionics-quantile-binning-transformer",
		title: "Avionics Quantile Binning Transformer",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "discretization", "quantiles", "preprocessing"],
		description: "Discretize continuous flight sensor data into B equal-frequency quantile bins.",
		story: `<p>Flight data recorders discretize continuous airspeed readings into <code>B</code> equal-frequency bins. Quantile thresholds <code>q_1, ..., q_{B-1}</code> split sorted values evenly. A value <code>x</code> maps to bin <code>0</code> if <code>x <= q_1</code>, bin <code>1</code> if <code>q_1 < x <= q_2</code>, ..., and bin <code>B-1</code> if <code>x > q_{B-1}</code>.</p>`,
		task: "Given N values and B bins, sort the array to compute quantile cutoffs at fractions 1/B, 2/B, ..., (B-1)/B (using index floor(N * k / B) - 1). Map each original value to its bin index (0 to B-1).",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>B</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>N</code> space-separated integer bin IDs (0 to B-1) in original order.</p>`,
		constraints: formatConstraints([
			"2 <= B <= N <= 100",
			"Values are distinct"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(607);
			const tcs = [];

			tcs.push(makeTc(1, "4 2\n10 40 20 30", "0 1 0 1", true, "Sorted: 10, 20, 30, 40. Cutoff at k=1: floor(4*1/2)-1 = idx 1 (value 20). Values <= 20 get bin 0, >20 get bin 1."));
			tcs.push(makeTc(2, "3 3\n1 2 3", "0 1 2", true, "Three distinct bins."));

			const solveQuantiles = (N: number, B: number, xs: number[]): number[] => {
				const sorted = [...xs].sort((a, b) => a - b);
				const cutoffs: number[] = [];
				for (let k = 1; k < B; k++) {
					const idx = Math.max(0, Math.floor((N * k) / B) - 1);
					cutoffs.push(sorted[idx]);
				}

				return xs.map((x) => {
					for (let b = 0; b < cutoffs.length; b++) {
						if (x <= cutoffs[b]) return b;
					}
					return B - 1;
				});
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(6, 25);
				const B = rng.nextInt(2, 4);
				// ensure distinct
				const set = new Set<number>();
				while (set.size < N) set.add(rng.nextInt(1, 500));
				const xs = Array.from(set);
				const bins = solveQuantiles(N, B, xs);
				tcs.push(makeTc(i, `${N} ${B}\n${xs.join(" ")}`, bins.join(" ")));
			}

			return tcs;
		},
	},

	// 56. Credit Risk Weight of Evidence (WoE) and Information Value (IV)
	{
		id: "credit-risk-weight-of-evidence-iv",
		title: "Credit Risk Weight of Evidence (WoE) and Information Value (IV)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "woe", "information-value", "credit-risk"],
		description: "Compute Weight of Evidence WoE = ln(dist_good / dist_bad) and total Information Value (IV).",
		story: `<p>Credit scorecard score builders evaluate feature predictive power using <b>Weight of Evidence (WoE)</b> and <b>Information Value (IV)</b> across <code>B</code> bins:
<code>dist_good_i = Good_i / Total_Good</code>
<code>dist_bad_i = Bad_i / Total_Bad</code>
<code>WoE_i = ln(dist_good_i / dist_bad_i)</code>
<code>IV = sum_{i=1}^B (dist_good_i - dist_bad_i) * WoE_i</code>.</p>`,
		task: "Given counts of Goods and Bads in B bins, compute the WoE for each bin and the total IV.",
		inputFormat: `<p>The first line contains integer <code>B</code> (number of bins).</p>
<p>The next <code>B</code> lines each contain two positive integers: <code>Good_i Bad_i</code>.</p>`,
		outputFormat: `<p>Print <code>B</code> lines containing <code>WoE_i</code> (4 decimal places).</p>
<p>The last line prints the total <code>IV</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= B <= 20",
			"Good_i, Bad_i > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(608);
			const tcs = [];

			tcs.push(makeTc(1, "2\n10 5\n5 10", "0.6931\n-0.6931\n0.4621", true, "Total Good=15, Total Bad=15. Bin 1: dist_good=10/15, dist_bad=5/15. WoE=ln(2)=0.6931. IV=(2/3 - 1/3)*0.6931 + (1/3 - 2/3)*(-0.6931) = 0.4621."));
			tcs.push(makeTc(2, "2\n10 10\n10 10", "0.0000\n0.0000\n0.0000", true, "Uniform distribution has 0 WoE and 0 IV."));

			const solveWoE_IV = (B: number, bins: { g: number; b: number }[]) => {
				const totG = bins.reduce((sum, item) => sum + item.g, 0);
				const totB = bins.reduce((sum, item) => sum + item.b, 0);

				const woes: number[] = [];
				let iv = 0;
				for (const item of bins) {
					const dg = item.g / totG;
					const db = item.b / totB;
					const woe = Math.log(dg / db);
					woes.push(woe);
					iv += (dg - db) * woe;
				}
				return { woes, iv };
			};

			for (let i = 3; i <= 100; i++) {
				const B = rng.nextInt(2, 5);
				const bins = Array.from({ length: B }, () => ({
					g: rng.nextInt(5, 50),
					b: rng.nextInt(5, 50),
				}));
				const { woes, iv } = solveWoE_IV(B, bins);
				let inStr = `${B}\n` + bins.map((item) => `${item.g} ${item.b}`).join("\n");
				let outStr = woes.map(f4).join("\n") + "\n" + f4(iv);
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},
];
