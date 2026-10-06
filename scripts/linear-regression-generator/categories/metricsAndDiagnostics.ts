import { LRProblemDefinition } from "../types";
import {
	DeterministicRNG,
	makeTc,
	formatConstraints,
	f4,
	solveOLS,
	matMul,
	invertMatrix,
	transpose,
	matVecMul,
} from "../utils";

export const metricsAndDiagnosticsProblems: LRProblemDefinition[] = [
	// 86. MSE and RMSE
	{
		id: "lr-metrics-mse-and-rmse",
		title: "Mean Squared Error and Root Mean Squared Error",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "mse", "rmse"],
		description: "Compute Mean Squared Error (MSE) and Root Mean Squared Error (RMSE) between actual and predicted values.",
		story: `<p>Aero-propulsion testing engineers at <b>AeroTurbine Corp</b> evaluate turbine blade vibration models against physical accelerometer telemetry. The performance is assessed using <b>Mean Squared Error (MSE)</b> and <b>Root Mean Squared Error (RMSE)</b>:
<ul>
  <li><code>MSE = 1/N * sum_{i=1}^N (y_i - y_hat_i)^2</code></li>
  <li><code>RMSE = sqrt(MSE)</code></li>
</ul></p>`,
		task: "Given N, the true values y, and the predicted values y_hat, compute MSE and RMSE.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers representing <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers representing <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>MSE</code> and <code>RMSE</code> separated by a space, formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"-1000.0 <= y_i, y_hat_i <= 1000.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2601);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				let s = 0;
				for (let i = 0; i < n; i++) {
					const diff = y[i] - yHat[i];
					s += diff * diff;
				}
				const mse = s / n;
				const rmse = Math.sqrt(mse);
				return `${f4(mse)} ${f4(rmse)}`;
			};

			tcs.push(makeTc(1, "3\n1 2 3\n1 2 5", solve([1, 2, 3], [1, 2, 5]), true, "e=[0, 0, -2]. MSE = 4/3 = 1.3333, RMSE = 1.1547."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const y = rng.floatArray(N, -20, 20, 2);
				const yHat = rng.floatArray(N, -20, 20, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},

	// 87. MAE and MAPE
	{
		id: "lr-metrics-mae-and-mape",
		title: "Mean Absolute Error and Mean Absolute Percentage Error",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "mae", "mape"],
		description: "Compute Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE) between actual and predicted values.",
		story: `<p>Supply chain analysts at <b>OmniRetail Global</b> evaluate warehouse pallet dispatch forecasts. They track <b>Mean Absolute Error (MAE)</b> for physical volume discrepancy and <b>Mean Absolute Percentage Error (MAPE)</b> for scale-free percentage error:
<ul>
  <li><code>MAE = 1/N * sum_{i=1}^N |y_i - y_hat_i|</code></li>
  <li><code>MAPE = (100 / N) * sum_{i=1}^N |(y_i - y_hat_i) / y_i|</code></li>
</ul></p>`,
		task: "Given N, true targets y (all non-zero), and predictions y_hat, compute MAE and MAPE.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> non-zero space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>MAE</code> and <code>MAPE</code> separated by a space, formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"|y_i| >= 0.5",
			"-1000.0 <= y_i, y_hat_i <= 1000.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2602);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				let sumAbs = 0;
				let sumPct = 0;
				for (let i = 0; i < n; i++) {
					const diff = Math.abs(y[i] - yHat[i]);
					sumAbs += diff;
					sumPct += diff / Math.abs(y[i]);
				}
				const mae = sumAbs / n;
				const mape = (100 * sumPct) / n;
				return `${f4(mae)} ${f4(mape)}`;
			};

			tcs.push(makeTc(1, "2\n10 20\n12 18", solve([10, 20], [12, 18]), true, "Errors are 2 and 2. MAE = 2.0000. MAPE = 100/2 * (2/10 + 2/20) = 50 * 0.3 = 15.0000."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const y: number[] = [];
				for (let j = 0; j < N; j++) {
					const sign = rng.next() > 0.5 ? 1 : -1;
					y.push(parseFloat((sign * rng.nextFloat(2, 50)).toFixed(2)));
				}
				const yHat = rng.floatArray(N, -50, 50, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},

	// 88. R-Squared
	{
		id: "lr-metrics-r-squared",
		title: "Coefficient of Determination (R-Squared)",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "r-squared", "statistics"],
		description: "Compute the coefficient of determination R^2 = 1 - (SS_res / SS_tot).",
		story: `<p>Econometricians at <b>GlobalMacro Index</b> quantify how much variance in real regional wage growth is explained by educational and capital factors using the <b>Coefficient of Determination (R^2)</b>:
<ul>
  <li><code>y_bar = 1/N * sum_{i=1}^N y_i</code></li>
  <li><code>SS_tot = sum_{i=1}^N (y_i - y_bar)^2</code></li>
  <li><code>SS_res = sum_{i=1}^N (y_i - y_hat_i)^2</code></li>
  <li><code>R^2 = 1 - (SS_res / SS_tot)</code></li>
</ul>
If <code>SS_tot == 0</code>, <code>R^2 = 1.0</code>.</p>`,
		task: "Given sample count N, actual targets y, and predictions y_hat, compute R^2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>R^2</code> formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"SS_tot > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2603);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				let yBar = 0;
				for (let i = 0; i < n; i++) yBar += y[i];
				yBar /= n;

				let ssTot = 0;
				let ssRes = 0;
				for (let i = 0; i < n; i++) {
					const dy = y[i] - yBar;
					ssTot += dy * dy;
					const de = y[i] - yHat[i];
					ssRes += de * de;
				}

				if (Math.abs(ssTot) < 1e-12) return f4(1.0);
				const r2 = 1 - ssRes / ssTot;
				return f4(r2);
			};

			tcs.push(makeTc(1, "3\n1 2 3\n1.1 1.9 3.0", solve([1, 2, 3], [1.1, 1.9, 3.0]), true, "Sample with good fit."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 15);
				const y = rng.floatArray(N, -20, 20, 2);
				const yHat = rng.floatArray(N, -20, 20, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},

	// 89. Adjusted R-Squared
	{
		id: "lr-metrics-adjusted-r-squared",
		title: "Adjusted R-Squared with Model Degrees of Freedom",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "adjusted-r2"],
		description: "Compute the adjusted coefficient of determination R^2_adj = 1 - (1 - R^2) * (N - 1) / (N - p - 1).",
		story: `<p>Quantitative portfolio managers at <b>AlphaEdge Capital</b> evaluate multi-factor stock return models. Since ordinary <code>R^2</code> mechanically increases whenever extra explanatory variables are added, they use <b>Adjusted R^2</b> to penalize superfluous predictors:
<ul>
  <li><code>R^2_adj = 1 - (1 - R^2) * (N - 1) / (N - p - 1)</code></li>
</ul>
where <code>N</code> is the number of samples and <code>p</code> is the number of predictor features (excluding the intercept).</p>`,
		task: "Given N, p, true values y, and predictions y_hat, compute the Adjusted R^2.",
		inputFormat: `<p>The first line contains two integers <code>N</code> and <code>p</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>R^2_adj</code> formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= p <= 10",
			"p + 2 <= N <= 100",
			"SS_tot > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2604);
			const tcs = [];

			const solve = (N: number, p: number, y: number[], yHat: number[]) => {
				let yBar = 0;
				for (let i = 0; i < N; i++) yBar += y[i];
				yBar /= N;

				let ssTot = 0;
				let ssRes = 0;
				for (let i = 0; i < N; i++) {
					const dy = y[i] - yBar;
					ssTot += dy * dy;
					const de = y[i] - yHat[i];
					ssRes += de * de;
				}

				const r2 = Math.abs(ssTot) < 1e-12 ? 1.0 : 1 - ssRes / ssTot;
				const adjR2 = 1 - ((1 - r2) * (N - 1)) / (N - p - 1);
				return f4(adjR2);
			};

			tcs.push(makeTc(1, "5 2\n1 2 3 4 5\n1.1 2.0 2.9 4.1 4.9", solve(5, 2, [1, 2, 3, 4, 5], [1.1, 2.0, 2.9, 4.1, 4.9]), true, "N=5, p=2."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 3, p + 10);
				const y = rng.floatArray(N, -20, 20, 2);
				const yHat = rng.floatArray(N, -20, 20, 2);
				tcs.push(makeTc(i, `${N} ${p}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(N, p, y, yHat)));
			}

			return tcs;
		},
	},

	// 90. ANOVA Sum of Squares Decomposition
	{
		id: "lr-metrics-sum-of-squares-anova",
		title: "ANOVA Sum of Squares Decomposition (TSS, ESS, RSS)",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "anova", "sum-of-squares"],
		description: "Decompose total variance into Total Sum of Squares (TSS), Explained Sum of Squares (ESS), and Residual Sum of Squares (RSS).",
		story: `<p>Biometric statisticians at <b>BioPharma Analytics</b> analyze dose-response clinical trials by decomposing total target variance:
<ul>
  <li><code>TSS = sum_{i=1}^N (y_i - y_bar)^2</code> (Total Sum of Squares)</li>
  <li><code>ESS = sum_{i=1}^N (y_hat_i - y_bar)^2</code> (Explained Sum of Squares)</li>
  <li><code>RSS = sum_{i=1}^N (y_i - y_hat_i)^2</code> (Residual Sum of Squares)</li>
</ul>
where <code>y_bar = 1/N * sum y_i</code>.</p>`,
		task: "Given N, true values y, and predictions y_hat, compute TSS, ESS, and RSS.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>TSS ESS RSS</code> separated by spaces, each formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2605);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				let yBar = 0;
				for (let i = 0; i < n; i++) yBar += y[i];
				yBar /= n;

				let tss = 0;
				let ess = 0;
				let rss = 0;
				for (let i = 0; i < n; i++) {
					const dy = y[i] - yBar;
					tss += dy * dy;
					const de = yHat[i] - yBar;
					ess += de * de;
					const dr = y[i] - yHat[i];
					rss += dr * dr;
				}
				return `${f4(tss)} ${f4(ess)} ${f4(rss)}`;
			};

			tcs.push(makeTc(1, "3\n2 4 6\n2 5 5", solve([2, 4, 6], [2, 5, 5]), true, "y_bar=4. TSS=(4+0+4)=8. ESS=(4+1+1)=6. RSS=(0+1+1)=2."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const y = rng.floatArray(N, -15, 15, 2);
				const yHat = rng.floatArray(N, -15, 15, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},

	// 91. Leverage Hat Matrix Diagonal Values
	{
		id: "lr-diagnostics-leverage-hat-values",
		title: "Leverage Hat Matrix Diagonal Values",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "leverage", "hat-matrix"],
		description: "Compute the diagonal elements h_ii of the projection hat matrix H = X(X^T X)^(-1)X^T and count high-leverage points (h_ii > 2p/N).",
		story: `<p>Structural integrity engineers at <b>HighSpeed Rail Systems</b> inspect sensor arrays along train tracks. Sensors at extreme feature coordinates have high <b>leverage</b>:
The projection hat matrix is:
<code>H = X * (X^T * X)^(-1) * X^T</code>
The diagonal element <code>h_{ii}</code> represents the leverage of observation <code>i</code>:
<ul>
  <li><code>h_{ii} = x_i^T * (X^T * X)^(-1) * x_i</code></li>
</ul>
An observation is flagged as high leverage if:
<code>h_{ii} > 2 * p / N</code>
where <code>p</code> is the number of columns in design matrix <code>X</code>, and <code>N</code> is the sample count.</p>`,
		task: "Given N, p, and the design matrix X, compute all h_ii, count how many points exceed 2p/N, and report the maximum leverage value.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>p</code>.</p>
<p>The next <code>N</code> lines each contain <code>p</code> space-separated numbers representing each row of <code>X</code>.</p>`,
		outputFormat: `<p>Line 1: <code>N</code> space-separated values <code>h_{11}, ..., h_{NN}</code> formatted with 4 decimal places.</p>
<p>Line 2: Integer count of high-leverage points, followed by space and the maximum leverage with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= p <= 4",
			"p < N <= 20",
			"X^T X is non-singular"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2606);
			const tcs = [];

			const solve = (N: number, p: number, X: number[][]) => {
				const XT = transpose(X);
				const XTX = matMul(XT, X);
				const invXTX = invertMatrix(XTX);

				const h: number[] = [];
				let maxH = -Infinity;
				let highCount = 0;
				const threshold = (2 * p) / N;

				for (let i = 0; i < N; i++) {
					const xi = X[i];
					const invXi = matVecMul(invXTX, xi);
					let hii = 0;
					for (let j = 0; j < p; j++) hii += xi[j] * invXi[j];
					h.push(hii);
					if (hii > maxH) maxH = hii;
					if (hii > threshold + 1e-9) highCount++;
				}

				const line1 = h.map((val) => f4(val)).join(" ");
				const line2 = `${highCount} ${f4(maxH)}`;
				return `${line1}\n${line2}`;
			};

			const sampleX = [
				[1, 1],
				[1, 2],
				[1, 3],
				[1, 10],
			];
			tcs.push(makeTc(1, `4 2\n${sampleX.map((r) => r.join(" ")).join("\n")}`, solve(4, 2, sampleX), true, "Sample with 4 points, point 4 has extreme coordinate 10."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 3, p + 7);
				const X: number[][] = [];
				for (let r = 0; r < N; r++) {
					const row: number[] = [1]; // intercept column
					for (let c = 1; c < p; c++) {
						row.push(parseFloat(rng.nextFloat(-5, 5).toFixed(2)));
					}
					X.push(row);
				}
				const inputStr = `${N} ${p}\n${X.map((r) => r.join(" ")).join("\n")}`;
				tcs.push(makeTc(i, inputStr, solve(N, p, X)));
			}

			return tcs;
		},
	},

	// 92. Internally Studentized Residuals
	{
		id: "lr-diagnostics-studentized-residuals",
		title: "Internally Studentized Residuals",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "studentized-residuals", "outlier-detection"],
		description: "Compute internally studentized residuals r_i = e_i / (s * sqrt(1 - h_ii)) using residual variance s^2 = RSS / (N - p).",
		story: `<p>Semiconductor reliability engineers at <b>Nanowave Labs</b> detect outlier microchip power readouts using <b>Internally Studentized Residuals</b>:
<ul>
  <li>Residual variance: <code>s^2 = (1 / (N - p)) * sum_{i=1}^N e_i^2</code></li>
  <li><code>s = sqrt(s^2)</code></li>
  <li>Studentized residual: <code>r_i = e_i / (s * sqrt(1 - h_ii))</code></li>
</ul>
If <code>1 - h_ii <= 1e-7</code> or <code>s <= 1e-9</code>, set <code>r_i = 0.0000</code>.</p>`,
		task: "Given N, p, residuals e, and leverage diagonal values h, compute the studentized residuals.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>p</code>.</p>
<p>The second line contains <code>N</code> space-separated residuals <code>e</code>.</p>
<p>The third line contains <code>N</code> space-separated leverage values <code>h</code> (where <code>0 <= h_i < 1</code>).</p>`,
		outputFormat: `<p>Print the <code>N</code> space-separated studentized residuals formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= p < N <= 50",
			"0.0 <= h_i < 1.0",
			"sum e_i^2 > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2607);
			const tcs = [];

			const solve = (N: number, p: number, e: number[], h: number[]) => {
				let rss = 0;
				for (let i = 0; i < N; i++) rss += e[i] * e[i];
				const s2 = rss / (N - p);
				const s = Math.sqrt(s2);

				const r: number[] = [];
				for (let i = 0; i < N; i++) {
					const denom = s * Math.sqrt(Math.max(0, 1 - h[i]));
					if (denom < 1e-7) {
						r.push(0);
					} else {
						r.push(e[i] / denom);
					}
				}
				return r.map((v) => f4(v)).join(" ");
			};

			tcs.push(makeTc(1, "4 2\n0.5 -0.5 1.0 -1.0\n0.2 0.3 0.4 0.1", solve(4, 2, [0.5, -0.5, 1.0, -1.0], [0.2, 0.3, 0.4, 0.1]), true, "Sample with N=4, p=2."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 3, p + 10);
				const e = rng.floatArray(N, -5, 5, 2);
				const h = rng.floatArray(N, 0.05, 0.6, 2);
				tcs.push(makeTc(i, `${N} ${p}\n${e.join(" ")}\n${h.join(" ")}`, solve(N, p, e, h)));
			}

			return tcs;
		},
	},

	// 93. Cook's Distance
	{
		id: "lr-diagnostics-cooks-distance",
		title: "Cook's Distance Influential Observation Detection",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "cooks-distance", "influential-points"],
		description: "Compute Cook's distance D_i = (e_i^2 / (p * s^2)) * (h_ii / (1 - h_ii)^2) and count influential points exceeding 4/N.",
		story: `<p>Risk modelers at <b>Apex FinCorp</b> evaluate mortgage default predictors. An observation that exerts disproportionate influence over the entire regression hyperplane is identified using <b>Cook's Distance (D_i)</b>:
<ul>
  <li><code>s^2 = (1 / (N - p)) * sum_{j=1}^N e_j^2</code></li>
  <li><code>D_i = (e_i^2 / (p * s^2)) * (h_{ii} / (1 - h_{ii})^2)</code></li>
</ul>
An observation is flagged as influential if <code>D_i > 4 / N</code>.</p>`,
		task: "Given N, p, residuals e, and leverage diagonal values h, compute Cook's distance for each observation and count how many points exceed 4/N.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>p</code>.</p>
<p>The second line contains <code>N</code> space-separated residuals <code>e</code>.</p>
<p>The third line contains <code>N</code> space-separated leverage values <code>h</code> (where <code>0 <= h_i < 1</code>).</p>`,
		outputFormat: `<p>Line 1: <code>N</code> space-separated Cook's distance values formatted with 4 decimal places.</p>
<p>Line 2: Integer count of influential observations exceeding <code>4 / N</code>.</p>`,
		constraints: formatConstraints([
			"1 <= p < N <= 50",
			"0.0 <= h_i < 0.95",
			"sum e_i^2 > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2608);
			const tcs = [];

			const solve = (N: number, p: number, e: number[], h: number[]) => {
				let rss = 0;
				for (let i = 0; i < N; i++) rss += e[i] * e[i];
				const s2 = rss / (N - p);

				const D: number[] = [];
				let count = 0;
				const threshold = 4 / N;

				for (let i = 0; i < N; i++) {
					const oneMinusH = 1 - h[i];
					let di = 0;
					if (oneMinusH > 1e-6 && s2 > 1e-9) {
						di = (e[i] * e[i]) / (p * s2) * (h[i] / (oneMinusH * oneMinusH));
					}
					D.push(di);
					if (di > threshold + 1e-9) count++;
				}

				return `${D.map((v) => f4(v)).join(" ")}\n${count}`;
			};

			tcs.push(makeTc(1, "4 2\n0.2 0.1 0.3 2.0\n0.1 0.1 0.2 0.7", solve(4, 2, [0.2, 0.1, 0.3, 2.0], [0.1, 0.1, 0.2, 0.7]), true, "Sample with an influential 4th observation."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 3, p + 10);
				const e = rng.floatArray(N, -4, 4, 2);
				const h = rng.floatArray(N, 0.05, 0.7, 2);
				tcs.push(makeTc(i, `${N} ${p}\n${e.join(" ")}\n${h.join(" ")}`, solve(N, p, e, h)));
			}

			return tcs;
		},
	},

	// 94. Variance Inflation Factor (VIF)
	{
		id: "lr-diagnostics-vif-multicollinearity",
		title: "Variance Inflation Factor (VIF) Multicollinearity Analysis",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "multicollinearity", "vif"],
		description: "Compute Variance Inflation Factor VIF_j = 1 / (1 - R_j^2) for each feature and count severe collinear features (VIF > 5.0).",
		story: `<p>Geochemical assay scientists at <b>TerraMining</b> analyze mineral grade spectra. High inter-correlation among mineral signals creates severe multicollinearity, which inflates standard errors:
For feature <code>j</code> regressed against all other features with coefficient of determination <code>R_j^2</code>:
<ul>
  <li><code>VIF_j = 1 / (1 - R_j^2)</code></li>
</ul>
If <code>1 - R_j^2 < 1e-6</code>, cap <code>VIF_j = 1000000.0000</code>.
Features with <code>VIF_j > 5.0</code> are flagged as exhibiting severe multicollinearity.</p>`,
		task: "Given feature count P and each feature's R^2_j, compute all VIF values and count how many exceed 5.0.",
		inputFormat: `<p>The first line contains integer <code>P</code>.</p>
<p>The second line contains <code>P</code> space-separated values <code>R_j^2</code> (where <code>0 <= R_j^2 < 1</code>).</p>`,
		outputFormat: `<p>Line 1: <code>P</code> space-separated VIF values formatted with 4 decimal places.</p>
<p>Line 2: Integer count of features with <code>VIF > 5.0</code>.</p>`,
		constraints: formatConstraints([
			"1 <= P <= 50",
			"0.0 <= R_j^2 < 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2609);
			const tcs = [];

			const solve = (P: number, r2List: number[]) => {
				const vif: number[] = [];
				let count = 0;
				for (let j = 0; j < P; j++) {
					const denom = 1 - r2List[j];
					let v = 0;
					if (denom < 1e-6) {
						v = 1000000.0;
					} else {
						v = 1 / denom;
					}
					vif.push(v);
					if (v > 5.0 + 1e-9) count++;
				}
				return `${vif.map((v) => f4(v)).join(" ")}\n${count}`;
			};

			tcs.push(makeTc(1, "3\n0.2 0.8 0.95", solve(3, [0.2, 0.8, 0.95]), true, "VIF = [1.25, 5.00, 20.00]. Only 0.95 exceeds 5.0."));

			for (let i = 2; i <= 100; i++) {
				const P = rng.nextInt(2, 8);
				const r2List = rng.floatArray(P, 0.0, 0.98, 3);
				tcs.push(makeTc(i, `${P}\n${r2List.join(" ")}`, solve(P, r2List)));
			}

			return tcs;
		},
	},

	// 95. Durbin-Watson Autocorrelation Statistic
	{
		id: "lr-diagnostics-durbin-watson-stat",
		title: "Durbin-Watson Autocorrelation Statistic",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "durbin-watson", "time-series"],
		description: "Compute the Durbin-Watson statistic d = sum_{t=2}^N (e_t - e_{t-1})^2 / sum_{t=1}^N e_t^2 and classify residual autocorrelation.",
		story: `<p>Macroeconomists at <b>ReserveDynamics</b> audit inflation forecasting regressions to ensure residuals are not serially correlated over time. The <b>Durbin-Watson test statistic</b> is defined as:
<ul>
  <li><code>d = (sum_{t=2}^N (e_t - e_{t-1})^2) / (sum_{t=1}^N e_t^2)</code></li>
</ul>
Classification criteria:
<ul>
  <li>If <code>d < 1.5</code>: <code>POSITIVE</code> (positive serial autocorrelation)</li>
  <li>If <code>d > 2.5</code>: <code>NEGATIVE</code> (negative serial autocorrelation)</li>
  <li>Otherwise: <code>INCONCLUSIVE</code> (uncorrelated or inconclusive)</li>
</ul></p>`,
		task: "Given sample count N and ordered time-series residuals e, compute the Durbin-Watson statistic d and print the autocorrelation classification.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated time-series residuals <code>e_1, ..., e_N</code>.</p>`,
		outputFormat: `<p>Line 1: Statistic <code>d</code> formatted with 4 decimal places.</p>
<p>Line 2: Classification string: <code>POSITIVE</code>, <code>NEGATIVE</code>, or <code>INCONCLUSIVE</code>.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 100",
			"sum_{t=1}^N e_t^2 > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2610);
			const tcs = [];

			const solve = (e: number[]) => {
				const n = e.length;
				let num = 0;
				for (let t = 1; t < n; t++) {
					const diff = e[t] - e[t - 1];
					num += diff * diff;
				}
				let den = 0;
				for (let t = 0; t < n; t++) {
					den += e[t] * e[t];
				}

				const d = den === 0 ? 2.0 : num / den;
				let status = "INCONCLUSIVE";
				if (d < 1.5) status = "POSITIVE";
				else if (d > 2.5) status = "NEGATIVE";

				return `${f4(d)}\n${status}`;
			};

			tcs.push(makeTc(1, "4\n1 2 3 4", solve([1, 2, 3, 4]), true, "e=[1,2,3,4]. num=1+1+1=3. den=1+4+9+16=30. d=0.1000 (POSITIVE)."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 15);
				let e: number[];
				const mode = rng.nextInt(1, 3);
				if (mode === 1) {
					// Smooth drift -> positive autocorrelation
					let cur = rng.nextFloat(-5, 5);
					e = [];
					for (let j = 0; j < N; j++) {
						cur += rng.nextFloat(-0.5, 0.5);
						e.push(parseFloat(cur.toFixed(2)));
					}
				} else if (mode === 2) {
					// Oscillating -> negative autocorrelation
					let sign = 1;
					e = [];
					for (let j = 0; j < N; j++) {
						e.push(parseFloat((sign * rng.nextFloat(2, 6)).toFixed(2)));
						sign = -sign;
					}
				} else {
					// Random uncorrelated
					e = rng.floatArray(N, -5, 5, 2);
				}
				tcs.push(makeTc(i, `${N}\n${e.join(" ")}`, solve(e)));
			}

			return tcs;
		},
	},

	// 96. Akaike Information Criterion (AIC & AICc)
	{
		id: "lr-metrics-akaike-information-criterion",
		title: "Akaike Information Criterion (AIC and AICc)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "model-selection", "aic", "information-criterion"],
		description: "Compute AIC = N * ln(RSS / N) + 2p and small-sample corrected AICc = AIC + (2p(p+1))/(N - p - 1).",
		story: `<p>Atmospheric researchers at <b>AtmoSim Labs</b> select predictor sets for micro-climate forecasting using information criteria:
Under Gaussian residual assumptions:
<ul>
  <li><code>RSS = sum_{i=1}^N (y_i - y_hat_i)^2</code></li>
  <li><code>AIC = N * ln(RSS / N) + 2 * p</code></li>
  <li><code>AIC_c = AIC + (2 * p * (p + 1)) / (N - p - 1)</code></li>
</ul>
where <code>p</code> is the total number of estimated model parameters and <code>N</code> is the number of samples.</p>`,
		task: "Given N, p, true values y, and predictions y_hat, compute AIC and small-sample corrected AICc.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>p</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>AIC</code> and <code>AIC_c</code> separated by a space, each formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= p <= 10",
			"p + 2 <= N <= 100",
			"RSS > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2611);
			const tcs = [];

			const solve = (N: number, p: number, y: number[], yHat: number[]) => {
				let rss = 0;
				for (let i = 0; i < N; i++) {
					const d = y[i] - yHat[i];
					rss += d * d;
				}
				const aic = N * Math.log(rss / N) + 2 * p;
				const aicc = aic + (2 * p * (p + 1)) / (N - p - 1);
				return `${f4(aic)} ${f4(aicc)}`;
			};

			tcs.push(makeTc(1, "5 2\n1 2 3 4 5\n1.1 2.1 3.1 4.1 5.1", solve(5, 2, [1, 2, 3, 4, 5], [1.1, 2.1, 3.1, 4.1, 5.1]), true, "Sample with N=5, p=2, RSS=0.05."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 3, p + 10);
				const y = rng.floatArray(N, -20, 20, 2);
				const yHat = rng.floatArray(N, -20, 20, 2);
				tcs.push(makeTc(i, `${N} ${p}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(N, p, y, yHat)));
			}

			return tcs;
		},
	},

	// 97. Bayesian Information Criterion (BIC)
	{
		id: "lr-metrics-bayesian-information-criterion",
		title: "Bayesian Information Criterion (BIC)",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "model-selection", "bic", "schwarz-criterion"],
		description: "Compute Bayesian Information Criterion BIC = N * ln(RSS / N) + p * ln(N).",
		story: `<p>Quantitative geneticists at <b>GenomicCore</b> compare competing quantitative trait locus regression models. The <b>Bayesian Information Criterion (BIC)</b> penalizes model complexity proportional to the logarithm of sample size:
<ul>
  <li><code>RSS = sum_{i=1}^N (y_i - y_hat_i)^2</code></li>
  <li><code>BIC = N * ln(RSS / N) + p * ln(N)</code></li>
</ul>
where <code>p</code> is the number of estimated parameters and <code>N</code> is the number of samples.</p>`,
		task: "Given N, p, true values y, and predictions y_hat, compute BIC.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>p</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>BIC</code> formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= p <= 10",
			"p < N <= 100",
			"RSS > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2612);
			const tcs = [];

			const solve = (N: number, p: number, y: number[], yHat: number[]) => {
				let rss = 0;
				for (let i = 0; i < N; i++) {
					const d = y[i] - yHat[i];
					rss += d * d;
				}
				const bic = N * Math.log(rss / N) + p * Math.log(N);
				return f4(bic);
			};

			tcs.push(makeTc(1, "4 2\n1 2 3 4\n1.2 1.8 3.2 3.8", solve(4, 2, [1, 2, 3, 4], [1.2, 1.8, 3.2, 3.8]), true, "Sample with N=4, p=2."));

			for (let i = 2; i <= 100; i++) {
				const p = rng.nextInt(1, 3);
				const N = rng.nextInt(p + 2, p + 10);
				const y = rng.floatArray(N, -20, 20, 2);
				const yHat = rng.floatArray(N, -20, 20, 2);
				tcs.push(makeTc(i, `${N} ${p}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(N, p, y, yHat)));
			}

			return tcs;
		},
	},

	// 98. Breusch-Pagan Test Statistic
	{
		id: "lr-diagnostics-breusch-pagan-stat",
		title: "Breusch-Pagan Test Statistic for Heteroscedasticity",
		difficulty: "Hard",
		category: "machine-learning",
		tags: ["linear-regression", "diagnostics", "breusch-pagan", "heteroscedasticity"],
		description: "Compute the Breusch-Pagan LM statistic LM = 0.5 * ESS_aux to test for heteroscedasticity.",
		story: `<p>Real estate economists at <b>MetroAnalytics</b> evaluate property valuation regressions. If residual variance grows with house size, the classical constant-variance (homoscedasticity) assumption fails:
The <b>Breusch-Pagan test</b>:
<ol>
  <li>Compute residual variance: <code>sigma^2 = 1/N * sum_{i=1}^N e_i^2</code></li>
  <li>Scale squared residuals: <code>g_i = e_i^2 / sigma^2</code></li>
  <li>Run auxiliary regression of <code>g</code> on predictor <code>z</code> with intercept: <code>g_hat = gamma_0 + gamma_1 * z</code> using OLS.</li>
  <li>Compute auxiliary explained sum of squares: <code>ESS_aux = sum_{i=1}^N (g_hat_i - 1)^2</code></li>
  <li>Compute the LM statistic: <code>LM = 0.5 * ESS_aux</code></li>
</ol>
Fixed critical threshold for 1 degree of freedom at alpha = 0.05 is <code>3.841</code>.
If <code>LM > 3.841</code>, output <code>HETEROSCEDASTIC</code>; otherwise <code>HOMOSCEDASTIC</code>.</p>`,
		task: "Given N, residuals e, and single auxiliary predictor z, compute the LM statistic and determine whether errors are HETEROSCEDASTIC or HOMOSCEDASTIC.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated residuals <code>e</code>.</p>
<p>The third line contains <code>N</code> space-separated values of predictor <code>z</code>.</p>`,
		outputFormat: `<p>Line 1: <code>LM</code> formatted with 4 decimal places.</p>
<p>Line 2: <code>HETEROSCEDASTIC</code> or <code>HOMOSCEDASTIC</code>.</p>`,
		constraints: formatConstraints([
			"5 <= N <= 50",
			"sigma^2 > 0",
			"Var(z) > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2613);
			const tcs = [];

			const solve = (N: number, e: number[], z: number[]) => {
				let sumSq = 0;
				for (let i = 0; i < N; i++) sumSq += e[i] * e[i];
				const sigma2 = sumSq / N;

				const g: number[] = [];
				for (let i = 0; i < N; i++) g.push((e[i] * e[i]) / sigma2);

				// Regress g on [1, z]
				const X: number[][] = [];
				for (let i = 0; i < N; i++) X.push([1, z[i]]);
				const gamma = solveOLS(X, g);

				let essAux = 0;
				for (let i = 0; i < N; i++) {
					const gHat = gamma[0] + gamma[1] * z[i];
					const d = gHat - 1.0;
					essAux += d * d;
				}

				const lm = 0.5 * essAux;
				const label = lm > 3.841 ? "HETEROSCEDASTIC" : "HOMOSCEDASTIC";
				return `${f4(lm)}\n${label}`;
			};

			tcs.push(makeTc(1, "5\n1 2 3 4 5\n1 2 3 4 5", solve(5, [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), true, "Sample with increasing residuals."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(6, 15);
				const z = rng.floatArray(N, 1, 20, 1);
				let e: number[];
				if (rng.next() > 0.5) {
					// Heteroscedastic: residual scales with z
					e = z.map((zi) => parseFloat((rng.nextFloat(-1, 1) * zi).toFixed(2)));
				} else {
					// Homoscedastic: constant variance
					e = rng.floatArray(N, -5, 5, 2);
				}
				tcs.push(makeTc(i, `${N}\n${e.join(" ")}\n${z.join(" ")}`, solve(N, e, z)));
			}

			return tcs;
		},
	},

	// 99. Maximum Residual and Chebyshev Bound
	{
		id: "lr-metrics-maximum-residual-error",
		title: "Maximum Residual and Median Absolute Error",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "max-error", "median-absolute-error"],
		description: "Compute the maximum absolute residual error, its 1-based sample index, and the median absolute error (MedAE).",
		story: `<p>Avionics guidance engineers at <b>OrbitalLaunch Dynamics</b> calibrate actuator thrust linear models. While average error is important, a single out-of-spec extreme error could destabilize trajectory control. They compute:
<ul>
  <li><code>MaxError = max_{i=1}^N |y_i - y_hat_i|</code></li>
  <li><code>Index = 1-based index of the first sample achieving MaxError</code></li>
  <li><code>MedAE = median(|y_1 - y_hat_1|, ..., |y_N - y_hat_N|)</code></li>
</ul>
For an even number of samples <code>N = 2m</code>, the median of sorted errors is the arithmetic average of the two central values.</p>`,
		task: "Given N, true values y, and predictions y_hat, compute MaxError, its 1-based index, and MedAE.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>MaxError Index MedAE</code> separated by spaces, with <code>MaxError</code> and <code>MedAE</code> formatted with 4 decimal places, and <code>Index</code> as an integer.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2614);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				const errors: number[] = [];
				let maxE = -1;
				let maxIdx = 1;

				for (let i = 0; i < n; i++) {
					const e = Math.abs(y[i] - yHat[i]);
					errors.push(e);
					if (e > maxE + 1e-9) {
						maxE = e;
						maxIdx = i + 1;
					}
				}

				const sorted = [...errors].sort((a, b) => a - b);
				let med = 0;
				if (n % 2 === 1) {
					med = sorted[Math.floor(n / 2)];
				} else {
					med = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
				}

				return `${f4(maxE)} ${maxIdx} ${f4(med)}`;
			};

			tcs.push(makeTc(1, "4\n10 20 30 40\n10 21 35 40", solve([10, 20, 30, 40], [10, 21, 35, 40]), true, "Errors are [0, 1, 5, 0]. Max is 5 at index 3. Sorted: [0, 0, 1, 5] -> median = 0.5."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const y = rng.floatArray(N, -30, 30, 2);
				const yHat = rng.floatArray(N, -30, 30, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},

	// 100. Mean Bias Error and Fractional Bias
	{
		id: "lr-metrics-mean-bias-error",
		title: "Mean Bias Error (MBE) and Fractional Bias",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "evaluation-metrics", "mbe", "fractional-bias"],
		description: "Compute Mean Bias Error (MBE), Fractional Bias (FB), and Normalized Mean Bias Error (NMBE).",
		story: `<p>Photovoltaic engineers at <b>HelioForecast Global</b> assess systematic over-prediction or under-prediction bias in solar panel irradiance regressions using directional bias metrics:
<ul>
  <li><code>MBE = 1/N * sum_{i=1}^N (y_hat_i - y_i)</code></li>
  <li><code>FB = 2 * (y_hat_bar - y_bar) / (y_hat_bar + y_bar)</code> (if <code>y_hat_bar + y_bar == 0</code>, <code>FB = 0.0000</code>)</li>
  <li><code>NMBE = (MBE / y_bar) * 100</code> (if <code>|y_bar| < 1e-6</code>, <code>NMBE = 0.0000</code>)</li>
</ul>
where <code>y_bar = 1/N * sum y_i</code> and <code>y_hat_bar = 1/N * sum y_hat_i</code>.</p>`,
		task: "Given N, true values y, and predictions y_hat, compute MBE, FB, and NMBE.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated numbers <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated numbers <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print <code>MBE FB NMBE</code> separated by spaces, each formatted with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"|y_bar| > 0.01"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2615);
			const tcs = [];

			const solve = (y: number[], yHat: number[]) => {
				const n = y.length;
				let sumY = 0;
				let sumYHat = 0;
				let sumDiff = 0;

				for (let i = 0; i < n; i++) {
					sumY += y[i];
					sumYHat += yHat[i];
					sumDiff += yHat[i] - y[i];
				}

				const mbe = sumDiff / n;
				const yBar = sumY / n;
				const yHatBar = sumYHat / n;

				const denomFB = yHatBar + yBar;
				const fb = Math.abs(denomFB) < 1e-9 ? 0 : (2 * (yHatBar - yBar)) / denomFB;

				const nmbe = Math.abs(yBar) < 1e-6 ? 0 : (mbe / yBar) * 100;

				return `${f4(mbe)} ${f4(fb)} ${f4(nmbe)}`;
			};

			tcs.push(makeTc(1, "2\n10 20\n12 22", solve([10, 20], [12, 22]), true, "y_bar=15, y_hat_bar=17, MBE=2. FB=2*(2)/32 = 0.1250, NMBE = 2/15*100 = 13.3333."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				let y: number[];
				let yBar = 0;
				do {
					y = rng.floatArray(N, 5, 50, 2);
					let s = 0;
					for (let v of y) s += v;
					yBar = s / N;
				} while (Math.abs(yBar) < 0.1);

				const yHat = rng.floatArray(N, 5, 50, 2);
				tcs.push(makeTc(i, `${N}\n${y.join(" ")}\n${yHat.join(" ")}`, solve(y, yHat)));
			}

			return tcs;
		},
	},
];
