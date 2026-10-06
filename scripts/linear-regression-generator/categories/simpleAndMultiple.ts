import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, solveOLS } from "../utils";

export const simpleAndMultipleProblems: LRProblemDefinition[] = [
	// 1. Simple OLS Slope and Intercept
	{
		id: "lr-simple-ols-slope-intercept",
		title: "Analytical Simple Linear Regression Estimator",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "ols", "statistics", "machine-learning"],
		description: "Compute the closed-form ordinary least squares intercept beta_0 and slope beta_1 for 2D points.",
		story: `<p>Engineers at <b>AeroDynamic Labs</b> test wind tunnel aerodynamic drag versus airflow velocity. For pairs of measurements <code>(x_i, y_i)</code>, the Ordinary Least Squares (OLS) line <code>y = beta_0 + beta_1 * x</code> has analytical closed-form coefficients:
<ul>
  <li><code>x_bar = 1/N * sum(x_i), y_bar = 1/N * sum(y_i)</code></li>
  <li><code>beta_1 = sum((x_i - x_bar)(y_i - y_bar)) / sum((x_i - x_bar)^2)</code></li>
  <li><code>beta_0 = y_bar - beta_1 * x_bar</code></li>
</ul></p>`,
		task: "Given N and the N (x, y) pairs, compute the intercept beta_0 and slope beta_1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two real numbers: <code>x_i</code> and <code>y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0</code> and <code>beta_1</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"sum((x_i - x_bar)^2) > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2001);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 2\n2 3\n3 4", "1.0000 1.0000", true, "Exact line y = 1 + 1x."));
			tcs.push(makeTc(2, "4\n1 2\n2 5\n3 3\n4 8", "0.5000 1.6000", true, "Slope=1.6, intercept=0.5."));

			const solve = (pts: [number, number][]): [number, number] => {
				const n = pts.length;
				const xBar = pts.reduce((s, p) => s + p[0], 0) / n;
				const yBar = pts.reduce((s, p) => s + p[1], 0) / n;
				let num = 0, den = 0;
				for (const [x, y] of pts) {
					num += (x - xBar) * (y - yBar);
					den += (x - xBar) ** 2;
				}
				const b1 = den === 0 ? 0 : num / den;
				const b0 = yBar - b1 * xBar;
				return [b0, b1];
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const trueB0 = rng.nextInt(-10, 10);
				const trueB1 = rng.nextInt(-5, 5);
				const pts: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(-10, 20).toFixed(2));
					const noise = parseFloat(rng.nextFloat(-2, 2).toFixed(2));
					pts.push([x, parseFloat((trueB0 + trueB1 * x + noise).toFixed(2))]);
				}
				pts[0][0] += 5; // ensure variance > 0
				const [b0, b1] = solve(pts);
				const inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b0)} ${f4(b1)}`));
			}

			return tcs;
		},
	},

	// 2. Regression Through the Origin (No-Intercept)
	{
		id: "lr-regression-through-origin",
		title: "Regression Through the Origin",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "ols", "origin", "physics"],
		description: "Fit a linear model forced through the origin: y = beta * x with beta = sum(x*y) / sum(x^2).",
		story: `<p>Ohm's Law states that voltage <code>V</code> is directly proportional to current <code>I</code>: <code>V = R * I</code> with zero intercept. At <b>VoltMetrics</b>, sensors fit zero-intercept models <code>y = beta * x</code> by minimizing sum of squared residuals:
<code>beta = sum_{i=1}^N (x_i * y_i) / sum_{i=1}^N (x_i^2)</code>.</p>`,
		task: "Given N and N pairs of (x, y), compute slope beta forced through the origin.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two real numbers: <code>x_i</code> and <code>y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"sum(x_i^2) > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2002);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 2\n2 4", "2.0000", true, "Exact line y = 2x."));
			tcs.push(makeTc(2, "3\n1 3\n2 5\n3 8", "2.7857", true, "beta = (3+10+24)/(1+4+9) = 37/14 = 2.7857."));

			const solve = (pts: [number, number][]): number => {
				let num = 0, den = 0;
				for (const [x, y] of pts) {
					num += x * y;
					den += x * x;
				}
				return den === 0 ? 0 : num / den;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(2, 12);
				const pts: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(0.5, 15).toFixed(2));
					const y = parseFloat((x * 3.5 + rng.nextFloat(-1, 1)).toFixed(2));
					pts.push([x, y]);
				}
				const b = solve(pts);
				const inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, f4(b)));
			}

			return tcs;
		},
	},

	// 3. Centered OLS Multiple Linear Regression
	{
		id: "lr-centered-ols-coefficients",
		title: "Centered Multiple Linear Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "ols", "centering", "multiple-regression"],
		description: "De-mean features and targets, solve for slopes beta_1..beta_D, and recover intercept beta_0 = y_bar - sum(beta_j * x_bar_j).",
		story: `<p>Econometricians at <b>MacroStat Institute</b> estimate production elasticity. To minimize multicollinearity with the constant term, features and responses are centered:
<code>x_tilde = x - x_bar, y_tilde = y - y_bar</code>.
After solving for slopes <code>beta_1, ..., beta_D</code> via centered Normal Equations <code>(X_tilde^T X_tilde)^(-1) X_tilde^T y_tilde</code>, the intercept is recovered as:
<code>beta_0 = y_bar - sum_{j=1}^D beta_j * x_bar_j</code>.</p>`,
		task: "Given N samples and D features, compute intercept beta_0 and slope coefficients beta_1 ... beta_D.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>D</code> (features).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing features <code>X</code> followed by target <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0</code> followed by <code>beta_1 ... beta_D</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D + 1 <= N <= 50",
			"1 <= D <= 3"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2003);
			const tcs = [];

			tcs.push(makeTc(1, "3 1\n1 3\n2 5\n3 7", "1.0000 2.0000", true, "y = 1 + 2x."));

			const solveCentered = (N: number, D: number, rows: number[][]): number[] => {
				const X = rows.map((r) => r.slice(0, D));
				const y = rows.map((r) => r[D]);

				const xBars = new Array(D).fill(0);
				for (let d = 0; d < D; d++) {
					xBars[d] = X.reduce((s, row) => s + row[d], 0) / N;
				}
				const yBar = y.reduce((s, v) => s + v, 0) / N;

				const Xtilde = X.map((row) => row.map((val, d) => val - xBars[d]));
				const ytilde = y.map((val) => val - yBar);

				const betaSlopes = solveOLS(Xtilde, ytilde, 1e-7);
				let b0 = yBar;
				for (let d = 0; d < D; d++) b0 -= betaSlopes[d] * xBars[d];

				return [b0, ...betaSlopes];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 12);
				const D = rng.nextInt(1, 2);
				const trueCoeffs = rng.floatArray(D + 1, -3, 3, 1);
				const rows: number[][] = [];

				for (let j = 0; j < N; j++) {
					const xRow = rng.floatArray(D, -5, 10, 1);
					let yVal = trueCoeffs[0];
					for (let d = 0; d < D; d++) yVal += trueCoeffs[d + 1] * xRow[d];
					yVal += parseFloat(rng.nextFloat(-0.5, 0.5).toFixed(2));
					rows.push([...xRow, parseFloat(yVal.toFixed(2))]);
				}
				rows[0][0] += 3;

				const coeffs = solveCentered(N, D, rows);
				let inStr = `${N} ${D}\n` + rows.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, coeffs.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 4. Standardized Regression Coefficients
	{
		id: "lr-standardized-coefficients",
		title: "Standardized Regression Coefficients",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "standardization", "correlation", "statistics"],
		description: "Compute standardized regression slope beta_std = r_{xy} = sum(z_x * z_y) / N.",
		story: `<p>In clinical biostatistics at <b>BioGenome Labs</b>, predictor variables have different medical scales (e.g. blood pressure in mmHg vs glucose in mg/dL). Researchers use <b>Standardized Regression Coefficients</b> <code>beta_std</code>, equivalent to the Pearson correlation coefficient <code>r_{xy}</code>:
<code>z_x = (x - mu_x) / sigma_x, z_y = (y - mu_y) / sigma_y</code>
<code>beta_std = 1/N * sum_{i=1}^N (z_x,i * z_y,i)</code>.</p>`,
		task: "Given N pairs of (x, y), compute the standardized regression coefficient beta_std.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two real numbers: <code>x_i</code> and <code>y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_std</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 100",
			"sigma_x > 0 and sigma_y > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2004);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 2\n2 4\n3 6", "1.0000", true, "Perfect linear correlation."));
			tcs.push(makeTc(2, "3\n1 6\n2 4\n3 2", "-1.0000", true, "Perfect negative correlation."));

			const solveStd = (pts: [number, number][]): number => {
				const n = pts.length;
				const muX = pts.reduce((s, p) => s + p[0], 0) / n;
				const muY = pts.reduce((s, p) => s + p[1], 0) / n;
				const sigX = Math.sqrt(pts.reduce((s, p) => s + (p[0] - muX) ** 2, 0) / n);
				const sigY = Math.sqrt(pts.reduce((s, p) => s + (p[1] - muY) ** 2, 0) / n);
				if (sigX === 0 || sigY === 0) return 0;

				let sumProd = 0;
				for (const [x, y] of pts) {
					sumProd += ((x - muX) / sigX) * ((y - muY) / sigY);
				}
				return sumProd / n;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(4, 15);
				const pts: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(1, 50).toFixed(1));
					const y = parseFloat(rng.nextFloat(1, 50).toFixed(1));
					pts.push([x, y]);
				}
				pts[0][0] += 5;
				pts[0][1] += 5;
				const b = solveStd(pts);
				const inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, f4(b)));
			}

			return tcs;
		},
	},

	// 5. Two-Feature OLS Closed Form
	{
		id: "lr-two-feature-ols-closed-form",
		title: "Two-Feature Multiple OLS Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "ols", "multiple-regression"],
		description: "Fit plane y = beta_0 + beta_1 * x_1 + beta_2 * x_2 using OLS.",
		story: `<p>Geothermal exploration platform <b>TerraHeat</b> models underground heat flow <code>y</code> as a function of depth <code>x_1</code> and seismic wave velocity <code>x_2</code>:
<code>y = beta_0 + beta_1 * x_1 + beta_2 * x_2</code>.
Using the design matrix <code>X = [1, x_1, x_2]</code>, the parameters satisfy <code>beta = (X^T X)^(-1) X^T y</code>.</p>`,
		task: "Given N samples with features x_1, x_2, and target y, find beta_0, beta_1, and beta_2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 3 real numbers: <code>x_{i1} x_{i2} y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 beta_2</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 50",
			"X has full column rank"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2005);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 0 2\n0 1 3\n1 1 4", "1.0000 1.0000 2.0000", true, "y = 1 + 1x_1 + 2x_2."));

			const solve2F = (rows: [number, number, number][]): number[] => {
				const X = rows.map(([x1, x2]) => [1, x1, x2]);
				const y = rows.map((r) => r[2]);
				return solveOLS(X, y, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 12);
				const b0 = rng.nextInt(-3, 5);
				const b1 = rng.nextInt(-2, 3);
				const b2 = rng.nextInt(-2, 3);

				const rows: [number, number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x1 = parseFloat(rng.nextFloat(-5, 5).toFixed(1));
					const x2 = parseFloat(rng.nextFloat(-5, 5).toFixed(1));
					const y = parseFloat((b0 + b1 * x1 + b2 * x2 + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					rows.push([x1, x2, y]);
				}
				rows[0][0] += 2;
				rows[1][1] += 2;

				const res = solve2F(rows);
				let inStr = `${N}\n` + rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 6. Multi-Target Linear Regression
	{
		id: "lr-multi-target-linear-regression",
		title: "Multi-Target Linear Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "multi-output", "matrix-operations"],
		description: "Fit multi-output linear regression W = (X^T X)^(-1) X^T Y for Y in R^(N x M).",
		story: `<p>Avionics telemetry at <b>AeroNav</b> concurrently predicts multiple control surface deflections: aileron, elevator, and rudder deflections <code>Y in R^(N x M)</code> from flight sensors <code>X in R^(N x D)</code>:
<code>W = (X^T X)^(-1) X^T Y in R^(D x M)</code>.</p>`,
		task: "Given N, D, M, matrix X (N x D), and target matrix Y (N x M), compute weight matrix W (D rows of M values).",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and <code>M</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers for <code>X</code>.</p>
<p>The next <code>N</code> lines each contain <code>M</code> real numbers for <code>Y</code>.</p>`,
		outputFormat: `<p>Print <code>D</code> lines, each containing <code>M</code> real numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 4",
			"1 <= M <= 4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2006);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 2\n1 0\n0 1\n2 3\n4 5", "2.0000 3.0000\n4.0000 5.0000", true, "Identity X matrix matches targets."));

			const solveMulti = (N: number, D: number, M: number, X: number[][], Y: number[][]): string[] => {
				const W: number[][] = Array.from({ length: D }, () => new Array(M).fill(0));
				for (let m = 0; m < M; m++) {
					const ym = Y.map((r) => r[m]);
					const wm = solveOLS(X, ym, 1e-7);
					for (let d = 0; d < D; d++) W[d][m] = wm[d];
				}
				return W.map((row) => row.map(f4).join(" "));
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const D = rng.nextInt(1, 3);
				const M = rng.nextInt(1, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 1));
				X[0][0] += 2;
				const Y = Array.from({ length: N }, () => rng.floatArray(M, -10, 10, 1));

				const out = solveMulti(N, D, M, X, Y);
				let inStr = `${N} ${D} ${M}\n` +
					X.map((r) => r.join(" ")).join("\n") + "\n" +
					Y.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 7. Polynomial Degree-2 Expansion
	{
		id: "lr-polynomial-degree2-expansion",
		title: "Degree-2 Polynomial Linear Curve Fitting",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "polynomial-regression", "curve-fitting"],
		description: "Expand 1D feature into basis [1, x, x^2] and solve for quadratic coefficients beta_0, beta_1, beta_2.",
		story: `<p>A ballistics tracking system at <b>KineticDefense</b> models projectile trajectories following parabolic flight paths: <code>y = beta_0 + beta_1 * x + beta_2 * x^2</code>. By constructing design matrix <code>X = [1, x, x^2]</code>, the quadratic parameters are determined via linear regression.</p>`,
		task: "Given N pairs of (x_i, y_i), compute parabolic coefficients beta_0, beta_1, and beta_2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i</code> and <code>y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 beta_2</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 50"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2007);
			const tcs = [];

			tcs.push(makeTc(1, "3\n0 1\n1 2\n2 5", "1.0000 0.0000 1.0000", true, "Exact parabola y = 1 + x^2."));

			const solvePoly2 = (pts: [number, number][]): number[] => {
				const X = pts.map(([x]) => [1, x, x * x]);
				const y = pts.map((p) => p[1]);
				return solveOLS(X, y, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(4, 10);
				const b0 = rng.nextInt(-3, 3);
				const b1 = rng.nextInt(-2, 2);
				const b2 = rng.nextInt(1, 3);
				const pts: [number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(-3, 5).toFixed(1));
					const y = parseFloat((b0 + b1 * x + b2 * x * x + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					pts.push([x, y]);
				}
				pts[0][0] += 2;

				const res = solvePoly2(pts);
				const inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 8. Categorical Dummy Variable
	{
		id: "lr-categorical-dummy-variable",
		title: "Linear Regression with Categorical Indicator",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["linear-regression", "dummy-variables", "categorical"],
		description: "Fit y = beta_0 + beta_1 * x_1 + beta_2 * c where c in {0, 1} is a binary treatment dummy.",
		story: `<p>A clinical trial testing hypertension therapy at <b>MedVantage</b> models blood pressure reduction <code>y</code> using baseline pressure <code>x_1</code> and a binary indicator <code>c in {0, 1}</code> (0 = placebo, 1 = active drug): <code>y = beta_0 + beta_1 * x_1 + beta_2 * c</code>.</p>`,
		task: "Given N triplets (x_1, c, y), compute beta_0, beta_1, and treatment effect beta_2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_1</code>, binary integer <code>c</code>, and <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 beta_2</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 50",
			"c in {0, 1}"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2008);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 0 2\n2 0 3\n1 1 5\n2 1 6", "1.0000 1.0000 3.0000", true, "Placebo y = 1 + x, drug adds +3."));

			const solveDummy = (rows: [number, number, number][]): number[] => {
				const X = rows.map(([x1, c]) => [1, x1, c]);
				const y = rows.map((r) => r[2]);
				return solveOLS(X, y, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(5, 12);
				const b0 = rng.nextInt(1, 5);
				const b1 = rng.nextInt(1, 3);
				const b2 = rng.nextInt(2, 6);
				const rows: [number, number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x1 = parseFloat(rng.nextFloat(1, 10).toFixed(1));
					const c = j % 2 === 0 ? 0 : 1;
					const y = parseFloat((b0 + b1 * x1 + b2 * c + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					rows.push([x1, c, y]);
				}
				rows[0][0] += 2;

				const res = solveDummy(rows);
				let inStr = `${N}\n` + rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 9. Weighted Bivariate Regression
	{
		id: "lr-weighted-bivariate-regression",
		title: "Weighted Bivariate Linear Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "weighted-least-squares", "statistics"],
		description: "Fit weighted simple linear regression y = beta_0 + beta_1 * x with sample weights w_i.",
		story: `<p>At <b>CensusAnalytics</b>, survey observations have survey sample weights <code>w_i > 0</code> representing inverse sampling probabilities. The weighted least squares line <code>y = beta_0 + beta_1 * x</code> minimizes <code>sum w_i (y_i - beta_0 - beta_1 x_i)^2</code>:
<ul>
  <li><code>x_bar_w = sum(w_i x_i) / sum(w_i), y_bar_w = sum(w_i y_i) / sum(w_i)</code></li>
  <li><code>beta_1 = sum(w_i (x_i - x_bar_w)(y_i - y_bar_w)) / sum(w_i (x_i - x_bar_w)^2)</code></li>
  <li><code>beta_0 = y_bar_w - beta_1 * x_bar_w</code></li>
</ul></p>`,
		task: "Given N and N triplets of (x_i, y_i, w_i), compute weighted intercept beta_0 and slope beta_1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 3 real numbers: <code>x_i y_i w_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"w_i > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2009);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 2 1.0\n3 6 2.0", "0.0000 2.0000", true, "Exact line y = 2x with weights."));

			const solveWLS1D = (pts: [number, number, number][]): [number, number] => {
				const sumW = pts.reduce((s, p) => s + p[2], 0);
				const xBarW = pts.reduce((s, p) => s + p[2] * p[0], 0) / sumW;
				const yBarW = pts.reduce((s, p) => s + p[2] * p[1], 0) / sumW;

				let num = 0, den = 0;
				for (const [x, y, w] of pts) {
					num += w * (x - xBarW) * (y - yBarW);
					den += w * (x - xBarW) ** 2;
				}
				const b1 = den === 0 ? 0 : num / den;
				const b0 = yBarW - b1 * xBarW;
				return [b0, b1];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const pts: [number, number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(-5, 15).toFixed(1));
					const y = parseFloat((2 * x + 1 + rng.nextFloat(-1, 1)).toFixed(2));
					const w = parseFloat(rng.nextFloat(0.5, 5.0).toFixed(1));
					pts.push([x, y, w]);
				}
				pts[0][0] += 3;
				const [b0, b1] = solveWLS1D(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]} ${p[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b0)} ${f4(b1)}`));
			}

			return tcs;
		},
	},

	// 10. Orthogonal Distance Regression (Total Least Squares)
	{
		id: "lr-orthogonal-distance-regression",
		title: "Orthogonal Distance Regression (Deming)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "total-least-squares", "orthogonal-distance"],
		description: "Fit line minimizing perpendicular Euclidean distances: beta_1 = ((s_yy - s_xx) + sqrt((s_yy - s_xx)^2 + 4 s_xy^2)) / (2 s_xy).",
		story: `<p>In astronomy at <b>Kepler AstroLab</b>, both stellar luminosity <code>x</code> and distance <code>y</code> carry measurement errors (errors-in-variables). <b>Orthogonal Distance Regression (Total Least Squares)</b> minimizes perpendicular distances to line <code>y = beta_0 + beta_1 * x</code>:
<code>s_xx = sum(x - x_bar)^2, s_yy = sum(y - y_bar)^2, s_xy = sum(x - x_bar)(y - y_bar)</code>
<code>beta_1 = ((s_yy - s_xx) + sqrt((s_yy - s_xx)^2 + 4 * s_xy^2)) / (2 * s_xy)</code>
<code>beta_0 = y_bar - beta_1 * x_bar</code>.</p>`,
		task: "Given N and N pairs of (x_i, y_i), compute orthogonal regression intercept beta_0 and slope beta_1.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"s_xy > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2010);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 1\n3 3", "0.0000 1.0000", true, "Exact diagonal line."));

			const solveODR = (pts: [number, number][]): [number, number] => {
				const n = pts.length;
				const xBar = pts.reduce((s, p) => s + p[0], 0) / n;
				const yBar = pts.reduce((s, p) => s + p[1], 0) / n;

				let sxx = 0, syy = 0, sxy = 0;
				for (const [x, y] of pts) {
					sxx += (x - xBar) ** 2;
					syy += (y - yBar) ** 2;
					sxy += (x - xBar) * (y - yBar);
				}
				if (sxy === 0) sxy = 1e-9;
				const b1 = ((syy - sxx) + Math.sqrt((syy - sxx) ** 2 + 4 * sxy * sxy)) / (2 * sxy);
				const b0 = yBar - b1 * xBar;
				return [b0, b1];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 12);
				const pts: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(1, 20).toFixed(1));
					const y = parseFloat((x * 1.5 + rng.nextFloat(-1, 1)).toFixed(2));
					pts.push([x, y]);
				}
				pts[0][0] += 3;
				pts[0][1] += 5;
				const [b0, b1] = solveODR(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b0)} ${f4(b1)}`));
			}

			return tcs;
		},
	},

	// 11. Constrained Sum-To-One Regression
	{
		id: "lr-constrained-sum-to-one-regression",
		title: "Constrained Sum-to-One Linear Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "constrained-optimization", "finance"],
		description: "Fit y = beta_1 * x_1 + beta_2 * x_2 subject to exact constraint beta_1 + beta_2 = 1.",
		story: `<p>Quantitative portfolio managers at <b>AlphaBlend Asset Management</b> allocate capital between two mutual funds: <code>y = beta_1 * x_1 + beta_2 * x_2</code> under the 100% budget constraint <code>beta_1 + beta_2 = 1</code>.
Substituting <code>beta_2 = 1 - beta_1</code> converts the problem to single-variable regression:
<code>(y - x_2) = beta_1 * (x_1 - x_2)</code>
<code>beta_1 = sum((x_1 - x_2)(y - x_2)) / sum((x_1 - x_2)^2)</code>, and <code>beta_2 = 1 - beta_1</code>.</p>`,
		task: "Given N triplets (x_{i1}, x_{i2}, y_i), compute portfolio weights beta_1 and beta_2.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 3 real numbers: <code>x_1 x_2 y</code>.</p>`,
		outputFormat: `<p>Print <code>beta_1 beta_2</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"sum((x_1 - x_2)^2) > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2011);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 3 2\n2 4 3", "0.5000 0.5000", true, "50/50 blend."));

			const solveConstrained = (pts: [number, number, number][]): [number, number] => {
				let num = 0, den = 0;
				for (const [x1, x2, y] of pts) {
					const u = x1 - x2;
					const v = y - x2;
					num += u * v;
					den += u * u;
				}
				const b1 = den === 0 ? 0.5 : num / den;
				const b2 = 1 - b1;
				return [b1, b2];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const pts: [number, number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x1 = parseFloat(rng.nextFloat(0, 10).toFixed(1));
					const x2 = parseFloat(rng.nextFloat(0, 10).toFixed(1));
					const y = parseFloat((0.6 * x1 + 0.4 * x2 + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					pts.push([x1, x2, y]);
				}
				pts[0][0] += 3;
				const [b1, b2] = solveConstrained(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]} ${p[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(b1)} ${f4(b2)}`));
			}

			return tcs;
		},
	},

	// 12. Linear Spline with Fixed Knot
	{
		id: "lr-linear-spline-fixed-knot",
		title: "Linear Spline Regression with Fixed Knot",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "splines", "basis-expansion"],
		description: "Fit piecewise linear model y = beta_0 + beta_1 * x + beta_2 * max(0, x - c) with known knot c.",
		story: `<p>Actuaries at <b>InsurTech Risk</b> model health claims that experience a structural shift once medical age exceeds threshold knot <code>c</code>. A piecewise linear spline is formulated via basis expansion:
<code>y = beta_0 + beta_1 * x + beta_2 * (x - c)_+</code>
where <code>(x - c)_+ = max(0, x - c)</code>.</p>`,
		task: "Given knot c, sample count N, and N pairs of (x_i, y_i), compute coefficients beta_0, beta_1, and slope shift beta_2.",
		inputFormat: `<p>The first line contains real number <code>c</code> (knot) and integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 beta_2</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 50",
			"points exist on both sides of knot c"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2012);
			const tcs = [];

			tcs.push(makeTc(1, "5.0 3\n0 1\n5 6\n10 16", "1.0000 1.0000 1.0000", true, "Slope increases from 1 to 2 after knot c=5."));

			const solveSpline = (c: number, pts: [number, number][]): number[] => {
				const X = pts.map(([x]) => [1, x, Math.max(0, x - c)]);
				const y = pts.map((p) => p[1]);
				return solveOLS(X, y, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const c = parseFloat(rng.nextFloat(3, 7).toFixed(1));
				const N = rng.nextInt(5, 12);
				const pts: [number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(0, 12).toFixed(1));
					const y = parseFloat((2 + 1.5 * x + 2.0 * Math.max(0, x - c) + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					pts.push([x, y]);
				}
				pts[0][0] = c - 2;
				pts[1][0] = c + 2;

				const res = solveSpline(c, pts);
				let inStr = `${c} ${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 13. Interaction Terms Linear Regression
	{
		id: "lr-interaction-terms-regression",
		title: "Linear Regression with Interaction Term",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "interaction-terms", "feature-engineering"],
		description: "Fit model with synergistic interaction: y = beta_0 + beta_1 * x_1 + beta_2 * x_2 + beta_3 * (x_1 * x_2).",
		story: `<p>Agronomists at <b>BioCrop Research</b> test crop yield <code>y</code> as a function of fertilizer dosage <code>x_1</code> and irrigation level <code>x_2</code>. Because water enhances nutrient uptake, an interaction feature <code>x_1 * x_2</code> is included:
<code>y = beta_0 + beta_1 * x_1 + beta_2 * x_2 + beta_3 * (x_1 * x_2)</code>.</p>`,
		task: "Given N triplets (x_{i1}, x_{i2}, y_i), compute coefficients beta_0, beta_1, beta_2, beta_3.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_1 x_2 y</code>.</p>`,
		outputFormat: `<p>Print <code>beta_0 beta_1 beta_2 beta_3</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"4 <= N <= 50"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2013);
			const tcs = [];

			tcs.push(makeTc(1, "4\n0 0 1\n1 0 2\n0 1 3\n1 1 5", "1.0000 1.0000 2.0000 1.0000", true, "Interaction adds 1 when both x_1, x_2 = 1."));

			const solveInteraction = (rows: [number, number, number][]): number[] => {
				const X = rows.map(([x1, x2]) => [1, x1, x2, x1 * x2]);
				const y = rows.map((r) => r[2]);
				return solveOLS(X, y, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(6, 12);
				const rows: [number, number, number][] = [];
				for (let j = 0; j < N; j++) {
					const x1 = parseFloat(rng.nextFloat(0, 5).toFixed(1));
					const x2 = parseFloat(rng.nextFloat(0, 5).toFixed(1));
					const y = parseFloat((1 + 2 * x1 + 3 * x2 + 1.5 * x1 * x2 + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					rows.push([x1, x2, y]);
				}
				rows[0][0] += 2;

				const res = solveInteraction(rows);
				let inStr = `${N}\n` + rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 14. Log-Linear Exponential Growth Regression
	{
		id: "lr-log-linear-exponential-growth",
		title: "Log-Linear Exponential Growth Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "exponential-model", "log-transform"],
		description: "Fit exponential curve y = A * exp(B * x) by linearizing ln(y) = ln(A) + B * x.",
		story: `<p>Epidemiologists at <b>GlobalHealth Sentinel</b> track viral reproduction count. Disease growth follows an exponential model <code>y = A * exp(B * x)</code>. Taking the natural logarithm transforms this into a linear relationship:
<code>ln(y) = ln(A) + B * x = beta_0 + beta_1 * x</code>
where <code>A = exp(beta_0)</code> and <code>B = beta_1</code>.</p>`,
		task: "Given N pairs (x_i, y_i) with y_i > 0, estimate parameter A and exponential growth rate B.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>A B</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"y_i > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2014);
			const tcs = [];

			tcs.push(makeTc(1, "2\n0 2.0\n1 5.43656", "2.0000 1.0000", true, "A=2, B=1: y = 2*e^x."));

			const solveExp = (pts: [number, number][]): [number, number] => {
				const n = pts.length;
				const xBar = pts.reduce((s, p) => s + p[0], 0) / n;
				const zBar = pts.reduce((s, p) => s + Math.log(p[1]), 0) / n;

				let num = 0, den = 0;
				for (const [x, y] of pts) {
					const z = Math.log(y);
					num += (x - xBar) * (z - zBar);
					den += (x - xBar) ** 2;
				}
				const b1 = den === 0 ? 0 : num / den;
				const b0 = zBar - b1 * xBar;
				return [Math.exp(b0), b1];
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const trueA = parseFloat(rng.nextFloat(1, 5).toFixed(1));
				const trueB = parseFloat(rng.nextFloat(0.1, 0.8).toFixed(2));
				const pts: [number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(0, 5).toFixed(1));
					const y = parseFloat((trueA * Math.exp(trueB * x) * (1 + rng.nextFloat(-0.05, 0.05))).toFixed(3));
					pts.push([x, Math.max(0.01, y)]);
				}
				pts[0][0] += 2;

				const [A, B] = solveExp(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(A)} ${f4(B)}`));
			}

			return tcs;
		},
	},

	// 15. Power-Law Log-Log Regression
	{
		id: "lr-power-law-log-log-regression",
		title: "Power-Law Log-Log Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "power-law", "log-transform"],
		description: "Fit power-law curve y = A * x^B by linearizing ln(y) = ln(A) + B * ln(x).",
		story: `<p>Urban scientists at <b>MetroMetrics</b> model city population versus infrastructure scaling following Kleiber's power law: <code>y = A * x^B</code>. Applying a log-log transformation converts this to standard linear regression:
<code>ln(y) = ln(A) + B * ln(x) = beta_0 + beta_1 * ln(x)</code>
where <code>A = exp(beta_0)</code> and power exponent is <code>B = beta_1</code>.</p>`,
		task: "Given N pairs (x_i, y_i) with x_i, y_i > 0, estimate amplitude A and power exponent B.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain <code>x_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>A B</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"x_i > 0 and y_i > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2015);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 2\n4 8", "2.0000 1.0000", true, "y = 2 * x^1."));
			tcs.push(makeTc(2, "2\n1 3\n2 12", "3.0000 2.0000", true, "y = 3 * x^2."));

			const solvePowerLaw = (pts: [number, number][]): [number, number] => {
				const n = pts.length;
				const uBar = pts.reduce((s, p) => s + Math.log(p[0]), 0) / n;
				const zBar = pts.reduce((s, p) => s + Math.log(p[1]), 0) / n;

				let num = 0, den = 0;
				for (const [x, y] of pts) {
					const u = Math.log(x);
					const z = Math.log(y);
					num += (u - uBar) * (z - zBar);
					den += (u - uBar) ** 2;
				}
				const b1 = den === 0 ? 0 : num / den;
				const b0 = zBar - b1 * uBar;
				return [Math.exp(b0), b1];
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const trueA = parseFloat(rng.nextFloat(1, 4).toFixed(1));
				const trueB = parseFloat(rng.nextFloat(0.5, 2.5).toFixed(2));
				const pts: [number, number][] = [];

				for (let j = 0; j < N; j++) {
					const x = parseFloat(rng.nextFloat(1, 10).toFixed(1));
					const y = parseFloat((trueA * (x ** trueB) * (1 + rng.nextFloat(-0.05, 0.05))).toFixed(3));
					pts.push([x, Math.max(0.01, y)]);
				}
				pts[0][0] += 3;

				const [A, B] = solvePowerLaw(pts);
				let inStr = `${N}\n` + pts.map((p) => `${p[0]} ${p[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, `${f4(A)} ${f4(B)}`));
			}

			return tcs;
		},
	},
];
