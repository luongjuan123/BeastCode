import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, f2 } from "../utils";

export const regressionProblems: MLProblemDefinition[] = [
	// 1. Predict Fuel Prices for Bomboclat Logistics using Linear Regression
	{
		id: "predict-fuel-prices-bomboclat-logistics",
		title: "Predict Fuel Prices for Bomboclat Logistics using Linear Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "linear-regression", "least-squares", "gradient-descent"],
		description: "Train a Multiple Linear Regression model on historical logistics indicators and predict fuel prices.",
		story: `<p>Bomboclat Company is one of the largest logistics providers in the region, operating thousands of trucks that transport goods between warehouses, factories, and retail stores every day. Fuel is one of the company's largest operating expenses, and even small fluctuations in fuel prices can have a significant impact on its overall costs.</p>
<p>Traditionally, Bomboclat relied on market analysts to estimate future fuel prices based on historical trends and various economic factors. However, with the increasing amount of available data, the company has decided to adopt a data-driven approach to improve the accuracy of its forecasts. The data science team at Bomboclat has collected historical records containing several market indicators along with the corresponding fuel prices. They believe that fuel prices can be approximated by a linear relationship between these indicators and the target price.</p>
<p>Your task is to implement a Linear Regression model that learns from the historical data and predicts fuel prices for future market conditions. By producing accurate predictions, Bomboclat can better plan fuel purchases, optimize transportation costs, and improve the efficiency of its logistics operations.</p>`,
		task: "Train a multiple linear regression model on m training examples with n features using the exact Ordinary Least Squares (OLS) closed-form solution via Normal Equations: theta = (X^T X)^(-1) X^T y (with an intercept column x_0 = 1 prepended). Print the model parameters (theta0, theta1, ..., thetan) and the predicted fuel prices for t test scenarios, all formatted with exactly 4 decimal places.",
		inputFormat: `<p>The first line contains three integers <code>m</code>, <code>n</code>, and <code>t</code>: the number of training examples, features, and test scenarios.</p>
<p>The next <code>n</code> lines each contain <code>m</code> real numbers representing the values of feature <code>j</code> across the <code>m</code> training examples.</p>
<p>The next line contains <code>m</code> real numbers: the target fuel prices <code>y</code>.</p>
<p>The next <code>n</code> lines each contain <code>t</code> real numbers representing feature <code>j</code> across the <code>t</code> test scenarios.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>The first line contains <code>n + 1</code> real numbers: <code>theta0 theta1 ... thetan</code> (theta0 is intercept).</p>
<p>The second line contains <code>t</code> real numbers representing predicted prices.</p>
<p>All values must be printed with exactly 4 decimal places separated by spaces.</p>`,
		constraints: formatConstraints([
			"5 <= m <= 100",
			"1 <= n <= 5",
			"1 <= t <= 20",
			"All feature and target values are real numbers",
			"The training matrix admits a unique least-squares solution",
			"Use the exact OLS Normal Equation closed-form solution: theta = (X^T X)^(-1) X^T y",
			"Intercept theta0 corresponds to prepending a column of 1s to the feature matrix"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(101);
			const tcs = [];

			// Sample from user prompt
			const sIn = `10 2 3
1 2 3 4 5 6 7 8 9 10
2 3 4 1 2 4 5 2 3 1
18 23 28 21 26 34 39 32 37 33
11 12 13
4 5 6`;
			const sOut = `10.0000 2.0000 3.0000\n44.0000 49.0000 54.0000`;
			tcs.push(makeTc(1, sIn, sOut, true, "Model y = 10 + 2*x1 + 3*x2 predicts 44, 49, 54."));

			// Sample 2: 1 feature
			const s2In = `5 1 2\n1 2 3 4 5\n5 8 11 14 17\n6 7`;
			const s2Out = `2.0000 3.0000\n20.0000 23.0000`;
			tcs.push(makeTc(2, s2In, s2Out, true, "1D linear model y = 2 + 3*x."));

			// Normal equations solver using Gauss-Jordan elimination
			const solveOLS = (m: number, n: number, X_cols: number[][], y: number[], X_test_cols: number[][]): { thetas: number[]; preds: number[] } => {
				const XtX: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
				const Xty: number[] = new Array(n + 1).fill(0);

				for (let i = 0; i < m; i++) {
					const row = [1];
					for (let j = 0; j < n; j++) row.push(X_cols[j][i]);

					for (let r = 0; r <= n; r++) {
						Xty[r] += row[r] * y[i];
						for (let c = 0; c <= n; c++) {
							XtX[r][c] += row[r] * row[c];
						}
					}
				}

				// Gauss-Jordan elimination
				const A = XtX.map((r, idx) => [...r, Xty[idx]]);
				const dim = n + 1;
				for (let i = 0; i < dim; i++) {
					let maxRow = i;
					for (let k = i + 1; k < dim; k++) {
						if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
					}
					[A[i], A[maxRow]] = [A[maxRow], A[i]];

					const pivot = A[i][i];
					for (let j = i; j <= dim; j++) A[i][j] /= pivot;

					for (let k = 0; k < dim; k++) {
						if (k !== i) {
							const factor = A[k][i];
							for (let j = i; j <= dim; j++) A[k][j] -= factor * A[i][j];
						}
					}
				}

				const thetas = A.map((r) => r[dim]);
				const t = X_test_cols[0].length;
				const preds: number[] = [];
				for (let i = 0; i < t; i++) {
					let p = thetas[0];
					for (let j = 0; j < n; j++) {
						p += thetas[j + 1] * X_test_cols[j][i];
					}
					preds.push(p);
				}

				return { thetas, preds };
			};

			for (let i = 3; i <= 100; i++) {
				const m = rng.nextInt(10, 30);
				const n = rng.nextInt(1, 3);
				const t = rng.nextInt(2, 6);

				const trueThetas = [rng.nextInt(-10, 20)];
				for (let j = 0; j < n; j++) trueThetas.push(rng.nextInt(-5, 10));

				const X_cols: number[][] = [];
				for (let j = 0; j < n; j++) {
					X_cols.push(rng.intArray(m, 1, 25));
				}

				const y: number[] = [];
				for (let r = 0; r < m; r++) {
					let val = trueThetas[0];
					for (let j = 0; j < n; j++) val += trueThetas[j + 1] * X_cols[j][r];
					y.push(val);
				}

				const X_test_cols: number[][] = [];
				for (let j = 0; j < n; j++) {
					X_test_cols.push(rng.intArray(t, 26, 45));
				}

				const { thetas, preds } = solveOLS(m, n, X_cols, y, X_test_cols);

				let inStr = `${m} ${n} ${t}\n`;
				inStr += X_cols.map((col) => col.join(" ")).join("\n") + "\n";
				inStr += y.join(" ") + "\n";
				inStr += X_test_cols.map((col) => col.join(" ")).join("\n");

				const outStr = `${thetas.map(f4).join(" ")}\n${preds.map(f4).join(" ")}`;
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 2. Hyperion Solar Power Forecasting (Simple Linear Regression)
	{
		id: "hyperion-solar-power-forecasting",
		title: "Hyperion Solar Power Forecasting",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "linear-regression", "statistics"],
		description: "Compute the least-squares slope and intercept to predict solar panel megawatt output from solar irradiance.",
		story: `<p>The Hyperion Solar Array in the Mojave Desert gathers energy through thousands of photovoltaic panels. Power grid dispatchers require an exact simple linear regression formula <code>y = m*x + b</code> relating solar irradiance <code>x</code> (in W/m&sup2;) to electricity output <code>y</code> (in MW).</p>`,
		task: "Compute the least-squares slope (m) and intercept (b) from n observations, then predict energy output for a test irradiance value x_test.",
		inputFormat: `<p>The first line contains integer <code>N</code> (number of observations).</p>
<p>The second line contains <code>N</code> space-separated real numbers: irradiance <code>x</code>.</p>
<p>The third line contains <code>N</code> space-separated real numbers: power output <code>y</code>.</p>
<p>The fourth line contains a single real number: <code>x_test</code>.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>The first line: <code>slope intercept</code> (formatted to 4 decimals).</p>
<p>The second line: <code>predicted_y</code> (formatted to 4 decimals).</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"0 <= x, y <= 2000"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(102);
			const tcs = [];

			tcs.push(makeTc(1, "5\n100 200 300 400 500\n15 25 35 45 55\n600", "0.1000 5.0000\n65.0000", true, "Slope = 0.1, Intercept = 5. Output for 600 is 65."));
			tcs.push(makeTc(2, "2\n1 2\n3 5\n4", "2.0000 1.0000\n9.0000", true, "Two points define a line: y = 2x + 1."));

			const solveSimple = (xs: number[], ys: number[], xTest: number) => {
				const n = xs.length;
				let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
				for (let i = 0; i < n; i++) {
					sumX += xs[i];
					sumY += ys[i];
					sumXY += xs[i] * ys[i];
					sumXX += xs[i] * xs[i];
				}
				const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
				const intercept = (sumY - slope * sumX) / n;
				const pred = slope * xTest + intercept;
				return { slope, intercept, pred };
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 25);
				const trueSlope = parseFloat(rng.nextFloat(0.05, 0.8).toFixed(2));
				const trueInt = parseFloat(rng.nextFloat(2, 20).toFixed(2));
				const xs = rng.intArray(n, 50, 1000);
				const ys = xs.map((x) => parseFloat((trueSlope * x + trueInt + rng.nextFloat(-1, 1)).toFixed(2)));
				const xTest = rng.nextInt(100, 1200);

				const { slope, intercept, pred } = solveSimple(xs, ys, xTest);
				const inStr = `${n}\n${xs.join(" ")}\n${ys.join(" ")}\n${xTest}`;
				const outStr = `${f4(slope)} ${f4(intercept)}\n${f4(pred)}`;
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 3. Aegis Housing Valuation with Ridge Regression (L2 Regularization)
	{
		id: "aegis-housing-valuation-ridge",
		title: "Aegis Housing Valuation with Ridge Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "regularization", "ridge-regression", "linear-algebra"],
		description: "Fit a Ridge Regression (L2 regularization) model with penalty lambda to prevent multicollinearity.",
		story: `<p>Aegis Capital models metropolitan real estate prices. Because house features (e.g., square footage, number of rooms, lot size) are heavily correlated, ordinary least squares suffers from extreme variance. The team introduces L2 Tikhonov regularization with penalty parameter &lambda;.</p>`,
		task: "Given 1D feature x, target y, and penalty lambda, compute the regularized slope w and unpenalized intercept b using the exact analytical Ridge formulas: w = sum((x_i - x_bar)*(y_i - y_bar)) / (sum((x_i - x_bar)^2) + lambda), and b = y_bar - w * x_bar.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>lambda</code> (&ge; 0).</p>
<p>The second line contains <code>N</code> space-separated real numbers: feature <code>x</code>.</p>
<p>The third line contains <code>N</code> space-separated real numbers: target <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>w b</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"0 <= lambda <= 1000",
			"Use the exact analytical formula with unpenalized intercept b = y_bar - w * x_bar"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(103);
			const tcs = [];

			tcs.push(makeTc(1, "3 0\n1 2 3\n2 4 6", "2.0000 0.0000", true, "With lambda=0, pure OLS gives w=2, b=0."));
			tcs.push(makeTc(2, "3 10\n1 2 3\n2 4 6", "0.3333 3.3333", true, "With lambda=10, slope is shrunken towards zero."));

			const solveRidge1D = (xs: number[], ys: number[], lambda: number) => {
				const n = xs.length;
				const meanX = xs.reduce((a, b) => a + b, 0) / n;
				const meanY = ys.reduce((a, b) => a + b, 0) / n;

				let varX = 0, covXY = 0;
				for (let i = 0; i < n; i++) {
					const dx = xs[i] - meanX;
					const dy = ys[i] - meanY;
					varX += dx * dx;
					covXY += dx * dy;
				}

				const w = covXY / (varX + lambda);
				const b = meanY - w * meanX;
				return { w, b };
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 30);
				const lambda = parseFloat(rng.nextFloat(0, 50).toFixed(2));
				const xs = rng.intArray(n, 1, 100);
				const ys = xs.map((x) => parseFloat((1.5 * x + 10 + rng.nextFloat(-5, 5)).toFixed(2)));
				const { w, b } = solveRidge1D(xs, ys, lambda);
				tcs.push(makeTc(i, `${n} ${lambda}\n${xs.join(" ")}\n${ys.join(" ")}`, `${f4(w)} ${f4(b)}`));
			}

			return tcs;
		},
	},

	// 4. Aero Turbine Efficiency with Polynomial Regression
	{
		id: "aero-turbine-efficiency-polynomial",
		title: "Aero Turbine Efficiency with Polynomial Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "polynomial-regression", "feature-engineering"],
		description: "Fit a quadratic polynomial model y = a*x^2 + b*x + c to capture nonlinear engine efficiency.",
		story: `<p>AeroDynamics lab measures gas turbine fuel efficiency across engine rotational speeds (RPM). The relationship exhibits a parabolic efficiency curve. Engineers use a degree-2 polynomial expansion <code>y = a*x^2 + b*x + c</code> to locate peak operational efficiency.</p>`,
		task: "Given n pairs (x_i, y_i), compute the polynomial parameters [a, b, c] using least-squares.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> space-separated real numbers: feature <code>x</code>.</p>
<p>The third line contains <code>N</code> space-separated real numbers: target <code>y</code>.</p>`,
		outputFormat: `<p>Print <code>a b c</code> separated by space, formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"3 <= N <= 50",
			"-100 <= x, y <= 1000"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(104);
			const tcs = [];

			tcs.push(makeTc(1, "3\n0 1 2\n1 4 9", "1.0000 2.0000 1.0000", true, "(x+1)^2 = x^2 + 2x + 1 -> a=1, b=2, c=1."));
			tcs.push(makeTc(2, "3\n-1 0 1\n1 0 1", "1.0000 0.0000 0.0000", true, "y = x^2."));

			const solvePoly2 = (xs: number[], ys: number[]) => {
				const n = xs.length;
				let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
				let t0 = 0, t1 = 0, t2 = 0;
				for (let i = 0; i < n; i++) {
					const x = xs[i], y = ys[i];
					const x2 = x * x, x3 = x2 * x, x4 = x3 * x;
					s1 += x; s2 += x2; s3 += x3; s4 += x4;
					t0 += y; t1 += x * y; t2 += x2 * y;
				}
				// Normal equations matrix for [a, b, c] where y = a*x^2 + b*x + c
				const A = [
					[s4, s3, s2, t2],
					[s3, s2, s1, t1],
					[s2, s1, s0, t0]
				];
				for (let i = 0; i < 3; i++) {
					let maxRow = i;
					for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
					[A[i], A[maxRow]] = [A[maxRow], A[i]];
					const piv = A[i][i];
					for (let j = i; j <= 3; j++) A[i][j] /= piv;
					for (let k = 0; k < 3; k++) {
						if (k !== i) {
							const f = A[k][i];
							for (let j = i; j <= 3; j++) A[k][j] -= f * A[i][j];
						}
					}
				}
				return [A[0][3], A[1][3], A[2][3]];
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 20);
				const a = rng.nextInt(-3, 3);
				const b = rng.nextInt(-5, 5);
				const c = rng.nextInt(-10, 10);
				const xs = rng.intArray(n, -10, 10);
				// ensure distinct
				const uniqueXs = Array.from(new Set(xs));
				while (uniqueXs.length < 4) uniqueXs.push(uniqueXs.length + 10);
				const ys = uniqueXs.map((x) => a * x * x + b * x + c);
				const [solA, solB, solC] = solvePoly2(uniqueXs, ys);
				tcs.push(makeTc(i, `${uniqueXs.length}\n${uniqueXs.join(" ")}\n${ys.join(" ")}`, `${f4(solA)} ${f4(solB)} ${f4(solC)}`));
			}

			return tcs;
		},
	},

	// 5. Quantum FinTech Lasso Feature Selection (Soft Thresholding)
	{
		id: "quantum-fintech-lasso-selection",
		title: "Quantum FinTech Lasso Feature Selection",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "lasso", "l1-regularization", "optimization"],
		description: "Apply the coordinate descent Soft Thresholding operator S(z, gamma) used in Lasso L1 sparsity.",
		story: `<p>A high-frequency algorithmic fund uses Lasso (L1) regularization to zero out non-informative market indicators. In coordinate descent, each parameter update applies the fundamental <b>Soft Thresholding Operator</b>: <code>S(z, &gamma;) = sign(z) * max(|z| - &gamma;, 0)</code>.</p>`,
		task: "Given an array of raw unregularized weights z and a sparsity threshold gamma, compute the sparse thresholded coefficients S(z_i, gamma).",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>gamma</code> (&ge; 0).</p>
<p>The second line contains <code>N</code> space-separated real numbers: <code>z[1] ... z[N]</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> thresholded coefficients with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"0 <= gamma <= 100"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(105);
			const tcs = [];

			tcs.push(makeTc(1, "4 2.0\n5.0 -3.0 1.5 -1.0", "3.0000 -1.0000 0.0000 0.0000", true, "Values below gamma=2 shrink to 0."));
			tcs.push(makeTc(2, "3 0.5\n0.5 -0.5 0.0", "0.0000 0.0000 0.0000", true, "Exact threshold boundaries clamp to 0."));

			const softThreshold = (z: number, gamma: number): number => {
				if (z > gamma) return z - gamma;
				if (z < -gamma) return z + gamma;
				return 0;
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const gamma = parseFloat(rng.nextFloat(0.5, 10).toFixed(2));
				const zs = rng.floatArray(n, -20, 20, 2);
				const res = zs.map((z) => softThreshold(z, gamma));
				tcs.push(makeTc(i, `${n} ${gamma}\n${zs.join(" ")}`, res.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 6. Titan Mining Ore Yield with SGD (Stochastic Gradient Descent Step)
	{
		id: "titan-mining-ore-yield-sgd",
		title: "Titan Mining Ore Yield with SGD",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "sgd", "gradient-descent"],
		description: "Compute the updated weight vector after K sequential steps of Stochastic Gradient Descent.",
		story: `<p>Extraterrestrial drill rigs on Titan stream real-time sensor measurements. Because memory is limited, the onboard telemetry unit cannot store the entire dataset. It updates a linear regression parameter vector <code>theta</code> sequentially on each incoming sample <code>(x, y)</code> using the gradient update: <code>theta := theta - alpha * (dot(theta, x) - y) * x</code>.</p>`,
		task: "Given initial weights theta, learning rate alpha, and K sequential training instances, output the final weight vector after K SGD updates.",
		inputFormat: `<p>The first line contains integers <code>D</code> (dimension) and <code>K</code> (steps), and real number <code>alpha</code>.</p>
<p>The second line contains <code>D</code> initial weights <code>theta[0] ... theta[D-1]</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> feature values followed by target <code>y</code>.</p>`,
		outputFormat: `<p>Print the updated <code>D</code> weights with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"1 <= K <= 100",
			"0 < alpha <= 1.0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(106);
			const tcs = [];

			tcs.push(makeTc(1, "2 1 0.1\n0.0 0.0\n1.0 2.0 5.0", "0.5000 1.0000", true, "Error is 0 - 5 = -5. Step: theta += 0.1 * 5 * [1, 2] = [0.5, 1.0]."));
			tcs.push(makeTc(2, "1 2 0.05\n1.0\n2.0 4.0\n3.0 9.0", "1.7450", true, "Two sequential 1D updates."));

			const runSGD = (D: number, K: number, alpha: number, theta: number[], samples: { x: number[]; y: number }[]) => {
				const w = [...theta];
				for (const s of samples) {
					let pred = 0;
					for (let d = 0; d < D; d++) pred += w[d] * s.x[d];
					const err = pred - s.y;
					for (let d = 0; d < D; d++) {
						w[d] -= alpha * err * s.x[d];
					}
				}
				return w;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const K = rng.nextInt(3, 20);
				const alpha = parseFloat(rng.nextFloat(0.01, 0.08).toFixed(3));
				const initTheta = rng.floatArray(D, -1, 1, 2);
				const samples: { x: number[]; y: number }[] = [];
				for (let k = 0; k < K; k++) {
					const x = rng.floatArray(D, 0.5, 3.0, 2);
					const y = parseFloat(rng.nextFloat(1, 15).toFixed(2));
					samples.push({ x, y });
				}

				const finalW = runSGD(D, K, alpha, initTheta, samples);
				let inStr = `${D} ${K} ${alpha}\n${initTheta.join(" ")}\n`;
				inStr += samples.map((s) => `${s.x.join(" ")} ${s.y}`).join("\n");
				tcs.push(makeTc(i, inStr, finalW.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 7. Solaris Wind Farm Loss Metrics (MSE, RMSE, MAE)
	{
		id: "solaris-wind-farm-mae-vs-mse",
		title: "Solaris Wind Farm Loss Metrics",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "metrics", "loss-functions"],
		description: "Compute Mean Squared Error (MSE), Root Mean Squared Error (RMSE), and Mean Absolute Error (MAE).",
		story: `<p>A meteorological forecasting system at Solaris Wind Farm evaluates machine learning turbine forecasts against actual recorded wind speeds. The team benchmarks predictive accuracy using three core regression error metrics: MSE, RMSE, and MAE.</p>`,
		task: "Given array of ground truth values y and predicted values y_hat, compute MSE, RMSE, and MAE.",
		inputFormat: `<p>The first line contains integer <code>N</code> (number of observations).</p>
<p>The second line contains <code>N</code> space-separated ground truth values <code>y</code>.</p>
<p>The third line contains <code>N</code> space-separated predicted values <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print a single line with three real numbers: <code>MSE RMSE MAE</code> formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"-1000 <= y, y_hat <= 1000"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(107);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2 3 4\n1 2 3 5", "0.2500 0.5000 0.2500", true, "Diffs: [0, 0, 0, 1]. MSE=1/4=0.25, RMSE=0.5, MAE=0.25."));
			tcs.push(makeTc(2, "3\n10 20 30\n10 20 30", "0.0000 0.0000 0.0000", true, "Zero error."));

			const computeMetrics = (y: number[], yHat: number[]) => {
				const n = y.length;
				let sumSq = 0, sumAbs = 0;
				for (let i = 0; i < n; i++) {
					const diff = y[i] - yHat[i];
					sumSq += diff * diff;
					sumAbs += Math.abs(diff);
				}
				const mse = sumSq / n;
				const rmse = Math.sqrt(mse);
				const mae = sumAbs / n;
				return { mse, rmse, mae };
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const y = rng.floatArray(n, -100, 100, 2);
				const yHat = y.map((v) => parseFloat((v + rng.nextFloat(-5, 5)).toFixed(2)));
				const { mse, rmse, mae } = computeMetrics(y, yHat);
				tcs.push(makeTc(i, `${n}\n${y.join(" ")}\n${yHat.join(" ")}`, `${f4(mse)} ${f4(rmse)} ${f4(mae)}`));
			}

			return tcs;
		},
	},

	// 8. Deep Sea Pressure R-Squared (Coefficient of Determination)
	{
		id: "deep-sea-pressure-r-squared",
		title: "Deep Sea Pressure R-Squared",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "metrics", "statistics"],
		description: "Compute the Coefficient of Determination R^2 measuring the proportion of variance explained.",
		story: `<p>Marine sensors measure hydrostatic pressure at depths in the Mariana Trench. Oceanographers evaluate regression models using the coefficient of determination: <code>R&sup2; = 1 - (SS_res / SS_tot)</code>, where <code>SS_res = sum((y_i - y_hat_i)&sup2;)</code> and <code>SS_tot = sum((y_i - y_mean)&sup2;)</code>.</p>`,
		task: "Given arrays y and y_hat, compute the R^2 score. If SS_tot is zero, print 1.0000 if SS_res is zero else 0.0000.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> ground truth values <code>y</code>.</p>
<p>The third line contains <code>N</code> predicted values <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print the R^2 score formatted to 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 1000",
			"-10^4 <= y, y_hat <= 10^4"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(108);
			const tcs = [];

			tcs.push(makeTc(1, "4\n1 2 3 4\n1 2 3 4", "1.0000", true, "Perfect predictions yield R^2 = 1.0000."));
			tcs.push(makeTc(2, "4\n1 2 3 4\n2.5 2.5 2.5 2.5", "0.0000", true, "Baseline mean model yields R^2 = 0.0000."));

			const computeR2 = (y: number[], yHat: number[]): number => {
				const n = y.length;
				const mean = y.reduce((a, b) => a + b, 0) / n;
				let ssTot = 0, ssRes = 0;
				for (let i = 0; i < n; i++) {
					ssTot += (y[i] - mean) ** 2;
					ssRes += (y[i] - yHat[i]) ** 2;
				}
				if (ssTot === 0) return ssRes === 0 ? 1.0 : 0.0;
				return 1.0 - (ssRes / ssTot);
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const y = rng.floatArray(n, 10, 100, 2);
				const yHat = y.map((v) => parseFloat((v + rng.nextFloat(-8, 8)).toFixed(2)));
				const r2 = computeR2(y, yHat);
				tcs.push(makeTc(i, `${n}\n${y.join(" ")}\n${yHat.join(" ")}`, f4(r2)));
			}

			return tcs;
		},
	},

	// 9. Chronos Server Latency with Huber Loss
	{
		id: "chronos-server-latency-huber-loss",
		title: "Chronos Server Latency with Huber Loss",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "loss-functions", "robust-statistics"],
		description: "Compute Mean Huber Loss which is quadratic for small errors and linear for large outlier errors.",
		story: `<p>Cloud infrastructure engineers at Chronos monitor API server latency. Occasional garbage collection pauses produce extreme outlier latencies that distort standard MSE training. Engineers adopt <b>Huber Loss</b> with threshold &delta;: for each residual <code>a = y - y_hat</code>, <code>L(a) = 0.5 * a^2</code> if <code>|a| &le; &delta;</code>, else <code>&delta; * (|a| - 0.5 * &delta;)</code>.</p>`,
		task: "Given threshold delta and arrays y and y_hat, compute the average Huber loss across all N instances.",
		inputFormat: `<p>The first line contains integer <code>N</code> and real number <code>delta</code> (&gt; 0).</p>
<p>The second line contains <code>N</code> ground truth values <code>y</code>.</p>
<p>The third line contains <code>N</code> predicted values <code>y_hat</code>.</p>`,
		outputFormat: `<p>Print the mean Huber loss with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 1000",
			"delta > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(109);
			const tcs = [];

			tcs.push(makeTc(1, "3 1.0\n1 2 3\n1 2 5", "0.5000", true, "Residuals: 0, 0, 2. For residual 2 (> 1): 1 * (2 - 0.5) = 1.5. Mean = 1.5 / 3 = 0.5."));
			tcs.push(makeTc(2, "2 2.0\n10 20\n11 21", "0.5000", true, "Residuals both 1 (< 2). 0.5 * 1^2 = 0.5."));

			const huberLoss = (y: number[], yHat: number[], delta: number): number => {
				let total = 0;
				for (let i = 0; i < y.length; i++) {
					const a = Math.abs(y[i] - yHat[i]);
					if (a <= delta) {
						total += 0.5 * a * a;
					} else {
						total += delta * (a - 0.5 * delta);
					}
				}
				return total / y.length;
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 50);
				const delta = parseFloat(rng.nextFloat(0.5, 5.0).toFixed(2));
				const y = rng.floatArray(n, -50, 50, 2);
				const yHat = y.map((v) => parseFloat((v + rng.nextFloat(-10, 10)).toFixed(2)));
				const loss = huberLoss(y, yHat, delta);
				tcs.push(makeTc(i, `${n} ${delta}\n${y.join(" ")}\n${yHat.join(" ")}`, f4(loss)));
			}

			return tcs;
		},
	},

	// 10. Glacier Melt Rate with Weighted Least Squares (WLS)
	{
		id: "glacier-melt-rate-weighted-least-squares",
		title: "Glacier Melt Rate with Weighted Least Squares",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "linear-regression", "wls", "statistics"],
		description: "Fit a Weighted Least Squares regression model where recent observations have higher statistical weight.",
		story: `<p>Climatologists tracking Arctic glacier recession observe that older satellite measurements had higher measurement variance, while recent laser sensors are far more precise. They assign weight <code>w_i</code> to each observation and solve the Weighted Least Squares (WLS) problem minimizing <code>sum(w_i * (y_i - (m*x_i + b))^2)</code>.</p>`,
		task: "Given feature x, target y, and positive weights w, compute the WLS slope (m) and intercept (b).",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The second line contains <code>N</code> values of <code>x</code>.</p>
<p>The third line contains <code>N</code> values of <code>y</code>.</p>
<p>The fourth line contains <code>N</code> positive weights <code>w</code>.</p>`,
		outputFormat: `<p>Print <code>m b</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"w[i] > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(110);
			const tcs = [];

			tcs.push(makeTc(1, "3\n1 2 3\n2 4 6\n1 1 1", "2.0000 0.0000", true, "Equal weights equals standard OLS."));
			tcs.push(makeTc(2, "3\n1 2 3\n2 4 10\n1 1 100", "3.9604 -1.9010", true, "Heavy weight on point (3, 10)."));

			const solveWLS = (xs: number[], ys: number[], ws: number[]) => {
				const n = xs.length;
				let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
				for (let i = 0; i < n; i++) {
					const w = ws[i], x = xs[i], y = ys[i];
					sumW += w;
					sumWX += w * x;
					sumWY += w * y;
					sumWXX += w * x * x;
					sumWXY += w * x * y;
				}
				const denom = sumW * sumWXX - sumWX * sumWX;
				const m = (sumW * sumWXY - sumWX * sumWY) / denom;
				const b = (sumWY - m * sumWX) / sumW;
				return { m, b };
			};

			for (let i = 3; i <= 100; i++) {
				const n = rng.nextInt(5, 25);
				const xs = rng.intArray(n, 1, 50);
				const ys = xs.map((x) => parseFloat((1.8 * x + 4 + rng.nextFloat(-3, 3)).toFixed(2)));
				const ws = rng.floatArray(n, 0.5, 10.0, 2);
				const { m, b } = solveWLS(xs, ys, ws);
				const inStr = `${n}\n${xs.join(" ")}\n${ys.join(" ")}\n${ws.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${f4(m)} ${f4(b)}`));
			}

			return tcs;
		},
	},
];
