import { ModelTrainingProblemDefinition } from "../types";
import {
	DeterministicRNG,
	makeTc,
	formatProblemStatement,
	formatConstraints,
	f4,
	norm2,
	matVecMul,
	transpose,
	softThreshold,
	HyperparameterConfig,
} from "../utils";

interface RegConfig {
	id: string;
	title: string;
	domain: string;
	type: "ridge" | "lasso";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const regConfigs: RegConfig[] = [
	// 21-30: Ridge Regression (L2 BGD)
	{
		id: "train-ridge-bgd-21",
		title: "Ridge BGD: Semiconductor Wafer Thermal Warpage",
		domain: "Semiconductor Manufacturing",
		type: "ridge",
		storyContext: "Silicon foundry NanoFab inspects multi-layer wafer warpage during rapid thermal annealing. Heavy collinearity across adjacent layer thickness requires L2 Tikhonov regularization.",
		features: ["oxide layer thickness (nm)", "nitride deposition (nm)", "peak anneal temp (°C)"],
		targetName: "surface warpage (microns)",
		seed: 5021,
	},
	{
		id: "train-ridge-bgd-22",
		title: "Ridge BGD: Autonomous Vessel Hydrodynamic Hull Resistance",
		domain: "Maritime Engineering",
		type: "ridge",
		storyContext: "Autonomous cargo ship developer OceanFleet models hydrodynamic water resistance. Highly correlated hull geometry parameters require Ridge regression to avoid variance explosion.",
		features: ["block coefficient", "length-to-beam ratio", "Froude speed number"],
		targetName: "total hull resistance (kN)",
		seed: 5022,
	},
	{
		id: "train-ridge-bgd-23",
		title: "Ridge BGD: High-Voltage Transmission Line Sag",
		domain: "Electrical Power Systems",
		type: "ridge",
		storyContext: "Grid operator PowerTrans models physical catenary sag of high-voltage transmission lines during summer peak loads using ambient weather and electrical load indicators.",
		features: ["line current (Amperes)", "ambient air temp (°C)", "solar irradiance (W/m²)"],
		targetName: "mid-span wire sag (meters)",
		seed: 5023,
	},
	{
		id: "train-ridge-bgd-24",
		title: "Ridge BGD: Commercial Aviation Jet Engine Turbine Blade Creep",
		domain: "Aviation Maintenance",
		type: "ridge",
		storyContext: "AeroTurbine Fleet Diagnostics predicts mechanical creep strain on high-pressure turbine single-crystal nickel alloy blades across multi-hour supersonic cruise flight cycles.",
		features: ["cumulative flight hours", "exhaust gas temp (K)", "fan pressure ratio"],
		targetName: "blade elongation creep (mm)",
		seed: 5024,
	},
	{
		id: "train-ridge-bgd-25",
		title: "Ridge BGD: High-Precision CNC Milling Tool Wear",
		domain: "Precision Manufacturing",
		type: "ridge",
		storyContext: "Precision aerospace CNC machining centers monitor spindle vibration harmonics and acoustic emission signals to predict micro-flank tool wear.",
		features: ["spindle vibration RMS (g)", "cutting feed rate (mm/min)", "coolant flow rate (L/min)"],
		targetName: "flank tool wear (um)",
		seed: 5025,
	},
	{
		id: "train-ridge-bgd-26",
		title: "Ridge BGD: Satellite Solar Array Degradation",
		domain: "Aerospace Systems",
		type: "ridge",
		storyContext: "Low Earth Orbit (LEO) constellation operators model solar array current degradation caused by space atomic oxygen erosion and cosmic radiation exposure.",
		features: ["radiation fluence (MeV)", "thermal cycling count", "atomic oxygen exposure"],
		targetName: "efficiency loss percentage (%)",
		seed: 5026,
	},
	{
		id: "train-ridge-bgd-27",
		title: "Ridge BGD: Geothermal District Heating Heat Exchange",
		domain: "Geothermal Energy",
		type: "ridge",
		storyContext: "Urban geothermal district heating utilities estimate heat exchanger thermal throughput from brine production flow rates, supply temperatures, and return head loss.",
		features: ["brine mass flow (kg/s)", "production well temp (°C)", "reinjection backpressure (bar)"],
		targetName: "thermal power exchange (MWth)",
		seed: 5027,
	},
	{
		id: "train-ridge-bgd-28",
		title: "Ridge BGD: Hypersonic Wind Tunnel Aerodynamic Heating",
		domain: "Hypersonics",
		type: "ridge",
		storyContext: "Mach 7 wind tunnel test facilities calibrate aerodynamic surface heat flux sensors against stagnation enthalpy and freestream dynamic pressure.",
		features: ["Mach number", "stagnation enthalpy (MJ/kg)", "freestream dynamic pressure (kPa)"],
		targetName: "stagnation heat flux (MW/m²)",
		seed: 5028,
	},
	{
		id: "train-ridge-bgd-29",
		title: "Ridge BGD: Liquefied Natural Gas (LNG) Boil-Off Rate",
		domain: "Cryogenic Engineering",
		type: "ridge",
		storyContext: "Cryogenic LNG maritime carriers model daily cargo evaporation boil-off rates from containment tank insulation thermal conductivity and ocean ambient swells.",
		features: ["ambient sea temp (°C)", "tank insulation vacuum (Pa)", "cargo fill fraction (%)"],
		targetName: "daily boil-off rate (tonnes/day)",
		seed: 5029,
	},
	{
		id: "train-ridge-bgd-30",
		title: "Ridge BGD: Carbon Fiber Composite Cure Residual Stress",
		domain: "Materials Science",
		type: "ridge",
		storyContext: "Autoclave composite curing software predicts internal residual tensile stress in carbon fiber reinforced polymer wing spars from cure cycle ramp rates and resin viscosity.",
		features: ["heating ramp rate (°C/min)", "dwell pressure (bar)", "resin curing degree (%)"],
		targetName: "residual stress (MPa)",
		seed: 5030,
	},
	// 31-40: Lasso Regression (ISTA L1 Regularization)
	{
		id: "train-lasso-ista-31",
		title: "Lasso ISTA: Genomics Biomarker Sparse Gene Expression",
		domain: "Computational Biology",
		type: "lasso",
		storyContext: "Oncology genomics researchers use L1-penalized sparse regression (Lasso) to select key predictive gene biomarkers for drug sensitivity while zeroing out thousands of irrelevant genes.",
		features: ["BRCA expression", "TP53 expression", "EGFR expression"],
		targetName: "drug response IC50",
		seed: 5031,
	},
	{
		id: "train-lasso-ista-32",
		title: "Lasso ISTA: Algorithmic Trading Sparse Factor Model",
		domain: "Quantitative Finance",
		type: "lasso",
		storyContext: "Quantitative hedge funds model excess portfolio returns using a sparse subset of macroeconomic factors, enforcing exact parameter sparsity via L1 soft-thresholding.",
		features: ["yield curve slope", "credit default spread", "commodity index return"],
		targetName: "asset excess return (bps)",
		seed: 5032,
	},
	{
		id: "train-lasso-ista-33",
		title: "Lasso ISTA: Spectroscopic Chemical Mixture Deconvolution",
		domain: "Analytical Chemistry",
		type: "lasso",
		storyContext: "Infrared absorption spectroscopy deconvolves complex multi-component chemical mixtures, selecting only the few true chemical constituents present in the sample.",
		features: ["band 1 absorbance", "band 2 absorbance", "band 3 absorbance"],
		targetName: "target analyte concentration (ppm)",
		seed: 5033,
	},
	{
		id: "train-lasso-ista-34",
		title: "Lasso ISTA: Seismic Inversion Subsurface Reflectivity",
		domain: "Geophysics",
		type: "lasso",
		storyContext: "Subsurface geologists perform sparse seismic deconvolution to recover sharp acoustic impedance layer boundaries from band-limited seismic reflections.",
		features: ["trace amplitude 1", "trace amplitude 2"],
		targetName: "reflectivity coefficient",
		seed: 5034,
	},
	{
		id: "train-lasso-ista-35",
		title: "Lasso ISTA: Compressed Sensing Magnetic Resonance Imaging",
		domain: "Medical Imaging",
		type: "lasso",
		storyContext: "Fast MRI clinical scanners reconstruct diagnostic quality cross-sectional images from undersampled k-space frequencies using L1 sparse wavelet priors.",
		features: ["k-space frequency 1", "k-space frequency 2"],
		targetName: "pixel tissue density",
		seed: 5035,
	},
	{
		id: "train-lasso-ista-36",
		title: "Lasso ISTA: Telecom Cellular Traffic Sparse Feature Attribution",
		domain: "Telecommunications",
		type: "lasso",
		storyContext: "5G cellular network optimization selects a sparse set of dominant base station metrics driving network backhaul packet drop rates.",
		features: ["PRB utilization (%)", "CQI index", "handover failure count"],
		targetName: "packet loss rate (PPM)",
		seed: 5036,
	},
	{
		id: "train-lasso-ista-37",
		title: "Lasso ISTA: Battery Energy Storage System Cell Degradation Attribution",
		domain: "Clean Energy",
		type: "lasso",
		storyContext: "Utility grid battery storage operations isolate the dominant physical stressors causing accelerated capacity fade in commercial LiFePO4 battery packs.",
		features: ["overcharge exposure time", "depth of discharge delta", "thermal variance (°C)"],
		targetName: "capacity degradation (mAh)",
		seed: 5037,
	},
	{
		id: "train-lasso-ista-38",
		title: "Lasso ISTA: Audio Acoustic Room Impulse Response Selection",
		domain: "Acoustics & Audio DSP",
		type: "lasso",
		storyContext: "Spatial audio rendering engines fit sparse multi-path room reflections to simulate accurate spatial reverberation with minimal computational latency.",
		features: ["direct path signal", "primary reflection", "secondary reflection"],
		targetName: "microphone recorded pressure (Pa)",
		seed: 5038,
	},
	{
		id: "train-lasso-ista-39",
		title: "Lasso ISTA: Precision Agriculture Remote Sensing Crop Yield",
		domain: "Precision Agriculture",
		type: "lasso",
		storyContext: "Multispectral drone imagery isolates the sparse vegetation indices (NDVI, NDRE, chlorophyll index) that causally predict final crop harvest yield.",
		features: ["NDVI index", "NDRE index", "canopy temp index"],
		targetName: "harvest yield (tonnes/ha)",
		seed: 5039,
	},
	{
		id: "train-lasso-ista-40",
		title: "Lasso ISTA: Supply Chain Port Congestion Dwell Time",
		domain: "Global Supply Chain",
		type: "lasso",
		storyContext: "Maritime logistics dispatchers identify key sparse bottlenecks determining container dwell time at global container terminal gates.",
		features: ["crane queue depth", "berth occupancy ratio", "customs processing backlog"],
		targetName: "container dwell time (hours)",
		seed: 5040,
	},
];

export function buildRegProblem(conf: RegConfig): ModelTrainingProblemDefinition {
	const isRidge = conf.type === "ridge";

	const hyperConfig: HyperparameterConfig = isRidge
		? {
				method: "Ridge Regression: Batch Gradient Descent with L2 Regularization",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "lambda (L2 penalty coefficient on non-intercept features theta_1 ... theta_D)",
				updateRule:
					"grad_0 = (1/N) * sum(yHat - y), grad_j = (1/N) * sum((yHat - y)*x_ij) + lambda * theta_j; theta_{t+1} = theta_t - step_size * grad",
				stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  }
		: {
				method: "Lasso Regression: Iterative Soft-Thresholding Algorithm (ISTA) with L1 Regularization",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||theta_{t+1} - theta_t||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "lambda (L1 penalty coefficient on non-intercept features theta_1 ... theta_D)",
				updateRule:
					"v = theta - step_size * (1/N)*X_tilde^T*(X_tilde*theta - y); theta_0 = v_0; theta_j = softThreshold(v_j, step_size * lambda) for j >= 1",
				stoppingCriterion: "Stop when ||theta_{t+1} - theta_t||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>To train the predictive model, the team formulates a ${
		isRidge ? "Ridge (L2)" : "Lasso (L1)"
	} Regularized Linear Regression objective:
<code>y = theta_0 + theta_1 * x_1 + ... + theta_D * x_D</code>
where <code>theta_0</code> is the unpenalized intercept term (associated with augmented feature <code>x_0 = 1</code>).</p>
<p>The regularized optimization objective is:
<code>${
		isRidge
			? "L(theta) = 1/(2N) * ||X_tilde * theta - y||_2^2 + (lambda / 2) * sum_{j=1}^D theta_j^2"
			: "L(theta) = 1/(2N) * ||X_tilde * theta - y||_2^2 + lambda * sum_{j=1}^D |theta_j|"
	}</code></p>
<p>The training procedure updates parameters iteratively starting from <code>theta = [0, 0, ..., 0]</code>:
${
	isRidge
		? `<ul>
<li>Compute gradient: <code>grad_0 = (1/N) * sum_{i=1}^N (x_tilde_i^T theta - y_i)</code></li>
<li>For <code>j = 1...D</code>: <code>grad_j = (1/N) * sum_{i=1}^N (x_tilde_i^T theta - y_i) x_{ij} + lambda * theta_j</code></li>
<li>Update: <code>theta := theta - step_size * grad</code></li>
<li>Stop when <code>||grad||_2 < eps</code> or <code>max_iter</code> iterations reached.</li>
</ul>`
		: `<ul>
<li>Compute intermediate gradient step: <code>v = theta - step_size * (1/N) * X_tilde^T * (X_tilde * theta - y)</code></li>
<li>Update unpenalized intercept: <code>theta_0 = v_0</code></li>
<li>Apply soft-thresholding for <code>j = 1...D</code>: <code>theta_j = softThreshold(v_j, step_size * lambda)</code>, where <code>softThreshold(z, gamma) = sign(z) * max(0, |z| - gamma)</code>.</li>
<li>Stop when parameter change <code>||theta_{t+1} - theta_t||_2 < eps</code> or <code>max_iter</code> iterations reached.</li>
</ul>`
}</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, eps, max_iter, and lambda on the first line, followed by feature matrix X and target vector y, train the ${
		isRidge ? "Ridge" : "Lasso"
	} regression model. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains six values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, integer <code>max_iter</code>, and real number <code>lambda</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing target vector <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.0001 <= step_size <= 0.5",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"0.0 <= lambda <= 5.0",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1 (unpenalized)",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveRidge = (
			N: number,
			D: number,
			stepSize: number,
			eps: number,
			maxIter: number,
			lambdaVal: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let iter = 0; iter < maxIter; iter++) {
				const yHat = matVecMul(X_tilde, theta);
				const err = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				for (let j = 1; j <= D; j++) {
					grad[j] += lambdaVal * theta[j];
				}
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th - stepSize * grad[d]);
			}
			return theta;
		};

		const solveLasso = (
			N: number,
			D: number,
			stepSize: number,
			eps: number,
			maxIter: number,
			lambdaVal: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let iter = 0; iter < maxIter; iter++) {
				const yHat = matVecMul(X_tilde, theta);
				const err = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				const nextTheta = new Array(D + 1).fill(0);
				nextTheta[0] = theta[0] - stepSize * grad[0];
				for (let j = 1; j <= D; j++) {
					const v_j = theta[j] - stepSize * grad[j];
					nextTheta[j] = softThreshold(v_j, stepSize * lambdaVal);
				}
				const diff = norm2(nextTheta.map((nt, idx) => nt - theta[idx]));
				theta = nextTheta;
				if (diff < eps) break;
			}
			return theta;
		};

		const solver = isRidge ? solveRidge : solveLasso;

		// Sample 1: 1D simple line
		const s1N = 4, s1D = 1, s1Step = 0.1, s1Eps = 0.001, s1MaxIter = 100, s1Lam = 0.5;
		const s1X = [[1.0], [2.0], [3.0], [4.0]];
		const s1Y = [2.5, 4.5, 6.5, 8.5];
		const s1Theta = solver(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1Lam, s1X, s1Y);
		const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter} ${s1Lam}\n` +
			s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
		tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: 1D regularized linear regression."));

		// Sample 2: 2D plane
		const s2N = 5, s2D = 2, s2Step = 0.05, s2Eps = 0.0001, s2MaxIter = 80, s2Lam = 1.0;
		const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
		const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
		const s2Theta = solver(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2Lam, s2X, s2Y);
		const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter} ${s2Lam}\n` +
			s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
		tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D regularized problem with lambda=1.0."));

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.01, 0.08).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(25, 120);
			const lambdaVal = parseFloat(rng.nextFloat(0.1, 2.0).toFixed(2));

			const trueIntercept = rng.nextInt(-2, 2);
			const trueWeights = Array.from({ length: D }, () => rng.nextInt(-2, 2));

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.2, 1.2, 2);
				X.push(row);
				let val = trueIntercept;
				for (let d = 0; d < D; d++) val += trueWeights[d] * row[d];
				val += rng.nextFloat(-0.25, 0.25);
				y.push(parseFloat(val.toFixed(2)));
			}

			const thetas = solver(N, D, stepSize, eps, maxIter, lambdaVal, X, y);
			const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter} ${lambdaVal}\n` +
				X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
			tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: isRidge ? "Medium" : "Hard",
		category: "machine-learning",
		tags: ["machine-learning", isRidge ? "ridge-regression" : "lasso-regression", "regularization", "optimization", "parameter-training"],
		description: `Train a ${isRidge ? "Ridge" : "Lasso"} regression model using input hyperparameters (step_size, eps, max_iter, lambda) and output learned parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: isRidge ? 160 : 180,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const regularizedRegressionProblems: ModelTrainingProblemDefinition[] = regConfigs.map(buildRegProblem);
