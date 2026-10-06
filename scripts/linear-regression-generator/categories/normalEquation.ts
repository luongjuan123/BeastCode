import { LRProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4, solveOLS, matMul, transpose, matVecMul, invertMatrix, dot } from "../utils";

export const normalEquationProblems: LRProblemDefinition[] = [
	// 16. Classical Normal Equation Direct
	{
		id: "lr-normal-equation-direct",
		title: "Ordinary Least Squares Normal Equation",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "normal-equation", "matrix-inversion", "closed-form"],
		description: "Compute the closed-form OLS parameter vector beta = (X^T X)^(-1) X^T y.",
		story: `<p>A high-frequency quantitative hedge fund at <b>OptimaAlpha</b> computes factor exposures across market instruments. Given design matrix <code>X in R^(N x D)</code> and target return vector <code>y in R^N</code>, the exact analytic solution minimizing sum of squared errors is the <b>Normal Equation</b>:
<code>beta = (X^T * X)^(-1) * X^T * y</code>.</p>`,
		task: "Given N, D, design matrix X, and target vector y, solve for parameter vector beta in R^D.",
		inputFormat: `<p>The first line contains integers <code>N</code> (samples) and <code>D</code> (features).</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> parameter values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 4",
			"X^T X is non-singular"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2101);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1\n3 5", "3.0000 5.0000", true, "Identity design matrix."));
			tcs.push(makeTc(2, "3 1\n1\n2\n3\n2 4 6", "2.0000", true, "Single feature line y = 2x."));

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const D = rng.nextInt(1, 3);
				const trueBeta = rng.floatArray(D, -4, 4, 1);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 1));
				X[0][0] += 3; // ensure invertibility

				const y = X.map((row) => {
					let val = dot(row, trueBeta);
					val += parseFloat(rng.nextFloat(-0.2, 0.2).toFixed(2));
					return parseFloat(val.toFixed(2));
				});

				const beta = solveOLS(X, y, 1e-7);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 17. Normal Equation Determinant Check
	{
		id: "lr-normal-equation-determinant",
		title: "Normal Equation Gram Matrix Determinant",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "determinant", "gram-matrix", "singularity"],
		description: "Compute det(X^T X) for a 2x2 Gram matrix and flag if ill-conditioned (< 1e-5).",
		story: `<p>Embedded flight controllers at <b>Aerospace Telemetry</b> check numerical stability before solving Normal Equations. If the determinant of Gram matrix <code>G = X^T X in R^(2 x 2)</code> is strictly less than <code>0.00001</code>, the matrix is flagged as <code>ILL_CONDITIONED</code>; otherwise print <code>INVERTIBLE</code> along with <code>det(G)</code>.</p>`,
		task: "Given N samples of 2 features, compute Gram matrix G = X^T X and its determinant det(G) = G11*G22 - G12*G21.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 2 real numbers: <code>x_{i1} x_{i2}</code>.</p>`,
		outputFormat: `<p>Print <code>STATUS det(G)</code> with 4 decimal places (where STATUS is INVERTIBLE or ILL_CONDITIONED).</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2102);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 0\n0 1", "INVERTIBLE 1.0000", true, "Identity matrix det = 1."));
			tcs.push(makeTc(2, "2\n1 2\n2 4", "ILL_CONDITIONED 0.0000", true, "Collinear columns det = 0."));

			const checkDet = (N: number, X: number[][]): string => {
				let g11 = 0, g12 = 0, g22 = 0;
				for (let i = 0; i < N; i++) {
					g11 += X[i][0] * X[i][0];
					g12 += X[i][0] * X[i][1];
					g22 += X[i][1] * X[i][1];
				}
				const det = g11 * g22 - g12 * g12;
				const status = det < 1e-5 ? "ILL_CONDITIONED" : "INVERTIBLE";
				return `${status} ${f4(det)}`;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const X: number[][] = [];
				const isCollinear = rng.next() < 0.25;

				for (let j = 0; j < N; j++) {
					const x1 = parseFloat(rng.nextFloat(-5, 5).toFixed(1));
					const x2 = isCollinear ? x1 * 2 : parseFloat(rng.nextFloat(-5, 5).toFixed(1));
					X.push([x1, x2]);
				}
				if (!isCollinear) {
					X[0][0] += 2;
					X[0][1] -= 3;
				}

				const out = checkDet(N, X);
				let inStr = `${N}\n` + X.map((r) => `${r[0]} ${r[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 18. Moore-Penrose Pseudoinverse Regression
	{
		id: "lr-moore-penrose-pseudoinverse",
		title: "Moore-Penrose Pseudoinverse Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "pseudoinverse", "svd", "minimum-norm"],
		description: "Compute the minimum-norm OLS solution beta = X^+ y using Moore-Penrose pseudo-inverse.",
		story: `<p>In hyperspectral remote sensing at <b>SatCore</b>, spectral bands often exhibit collinearity where <code>X^T X</code> is rank-deficient. To find the unique minimum-norm solution <code>beta = X^+ * y</code>, the system computes the regularized pseudo-inverse limit: <code>beta = (X^T X + 1e-4 * I)^(-1) X^T y</code>.</p>`,
		task: "Given N, D, matrix X, and target y, solve for minimum-norm parameter vector beta.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> coefficients space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 20",
			"1 <= D <= 3"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2103);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 1\n1 1\n2 2", "1.0000 1.0000", true, "Collinear features split weights equally: [1, 1]."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(2, 3);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -4, 4, 1));
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveOLS(X, y, 1e-4);
				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 19. Ridge Normal Equation
	{
		id: "lr-ridge-normal-equation",
		title: "Ridge Regression Closed-Form Normal Equation",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "l2-regularization", "normal-equation"],
		description: "Compute Ridge regression coefficients beta = (X^T X + lambda * I_D)^(-1) X^T y.",
		story: `<p>Risk models at <b>Aegis Credit Analytics</b> prevent coefficient explosion from collinear borrower credit histories by adding an L2 Tikhonov penalty <code>lambda > 0</code>:
<code>beta = (X^T * X + lambda * I_D)^(-1) * X^T * y</code>.</p>`,
		task: "Given N, D, regularization parameter lambda, matrix X, and target y, compute Ridge coefficients beta.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and real number <code>lambda</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> Ridge coefficients space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= D <= 4",
			"lambda > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2104);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 1.0\n1 0\n0 1\n4 6", "2.0000 3.0000", true, "X^T X + I = 2*I_2. Inverse is 0.5*I_2. beta = [2, 3]."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const D = rng.nextInt(1, 3);
				const lambda = parseFloat(rng.nextFloat(0.1, 5.0).toFixed(2));
				const X = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 1));
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveOLS(X, y, lambda);
				let inStr = `${N} ${D} ${lambda}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 20. Weighted Least Squares Normal Equation
	{
		id: "lr-weighted-least-squares-normal-equation",
		title: "Weighted Least Squares Matrix Normal Equation",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "wls", "heteroscedasticity", "normal-equation"],
		description: "Compute WLS parameters beta = (X^T W X)^(-1) X^T W y for diagonal weight matrix W.",
		story: `<p>Sensor calibration firmware at <b>PrecisionSpectra</b> handles heteroscedastic noise variances <code>sigma_i^2</code> across instruments. Using diagonal weight matrix <code>W = diag(w_1, ..., w_N)</code> where <code>w_i = 1 / sigma_i^2</code>:
<code>beta = (X^T * W * X)^(-1) * X^T * W * y</code>.</p>`,
		task: "Given N, D, matrix X, target y, and diagonal weights w, compute WLS parameters beta.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The next line contains <code>N</code> real numbers representing <code>y</code>.</p>
<p>The last line contains <code>N</code> real numbers representing weights <code>w</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> parameters space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 50",
			"1 <= D <= 3",
			"w_i > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2105);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n2\n2 5\n1 1", "2.4000", true, "beta = (1*2 + 2*5)/(1+4) = 12/5 = 2.4."));

			const solveWLS = (N: number, D: number, X: number[][], y: number[], w: number[]): number[] => {
				const Xw: number[][] = Array.from({ length: N }, (_, i) => {
					const sqrtW = Math.sqrt(w[i]);
					return X[i].map((val) => val * sqrtW);
				});
				const yw = y.map((val, i) => val * Math.sqrt(w[i]));
				return solveOLS(Xw, yw, 1e-7);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -10, 10, 1);
				const w = rng.floatArray(N, 0.5, 3.0, 1);

				const beta = solveWLS(N, D, X, y, w);
				let inStr = `${N} ${D}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n` +
					y.join(" ") + `\n` +
					w.join(" ");
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 21. Hat Matrix Projection
	{
		id: "lr-hat-matrix-projection",
		title: "Hat Matrix Orthogonal Projection",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "hat-matrix", "projection", "linear-algebra"],
		description: "Compute the orthogonal projection of y onto the column space of X: y_hat = H * y = X(X^T X)^(-1)X^T y.",
		story: `<p>Signal processing specialists at <b>AcousticAI</b> filter noise by orthogonally projecting measured audio signal <code>y in R^N</code> onto the subspace spanned by harmonic basis matrix <code>X in R^(N x D)</code> using the <b>Hat Matrix</b> <code>H = X(X^T X)^(-1)X^T</code>:
<code>y_hat = H * y = X * beta</code>.</p>`,
		task: "Given N, D, basis matrix X, and target vector y, compute the predicted projection vector y_hat in R^N.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> projected values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 3"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2106);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n1\n2 4", "3.0000 3.0000", true, "Average of y values is 3.0."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -3, 3, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveOLS(X, y, 1e-7);
				const yHat = matVecMul(X, beta);

				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, yHat.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 22. Residual Maker Annihilator Matrix
	{
		id: "lr-residual-maker-matrix",
		title: "Residual Maker Annihilator Matrix",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "residuals", "projection", "annihilator"],
		description: "Compute the residual vector e = M * y = (I - H) * y = y - y_hat.",
		story: `<p>Statistical quality auditors at <b>Veritas Metrics</b> isolate measurement anomalies using the <b>Residual Maker Matrix</b> (annihilator matrix) <code>M = I_N - H</code>. Multiplying response vector <code>y</code> by <code>M</code> extracts the orthogonal residual errors:
<code>e = y - y_hat</code>.</p>`,
		task: "Given N, D, design matrix X, and target vector y, compute the residual vector e.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>N</code> residual values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 3"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2107);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n1\n2 4", "-1.0000 1.0000", true, "Residuals from mean: [2-3, 4-3] = [-1, 1]."));

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -3, 3, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveOLS(X, y, 1e-7);
				const yHat = matVecMul(X, beta);
				const e = y.map((val, idx) => val - yHat[idx]);

				let inStr = `${N} ${D}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, e.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 23. LOOCV Ridge Analytical Shortcut
	{
		id: "lr-loocv-ridge-analytical-shortcut",
		title: "Analytical Leave-One-Out Cross-Validation for Ridge",
		difficulty: "Hard",
		category: "machine-learning",
		tags: ["linear-regression", "ridge", "cross-validation", "loocv"],
		description: "Compute LOOCV MSE in closed form without refitting: e_i^{LOOCV} = (y_i - y_hat_i) / (1 - H_ii).",
		story: `<p>Hyperparameter tuners at <b>AutoML Systems</b> rapidly select optimal Ridge regularization penalty <code>lambda</code> using the <b>Sherman-Morrison-Woodbury LOOCV Shortcut</b>. Rather than retraining the model <code>N</code> times, the Leave-One-Out error for sample <code>i</code> is calculated directly:
<code>e_i^{LOOCV} = (y_i - y_hat_i) / (1 - H_{ii})</code>
where <code>H = X(X^T X + lambda * I)^(-1)X^T</code> and <code>H_{ii}</code> is the leverage diagonal. The overall LOOCV score is <code>1/N * sum(e_i^{LOOCV})^2</code>.</p>`,
		task: "Given N, D, lambda, matrix X, and target y, compute the overall LOOCV Mean Squared Error.",
		inputFormat: `<p>The first line contains integers <code>N</code>, <code>D</code>, and real number <code>lambda</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the LOOCV MSE with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 3",
			"lambda > 0",
			"H_{ii} < 1.0 for all i"
		]),
		points: 200,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2108);
			const tcs = [];

			tcs.push(makeTc(1, "2 1 1.0\n1\n1\n2 4", "4.5000", true, "H_ii=1/3. e_0 = (2 - 2)/(2/3) = 0, e_1 = (4 - 2)/(2/3) = 3. MSE = (0^2 + 3^2)/2 = 4.5000."));

			const calcLoocv = (N: number, D: number, lambda: number, X: number[][], y: number[]): number => {
				const XT = transpose(X);
				const XTX = matMul(XT, X);
				for (let d = 0; d < D; d++) XTX[d][d] += lambda;
				const inv = invertMatrix(XTX);

				// beta = inv * XT * y
				const XTy = matVecMul(XT, y);
				const beta = matVecMul(inv, XTy);
				const yHat = matVecMul(X, beta);

				// H_ii = x_i^T * inv * x_i
				let totalSq = 0;
				for (let i = 0; i < N; i++) {
					const xi = X[i];
					const invXi = matVecMul(inv, xi);
					const hii = dot(xi, invXi);
					const denom = Math.max(1e-4, 1 - hii);
					const eLoocv = (y[i] - yHat[i]) / denom;
					totalSq += eLoocv * eLoocv;
				}
				return totalSq / N;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 2);
				const lambda = parseFloat(rng.nextFloat(0.5, 3.0).toFixed(2));
				const X = Array.from({ length: N }, () => rng.floatArray(D, -3, 3, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -5, 5, 1);

				const mse = calcLoocv(N, D, lambda, X, y);
				let inStr = `${N} ${D} ${lambda}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(mse)));
			}

			return tcs;
		},
	},

	// 24. Recursive Least Squares Covariance Update
	{
		id: "lr-recursive-least-squares-covariance-update",
		title: "Recursive Least Squares Covariance Update",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "rls", "covariance", "online-learning"],
		description: "Compute the RLS covariance matrix update P_t = P_{t-1} - k_t * x_t^T * P_{t-1} where k_t = P_{t-1} x_t / (1 + x_t^T P_{t-1} x_t).",
		story: `<p>In adaptive flight stabilization at <b>AeroCyber</b>, stream models update estimation covariance <code>P in R^(D x D)</code> online upon receiving sensor vector <code>x in R^D</code> without matrix inversion:
<code>k = (P * x) / (1 + x^T * P * x)</code>
<code>P_{new} = P - k * (x^T * P)</code>.</p>`,
		task: "Given D, matrix P (D x D), and observation vector x, compute updated covariance matrix P_{new}.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The next <code>D</code> lines each contain <code>D</code> real numbers representing matrix <code>P</code>.</p>
<p>The last line contains <code>D</code> real numbers representing vector <code>x</code>.</p>`,
		outputFormat: `<p>Print <code>D</code> lines representing matrix <code>P_{new}</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 4"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2109);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 0\n0 1\n1 0", "0.5000 0.0000\n0.0000 1.0000", true, "Gain is [0.5, 0]. P_11 updates to 0.5."));

			const rlsUpdate = (D: number, P: number[][], x: number[]): string[] => {
				const Px = matVecMul(P, x);
				const denom = 1 + dot(x, Px);
				const k = Px.map((val) => val / denom);

				// x^T * P = (P^T * x)^T = Px^T (if P symmetric)
				const xTP = new Array(D).fill(0);
				for (let j = 0; j < D; j++) {
					for (let i = 0; i < D; i++) xTP[j] += x[i] * P[i][j];
				}

				const Pnew: string[] = [];
				for (let i = 0; i < D; i++) {
					const row: string[] = [];
					for (let j = 0; j < D; j++) {
						const val = P[i][j] - k[i] * xTP[j];
						row.push(f4(val));
					}
					Pnew.push(row.join(" "));
				}
				return Pnew;
			};

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 3);
				const P = Array.from({ length: D }, (_, r) => {
					const row = new Array(D).fill(0);
					row[r] = parseFloat(rng.nextFloat(1.0, 5.0).toFixed(2));
					return row;
				});
				const x = rng.floatArray(D, -2, 2, 1);
				x[0] += 1;

				const out = rlsUpdate(D, P, x);
				let inStr = `${D}\n` + P.map((r) => r.join(" ")).join("\n") + `\n${x.join(" ")}`;
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 25. Cholesky Normal Equation Solver
	{
		id: "lr-cholesky-normal-equation-solver",
		title: "Cholesky Decomposition Normal Equation Solver",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "cholesky", "numerical-methods", "substitution"],
		description: "Given lower-triangular factor L from X^T X = L * L^T and b = X^T y, solve L z = b then L^T beta = z.",
		story: `<p>Inside a numerical linear algebra kernel at <b>HighPerformance AI</b>, normal equations <code>(X^T X) beta = b</code> are solved via the Cholesky factorization <code>X^T X = L * L^T</code>:
<ol>
  <li>Forward substitution: solve <code>L * z = b</code> for <code>z</code></li>
  <li>Back substitution: solve <code>L^T * beta = z</code> for <code>beta</code></li>
</ol></p>`,
		task: "Given D, lower-triangular matrix L (D x D), and vector b in R^D, compute solution vector beta.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The next <code>D</code> lines each contain <code>D</code> real numbers representing lower-triangular matrix <code>L</code>.</p>
<p>The last line contains <code>D</code> real numbers representing vector <code>b</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> components of beta space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"L_{ii} > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2110);
			const tcs = [];

			tcs.push(makeTc(1, "2\n2 0\n1 2\n6 8", "1.0000 1.2500", true, "L z = [6,8] -> z = [3, 2.5]. L^T beta = [3, 2.5] -> beta = [1.0, 1.25]."));

			const solveCholesky = (D: number, L: number[][], b: number[]): number[] => {
				// Forward: L z = b
				const z = new Array(D).fill(0);
				for (let i = 0; i < D; i++) {
					let s = b[i];
					for (let j = 0; j < i; j++) s -= L[i][j] * z[j];
					z[i] = s / L[i][i];
				}

				// Back: L^T beta = z
				const beta = new Array(D).fill(0);
				for (let i = D - 1; i >= 0; i--) {
					let s = z[i];
					for (let j = i + 1; j < D; j++) s -= L[j][i] * beta[j];
					beta[i] = s / L[i][i];
				}
				return beta;
			};

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const L: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
				for (let r = 0; r < D; r++) {
					for (let c = 0; c <= r; c++) {
						L[r][c] = r === c ? parseFloat(rng.nextFloat(1.0, 4.0).toFixed(2)) : parseFloat(rng.nextFloat(-2.0, 2.0).toFixed(2));
					}
				}
				const b = rng.floatArray(D, -10, 20, 1);

				const beta = solveCholesky(D, L, b);
				let inStr = `${D}\n` + L.map((r) => r.join(" ")).join("\n") + `\n${b.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 26. QR Decomposition OLS
	{
		id: "lr-qr-decomposition-ols",
		title: "QR Decomposition OLS Solver",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "qr-decomposition", "orthogonalization"],
		description: "Given thin QR factors X = Q * R and target y, solve R * beta = Q^T y using back-substitution.",
		story: `<p>Robotic kinematic calibration at <b>Apex Motion</b> avoids forming the condition-squared matrix <code>X^T X</code> by using the <b>QR Decomposition</b> <code>X = Q * R</code> (where <code>Q in R^(N x D)</code> has orthonormal columns and <code>R in R^(D x D)</code> is upper-triangular):
<code>R * beta = Q^T * y</code>.</p>`,
		task: "Given N, D, matrix Q, upper-triangular matrix R, and vector y, solve for beta.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>Q</code>.</p>
<p>The next <code>D</code> lines each contain <code>D</code> real numbers representing upper-triangular <code>R</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> components of beta space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 4",
			"R_{ii} > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2111);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n1\n0\n2\n4 0", "2.0000", true, "Q^T y = 4, R beta = 2*beta = 4 -> beta = 2."));

			const solveQR = (N: number, D: number, Q: number[][], R: number[][], y: number[]): number[] => {
				const QT = transpose(Q);
				const QTy = matVecMul(QT, y);

				// Back-substitution for R beta = QTy
				const beta = new Array(D).fill(0);
				for (let i = D - 1; i >= 0; i--) {
					let s = QTy[i];
					for (let j = i + 1; j < D; j++) s -= R[i][j] * beta[j];
					beta[i] = s / R[i][i];
				}
				return beta;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 3);
				// Construct simple orthonormal Q using standard basis
				const Q: number[][] = Array.from({ length: N }, () => new Array(D).fill(0));
				for (let d = 0; d < D; d++) Q[d][d] = 1.0;

				const R: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
				for (let r = 0; r < D; r++) {
					for (let c = r; c < D; c++) {
						R[r][c] = r === c ? parseFloat(rng.nextFloat(1.0, 3.0).toFixed(2)) : parseFloat(rng.nextFloat(-1.0, 1.0).toFixed(2));
					}
				}
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveQR(N, D, Q, R, y);
				let inStr = `${N} ${D}\n` +
					Q.map((r) => r.join(" ")).join("\n") + "\n" +
					R.map((r) => r.join(" ")).join("\n") + "\n" +
					y.join(" ");
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 27. Frisch-Waugh-Lovell Partialling Out
	{
		id: "lr-frisch-waugh-lovell-theorem",
		title: "Frisch-Waugh-Lovell Partialling-Out Regression",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "fwl-theorem", "econometrics", "partialling-out"],
		description: "Compute coefficient beta_x by partialling out confounding control variable z from x and y.",
		story: `<p>Econometricians at <b>PolicyImpact</b> evaluate the causal impact of education <code>x</code> on income <code>y</code> controlling for age <code>z</code> using the <b>Frisch-Waugh-Lovell (FWL) Theorem</b>:
<ol>
  <li>Regress <code>x</code> on <code>z</code> and obtain residuals <code>x_tilde = x - (sum x z / sum z^2) * z</code></li>
  <li>Regress <code>y</code> on <code>z</code> and obtain residuals <code>y_tilde = y - (sum y z / sum z^2) * z</code></li>
  <li>The multivariate slope <code>beta_x</code> equals <code>sum(x_tilde * y_tilde) / sum(x_tilde^2)</code></li>
</ol></p>`,
		task: "Given N triplets (x_i, z_i, y_i), compute the partialled-out coefficient beta_x.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain 3 real numbers: <code>x_i z_i y_i</code>.</p>`,
		outputFormat: `<p>Print <code>beta_x</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"sum(x_tilde^2) > 0"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2112);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 0 2\n0 1 3", "2.0000", true, "Orthogonal z. beta_x = 2.0."));

			const solveFwl = (rows: [number, number, number][]): number => {
				let sumZZ = 0, sumXZ = 0, sumYZ = 0;
				for (const [x, z, y] of rows) {
					sumZZ += z * z;
					sumXZ += x * z;
					sumYZ += y * z;
				}
				if (sumZZ === 0) sumZZ = 1e-9;
				const gammaX = sumXZ / sumZZ;
				const gammaY = sumYZ / sumZZ;

				let num = 0, den = 0;
				for (const [x, z, y] of rows) {
					const xTilde = x - gammaX * z;
					const yTilde = y - gammaY * z;
					num += xTilde * yTilde;
					den += xTilde * xTilde;
				}
				return den === 0 ? 0 : num / den;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const rows: [number, number, number][] = [];
				for (let j = 0; j < N; j++) {
					const z = parseFloat(rng.nextFloat(1, 5).toFixed(1));
					const x = parseFloat((z * 0.5 + rng.nextFloat(-2, 2)).toFixed(1));
					const y = parseFloat((3 * x + 2 * z + rng.nextFloat(-0.2, 0.2)).toFixed(2));
					rows.push([x, z, y]);
				}
				rows[0][0] += 3;

				const bx = solveFwl(rows);
				let inStr = `${N}\n` + rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`).join("\n");
				tcs.push(makeTc(i, inStr, f4(bx)));
			}

			return tcs;
		},
	},

	// 28. Tikhonov General Regularization
	{
		id: "lr-tikhonov-general-regularization",
		title: "Tikhonov Generalized Regularization",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "tikhonov", "regularization", "prior"],
		description: "Compute beta = (X^T X + Gamma^T Gamma)^(-1) X^T y with diagonal regularization matrix Gamma.",
		story: `<p>Geophysical inversion specialists at <b>EarthSonde</b> incorporate non-uniform prior confidence weights across <code>D</code> subterranean layers using generalized <b>Tikhonov Regularization</b>:
<code>beta = (X^T * X + Gamma^T * Gamma)^(-1) * X^T * y</code>
where <code>Gamma = diag(gamma_1, ..., gamma_D)</code>.</p>`,
		task: "Given N, D, diagonal penalties gamma, matrix X, and target y, compute parameter vector beta.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing diagonal penalties <code>gamma</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> values of beta space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"D <= N <= 20",
			"1 <= D <= 3",
			"gamma_d >= 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2113);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1.0 2.0\n1 0\n0 1\n4 10", "2.0000 2.0000", true, "X^T X + Gamma^2 = diag(2, 5). beta = [4/2, 10/5] = [2, 2]."));

			const solveTikhonov = (N: number, D: number, gammas: number[], X: number[][], y: number[]): number[] => {
				const XT = transpose(X);
				const XTX = matMul(XT, X);
				for (let d = 0; d < D; d++) XTX[d][d] += gammas[d] * gammas[d];
				const inv = invertMatrix(XTX);
				const XTy = matVecMul(XT, y);
				return matVecMul(inv, XTy);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 8);
				const D = rng.nextInt(1, 3);
				const gammas = rng.floatArray(D, 0.5, 3.0, 1);
				const X = Array.from({ length: N }, () => rng.floatArray(D, -4, 4, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solveTikhonov(N, D, gammas, X, y);
				let inStr = `${N} ${D}\n${gammas.join(" ")}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 29. Principal Component Regression Rank-1
	{
		id: "lr-principal-component-regression-rank1",
		title: "Rank-1 Principal Component Regression (PCR)",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["linear-regression", "pcr", "pca", "dimensionality-reduction"],
		description: "Project centered features onto 1st principal component v_1 to obtain score z = X * v_1, fit y = gamma * z, then beta = gamma * v_1.",
		story: `<p>Chemometrics spectroscopy analyzers at <b>OptiSpec</b> eliminate collinearity across wavelengths via <b>Principal Component Regression (PCR)</b>. Given centered design matrix <code>X in R^(N x D)</code> and the top eigenvector / loading vector <code>v_1 in R^D</code> (unit norm):
<ol>
  <li>Compute principal score vector: <code>z = X * v_1 in R^N</code></li>
  <li>Fit univariate slope: <code>gamma = sum(z * y) / sum(z^2)</code></li>
  <li>Map back to feature space: <code>beta = gamma * v_1</code></li>
</ol></p>`,
		task: "Given N, D, loading vector v_1, matrix X, and target y, compute the reconstructed coefficient vector beta.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing loading vector <code>v_1</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the <code>D</code> components of beta space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 50",
			"1 <= D <= 4",
			"sum(z^2) > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2114);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n0.7071 0.7071\n1 1\n2 2\n2 4", "1.0000 1.0000", true, "z = [sqrt(2), 2sqrt(2)]. gamma = sqrt(2). beta = [1, 1]."));

			const solvePcr1 = (N: number, D: number, v1: number[], X: number[][], y: number[]): number[] => {
				const z = matVecMul(X, v1);
				let num = 0, den = 0;
				for (let i = 0; i < N; i++) {
					num += z[i] * y[i];
					den += z[i] * z[i];
				}
				const gamma = den === 0 ? 0 : num / den;
				return v1.map((v) => v * gamma);
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(3, 10);
				const D = rng.nextInt(2, 3);
				const rawV = rng.floatArray(D, 0.5, 3.0, 1);
				const normV = Math.sqrt(rawV.reduce((s, v) => s + v * v, 0));
				const v1 = rawV.map((v) => v / normV);

				const X = Array.from({ length: N }, () => rng.floatArray(D, -4, 4, 1));
				X[0][0] += 2;
				const y = rng.floatArray(N, -10, 10, 1);

				const beta = solvePcr1(N, D, v1, X, y);
				let inStr = `${N} ${D}\n${v1.map((v) => v.toFixed(4)).join(" ")}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, beta.map(f4).join(" ")));
			}

			return tcs;
		},
	},

	// 30. Generalized Least Squares Correlated Errors
	{
		id: "lr-generalized-least-squares-correlated-errors",
		title: "Generalized Least Squares (GLS) with AR(1) Errors",
		difficulty: "Hard",
		category: "machine-learning",
		tags: ["linear-regression", "gls", "autocorrelation", "generalized-least-squares"],
		description: "Compute GLS parameters beta = (X^T Omega^(-1) X)^(-1) X^T Omega^(-1) y for AR(1) error covariance matrix Omega.",
		story: `<p>Econometric time-series forecasters at <b>TreasuryDesk</b> face correlated disturbance errors: <code>u_t = rho * u_{t-1} + e_t</code> with correlation <code>rho</code> across <code>N=3</code> timestamps. The error covariance matrix is:
<code>Omega = [[1, rho, rho^2], [rho, 1, rho], [rho^2, rho, 1]]</code>.
The Generalized Least Squares (GLS) estimator is:
<code>beta = (X^T * Omega^(-1) * X)^(-1) * X^T * Omega^(-1) * y</code>.</p>`,
		task: "Given rho, 3x1 design matrix X, and 3x1 response vector y, compute the GLS parameter beta.",
		inputFormat: `<p>The first line contains real number <code>rho</code>.</p>
<p>The next 3 lines each contain 1 real number representing <code>X</code>.</p>
<p>The last line contains 3 real numbers representing <code>y</code>.</p>`,
		outputFormat: `<p>Print the single parameter <code>beta</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"-0.9 <= rho <= 0.9",
			"N = 3, D = 1"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(2115);
			const tcs = [];

			tcs.push(makeTc(1, "0.0\n1\n2\n3\n2 4 6", "2.0000", true, "Uncorrelated rho=0 reduces to standard OLS."));

			const solveGls = (rho: number, X: number[][], y: number[]): number => {
				// 3x3 Omega
				const Omega: number[][] = [
					[1, rho, rho * rho],
					[rho, 1, rho],
					[rho * rho, rho, 1],
				];
				const invOmega = invertMatrix(Omega);

				// X^T * invOmega * X
				const XT = transpose(X);
				const XTinv = matMul(XT, invOmega);
				const denom = matMul(XTinv, X)[0][0];

				// X^T * invOmega * y
				const num = matVecMul(XTinv, y)[0];

				return denom === 0 ? 0 : num / denom;
			};

			for (let i = 2; i <= 100; i++) {
				const rho = parseFloat(rng.nextFloat(-0.8, 0.8).toFixed(2));
				const X = [[parseFloat(rng.nextFloat(1, 4).toFixed(1))], [parseFloat(rng.nextFloat(2, 5).toFixed(1))], [parseFloat(rng.nextFloat(3, 7).toFixed(1))]];
				const y = rng.floatArray(3, -5, 10, 1);

				const beta = solveGls(rho, X, y);
				const inStr = `${rho}\n` + X.map((r) => r[0]).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(beta)));
			}

			return tcs;
		},
	},
];
