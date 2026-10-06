import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const timeseriesProblems: MLProblemDefinition[] = [
	// 83. Meteorology Simple Moving Average
	{
		id: "meteorology-simple-moving-average",
		title: "Meteorology Simple Moving Average",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "moving-average", "signal-smoothing"],
		description: "Compute the trailing Simple Moving Average (SMA) and Exponential Moving Average (EMA).",
		story: `<p>A climatology observatory at <b>Apex Weather Network</b> filters noisy surface temperature records. For a series <code>X = [x_0, ..., x_{N-1}]</code>:
<ul>
  <li>Trailing SMA of window <code>W</code>: <code>SMA = 1/W * sum_{i=N-W}^{N-1} x_i</code>.</li>
  <li>EMA with smoothing factor <code>alpha in (0, 1)</code>: <code>S_0 = x_0</code>, and <code>S_t = alpha * x_t + (1 - alpha) * S_{t-1}</code> for <code>t = 1, ..., N-1</code>. Final value is <code>EMA = S_{N-1}</code>.</li>
</ul></p>`,
		task: "Given N, W, alpha, and N series values, output the final trailing SMA and EMA.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>W</code>, and real number <code>alpha</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>SMA</code> and <code>EMA</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= W <= N <= 100",
			"0.0 < alpha <= 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1001);
			const tcs = [];

			tcs.push(makeTc(1, "4 2 0.5\n10 20 30 40", "35.0000 33.7500", true, "Trailing SMA of [30, 40] is 35. EMA = 0.5*40 + 0.5*27.5 = 33.75."));

			const calcAverages = (N: number, W: number, alpha: number, X: number[]): string => {
				let sum = 0;
				for (let i = N - W; i < N; i++) sum += X[i];
				const sma = sum / W;

				let ema = X[0];
				for (let t = 1; t < N; t++) {
					ema = alpha * X[t] + (1 - alpha) * ema;
				}

				return `${f4(sma)} ${f4(ema)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 15);
				const W = rng.nextInt(2, Math.min(5, N));
				const alpha = parseFloat(rng.nextFloat(0.1, 0.9).toFixed(2));
				const X = rng.floatArray(N, -20, 40, 1);

				const out = calcAverages(N, W, alpha, X);
				tcs.push(makeTc(i, `${N} ${W} ${alpha}\n${X.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 84. Grid Load Holt-Winters Trend
	{
		id: "grid-load-holt-winters-trend",
		title: "Grid Load Holt-Winters Trend",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "forecasting", "exponential-smoothing"],
		description: "Compute Holt's Linear Exponential Smoothing level, trend slope, and 1-step forecast.",
		story: `<p>Electrical load dispatchers at <b>VoltGrid</b> forecast hourly megawatt consumption using <b>Holt's Linear Trend Model</b>:
<ul>
  <li>Initial states: <code>L_0 = Y_0</code>, <code>T_0 = Y_1 - Y_0</code></li>
  <li>Level update: <code>L_t = alpha * Y_t + (1 - alpha) * (L_{t-1} + T_{t-1})</code></li>
  <li>Trend update: <code>T_t = beta * (L_t - L_{t-1}) + (1 - beta) * T_{t-1}</code> for <code>t = 1, ..., N-1</code></li>
  <li>1-step forecast: <code>Y_hat_N = L_{N-1} + T_{N-1}</code></li>
</ul></p>`,
		task: "Given N, alpha, beta, and N values, output final level L_{N-1}, trend T_{N-1}, and 1-step forecast.",
		inputFormat: `<p>The first line contains integer <code>N</code>, and real numbers <code>alpha</code> and <code>beta</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>L_{N-1}</code>, <code>T_{N-1}</code>, and <code>Y_hat_N</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"0.0 < alpha, beta < 1.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1002);
			const tcs = [];

			tcs.push(makeTc(1, "3 0.8 0.2\n10 12 15", "14.8880 2.2224 17.1104", true, "Holt linear trend step progression."));

			const holtLinear = (N: number, alpha: number, beta: number, Y: number[]): string => {
				let L = Y[0];
				let T = Y[1] - Y[0];

				for (let t = 1; t < N; t++) {
					const prevL = L;
					const prevT = T;
					L = alpha * Y[t] + (1 - alpha) * (prevL + prevT);
					T = beta * (L - prevL) + (1 - beta) * prevT;
				}

				const forecast = L + T;
				return `${f4(L)} ${f4(T)} ${f4(forecast)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const alpha = parseFloat(rng.nextFloat(0.2, 0.8).toFixed(2));
				const beta = parseFloat(rng.nextFloat(0.1, 0.5).toFixed(2));
				const Y = rng.floatArray(N, 10, 100, 1);

				const out = holtLinear(N, alpha, beta, Y);
				tcs.push(makeTc(i, `${N} ${alpha} ${beta}\n${Y.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 85. Stock Exchange Autoregressive AR1
	{
		id: "stock-exchange-autoregressive-ar1",
		title: "Stock Exchange Autoregressive AR1",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "autoregression", "statistics"],
		description: "Fit an Autoregressive AR(1) model: X_t = c + phi * X_{t-1} + e_t and forecast 1-step ahead.",
		story: `<p>Quantitative traders at <b>Aura Capital</b> model short-term interest rate spreads as a stationary <b>AR(1)</b> process:
<code>X_t = c + phi * X_{t-1} + e_t</code>.
Using the sample auto-covariance estimator on centered data <code>z_t = X_t - mu</code>:
<ul>
  <li><code>mu = 1/N * sum(X_t)</code></li>
  <li><code>gamma_1 = 1/N * sum_{t=1}^{N-1} z_t * z_{t-1}</code></li>
  <li><code>gamma_0 = 1/N * sum_{t=0}^{N-1} z_t^2</code></li>
  <li><code>phi = gamma_1 / gamma_0</code></li>
  <li><code>c = mu * (1 - phi)</code></li>
  <li>1-step forecast: <code>X_hat_N = c + phi * X_{N-1}</code></li>
</ul></p>`,
		task: "Given N and the series values, compute AR parameter phi, constant c, and 1-step forecast X_hat_N.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>phi</code>, <code>c</code>, and <code>X_hat_N</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 100",
			"variance gamma_0 > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1003);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2 3 4", "0.7000 0.7500 3.5500", true, "Linear ramp has positive autocorrelation."));

			const fitAr1 = (N: number, X: number[]): string => {
				const mu = X.reduce((s, v) => s + v, 0) / N;
				const z = X.map((v) => v - mu);

				let gamma1 = 0;
				for (let t = 1; t < N; t++) gamma1 += z[t] * z[t - 1];
				gamma1 /= N;

				let gamma0 = 0;
				for (let t = 0; t < N; t++) gamma0 += z[t] * z[t];
				gamma0 /= N;

				const phi = gamma0 === 0 ? 0 : gamma1 / gamma0;
				const c = mu * (1 - phi);
				const forecast = c + phi * X[N - 1];

				return `${f4(phi)} ${f4(c)} ${f4(forecast)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 12);
				const X = rng.floatArray(N, -10, 20, 1);
				X[0] += 5; // ensure variance > 0

				const out = fitAr1(N, X);
				tcs.push(makeTc(i, `${N}\n${X.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 86. River Discharge Lagged Features
	{
		id: "river-discharge-lagged-features",
		title: "River Discharge Lagged Features",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "feature-engineering", "lag-features"],
		description: "Construct a tabular supervised feature matrix from a 1D time series using lag order P.",
		story: `<p>Hydrologists at the <b>National Basin Authority</b> train gradient-boosted trees to predict river discharge. To convert sequential gauge readings <code>X = [x_0, ..., x_{N-1}]</code> into supervised tabular training rows, each row at time index <code>t</code> (for <code>t = P, ..., N-1</code>) consists of <code>P</code> previous values <code>[x_{t-P}, ..., x_{t-1}]</code> as features, followed by target value <code>x_t</code>.</p>`,
		task: "Given N, P, and the series values, output the N - P generated tabular training rows.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>P</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print <code>N - P</code> lines, each containing <code>P + 1</code> numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= P < N <= 100"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1004);
			const tcs = [];

			tcs.push(makeTc(1, "5 2\n1 2 3 4 5", "1.0000 2.0000 3.0000\n2.0000 3.0000 4.0000\n3.0000 4.0000 5.0000", true, "3 rows of 2 lags + 1 target."));

			const makeLags = (N: number, P: number, X: number[]): string[] => {
				const rows: string[] = [];
				for (let t = P; t < N; t++) {
					const row = [];
					for (let k = t - P; k <= t; k++) {
						row.push(f4(X[k]));
					}
					rows.push(row.join(" "));
				}
				return rows;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 10);
				const P = rng.nextInt(1, 3);
				const X = rng.floatArray(N, -10, 30, 1);

				const out = makeLags(N, P, X);
				tcs.push(makeTc(i, `${N} ${P}\n${X.join(" ")}`, out.join("\n")));
			}

			return tcs;
		},
	},

	// 87. Telecom Traffic Rolling Z-Score
	{
		id: "telecom-traffic-rolling-z-score",
		title: "Telecom Traffic Rolling Z-Score",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "anomaly-detection", "z-score"],
		description: "Compute the trailing rolling Z-score across a sliding window of size W.",
		story: `<p>Network reliability engineers at <b>CyberFiber</b> monitor packet arrival rate spikes. For each timestamp <code>t >= W - 1</code> across sliding window <code>[t - W + 1, t]</code>:
<ul>
  <li>Window mean: <code>mu = 1/W * sum_{j=t-W+1}^t x_j</code></li>
  <li>Window std: <code>sigma = sqrt(1/W * sum_{j=t-W+1}^t (x_j - mu)^2 + 1e-6)</code></li>
  <li>Z-score: <code>Z_t = (x_t - mu) / sigma</code></li>
</ul></p>`,
		task: "Given N, W, and the series values, output the N - W + 1 trailing Z-scores.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>W</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>N - W + 1</code> Z-scores space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= W <= N <= 100"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1005);
			const tcs = [];

			tcs.push(makeTc(1, "4 3\n10 10 10 20", "0.0000 1.4142", true, "Constant window gives Z=0; spike gives high Z-score."));

			const rollingZScore = (N: number, W: number, X: number[]): string => {
				const zScores: string[] = [];
				for (let t = W - 1; t < N; t++) {
					let sum = 0;
					for (let j = t - W + 1; j <= t; j++) sum += X[j];
					const mu = sum / W;

					let sumSq = 0;
					for (let j = t - W + 1; j <= t; j++) sumSq += (X[j] - mu) ** 2;
					const sigma = Math.sqrt(sumSq / W + 1e-6);

					zScores.push(f4((X[t] - mu) / sigma));
				}
				return zScores.join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 12);
				const W = rng.nextInt(2, Math.min(5, N));
				const X = rng.floatArray(N, 0, 50, 1);

				const out = rollingZScore(N, W, X);
				tcs.push(makeTc(i, `${N} ${W}\n${X.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 88. Seismic Station Autocorrelation Function
	{
		id: "seismic-station-autocorrelation-function",
		title: "Seismic Station Autocorrelation Function",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "time-series", "autocorrelation", "signal-processing"],
		description: "Compute the sample Autocorrelation Function (ACF) r_k at lags k = 0, 1, ..., K.",
		story: `<p>Geophysicists at the <b>Pacific Tsunami Warning Center</b> analyze acoustic seabed reverberations by computing the sample <b>Autocorrelation Function (ACF)</b>. Given centered signal <code>z_t = x_t - mu</code>:
<code>r_k = sum_{t=k}^{N-1} (z_t * z_{t-k}) / sum_{t=0}^{N-1} (z_t^2)</code> for lags <code>k = 0, 1, ..., K</code>.
Note that <code>r_0 = 1.0000</code> by definition.</p>`,
		task: "Given N, K, and the series values, compute and print r_0, r_1, ..., r_K.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>K</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the <code>K + 1</code> autocorrelation values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= K < N <= 100",
			"variance > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1006);
			const tcs = [];

			tcs.push(makeTc(1, "4 2\n1 2 1 2", "1.0000 -0.8000 0.6000", true, "Alternating periodic signal gives negative lag-1 ACF."));

			const sampleAcf = (N: number, K: number, X: number[]): string => {
				const mu = X.reduce((s, v) => s + v, 0) / N;
				const z = X.map((v) => v - mu);
				const denom = z.reduce((s, v) => s + v * v, 0);

				const r: string[] = [];
				for (let k = 0; k <= K; k++) {
					if (k === 0) {
						r.push("1.0000");
						continue;
					}
					let num = 0;
					for (let t = k; t < N; t++) num += z[t] * z[t - k];
					r.push(f4(denom === 0 ? 0 : num / denom));
				}
				return r.join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(6, 12);
				const K = rng.nextInt(2, Math.min(4, N - 1));
				const X = rng.floatArray(N, -10, 10, 1);
				X[0] += 5; // ensure variance > 0

				const out = sampleAcf(N, K, X);
				tcs.push(makeTc(i, `${N} ${K}\n${X.join(" ")}`, out));
			}

			return tcs;
		},
	},
];
