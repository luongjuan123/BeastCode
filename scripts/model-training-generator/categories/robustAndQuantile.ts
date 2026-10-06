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
	HyperparameterConfig,
} from "../utils";

interface RobustConfig {
	id: string;
	title: string;
	domain: string;
	type: "huber" | "quantile";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const robustConfigs: RobustConfig[] = [
	// 81-90: Huber Loss Regression
	{
		id: "train-huber-81",
		title: "Huber BGD: Heavy-Haul Mining Truck Engine Oil Viscosity Breakdown",
		domain: "Mining Heavy Equipment",
		type: "huber",
		storyContext: "Open-pit copper mine haul trucks operate under harsh particulate and shock loading. Sensor anomalies and intermittent dirt spikes create heavy outliers in engine oil viscosity readings.",
		features: ["engine operating hours", "soot contamination percentage", "oil sump temperature (°C)"],
		targetName: "kinematic oil viscosity (cSt)",
		seed: 5081,
	},
	{
		id: "train-huber-82",
		title: "Huber BGD: Commercial Flight Turbulence Induced Wing Root Bending",
		domain: "Aerospace Structural Dynamics",
		type: "huber",
		storyContext: "Airliner flight data recorders detect sporadic high-g gust encounters. Aerodynamic wing-root bending strain models use Huber loss to guard against extreme discrete gust spikes.",
		features: ["indicated airspeed (knots)", "vertical acceleration (g)", "fuel load mass (kg)"],
		targetName: "wing root bending moment (kNm)",
		seed: 5082,
	},
	{
		id: "train-huber-83",
		title: "Huber BGD: High-Frequency Crypto Liquidity Pool Slippage",
		domain: "Decentralized Finance (DeFi)",
		type: "huber",
		storyContext: "Automated market makers experience flash-loan arbitrage attacks producing extreme trade price slippage spikes, requiring robust Huber loss regression.",
		features: ["swap transaction volume", "pool reserve depth", "gas priority fee"],
		targetName: "execution price slippage (bps)",
		seed: 5083,
	},
	{
		id: "train-huber-84",
		title: "Huber BGD: Geotechnical Deep Foundation Pile Settlement",
		domain: "Geotechnical Engineering",
		type: "huber",
		storyContext: "Civil engineers model bored pile settlement under static axial load test. Anomalous rock fissure slips introduce severe outliers into LVDT displacement gauges.",
		features: ["applied axial load (MN)", "soil standard penetration N-value"],
		targetName: "pile head settlement (mm)",
		seed: 5084,
	},
	{
		id: "train-huber-85",
		title: "Huber BGD: Satellite Thermal Radiator Temperature Under Flare",
		domain: "Orbital Mechanics",
		type: "huber",
		storyContext: "Deep-space communication satellites experience solar coronal mass ejection radiation flares creating transient thermal telemetry spikes in radiator cold plates.",
		features: ["solar radiation flux (W/m2)", "internal bus electronics dissipation (W)"],
		targetName: "radiator plate equilibrium temp (K)",
		seed: 5085,
	},
	{
		id: "train-huber-86",
		title: "Huber BGD: Chemical Desalination Membrane Salt Passage Spikes",
		domain: "Water Treatment",
		type: "huber",
		storyContext: "Reverse osmosis desalination plants model permeate salinity against feed pressure, using Huber loss to dampen sudden chlorine cleaning surge anomalies.",
		features: ["feed brine pressure (bar)", "membrane operating flux (LMH)"],
		targetName: "permeate total dissolved solids (ppm)",
		seed: 5086,
	},
	{
		id: "train-huber-87",
		title: "Huber BGD: High-Speed Train Pantograph Dynamic Catenary Contact Force",
		domain: "Rail Electrification",
		type: "huber",
		storyContext: "Electric bullet trains monitor pantograph contact force on overhead catenary wires. Dropper wire acoustic bounces create intermittent contact loss outliers.",
		features: ["train speed (km/h)", "overhead wire tension (kN)"],
		targetName: "pantograph contact force (Newtons)",
		seed: 5087,
	},
	{
		id: "train-huber-88",
		title: "Huber BGD: Hydroelectric Spillway Concrete Cavitation Erosion",
		domain: "Hydraulic Structures",
		type: "huber",
		storyContext: "Dam engineers calibrate concrete cavitation erosion depth against flood discharge flow velocity, mitigating sensor acoustic cavitation spikes with Huber regression.",
		features: ["discharge water velocity (m/s)", "cavitation index sigma"],
		targetName: "concrete erosion depth (mm)",
		seed: 5088,
	},
	{
		id: "train-huber-89",
		title: "Huber BGD: Industrial Arc Furnace Electrode Consumption",
		domain: "Electric Arc Steelmaking",
		type: "huber",
		storyContext: "Electric arc furnace steel plants train graphite electrode wear models. Scrap steel cave-ins cause sudden electrode breakage events that distort ordinary least squares.",
		features: ["furnace active electrical power (MW)", "oxygen injection rate (Nm3/h)"],
		targetName: "graphite electrode consumption (kg/t)",
		seed: 5089,
	},
	{
		id: "train-huber-90",
		title: "Huber BGD: Semiconductor CMP Polishing Pad Pad-Life Wear",
		domain: "Semiconductor Fabrication",
		type: "huber",
		storyContext: "Chemical mechanical planarization (CMP) polishing pads experience irregular abrasive agglomerations. Process engineers fit robust pad wear models.",
		features: ["platen rotational speed (RPM)", "downforce carrier pressure (psi)"],
		targetName: "polishing pad thickness loss (um)",
		seed: 5090,
	},
	// 91-100: Quantile Regression (Pinball Loss)
	{
		id: "train-quantile-91",
		title: "Quantile Regression: Hospital Emergency Department Peak Wait Times",
		domain: "Healthcare Operations",
		type: "quantile",
		storyContext: "Hospital operations directors estimate the 90th percentile (tau = 0.90) patient emergency room wait times during regional pandemic surges to size on-call staffing.",
		features: ["hourly triage arrivals", "inpatient bed occupancy (%)", "active trauma cases"],
		targetName: "90th percentile ER wait time (minutes)",
		seed: 5091,
	},
	{
		id: "train-quantile-92",
		title: "Quantile Regression: Investment Portfolio Value at Risk (VaR 95%)",
		domain: "Risk Management & Quant Finance",
		type: "quantile",
		storyContext: "Asset management risk desks estimate the 95th percentile worst-case portfolio daily drawdown loss (tau = 0.95) conditional on macro stress factors.",
		features: ["volatility VIX index", "high-yield credit spread", "10Y treasury yield change"],
		targetName: "Value at Risk drawdown (bps)",
		seed: 5092,
	},
	{
		id: "train-quantile-93",
		title: "Quantile Regression: Cloud CDN Tail Latency P99 Optimization",
		domain: "Cloud Content Delivery",
		type: "quantile",
		storyContext: "Global Content Delivery Networks model 99th percentile tail latency (tau = 0.99) for edge SSL handshakes across varying transit backbone congestion.",
		features: ["edge hop count", "BGP route churn rate", "concurrent TCP sessions"],
		targetName: "P99 handshake latency (ms)",
		seed: 5093,
	},
	{
		id: "train-quantile-94",
		title: "Quantile Regression: Wildfire Propagation Maximum Front Rate",
		domain: "Environmental Wildfire Management",
		type: "quantile",
		storyContext: "Wildfire incident commanders estimate upper extreme (tau = 0.85) fire spread rates from dry fuel moisture content and gust wind velocities.",
		features: ["wind gust speed (km/h)", "fuel moisture content (%)", "topographic slope (deg)"],
		targetName: "extreme rate of fire spread (m/h)",
		seed: 5094,
	},
	{
		id: "train-quantile-95",
		title: "Quantile Regression: Wind Farm Minimum Power Output (P10 Firm Capacity)",
		domain: "Renewable Energy Grid",
		type: "quantile",
		storyContext: "Grid transmission operators require wind farms to bid conservative 10th percentile (tau = 0.10) firm power delivery commitments to avoid grid frequency collapse.",
		features: ["forecasted wind velocity (m/s)", "air barometric pressure (hPa)"],
		targetName: "P10 firm generation output (MW)",
		seed: 5095,
	},
	{
		id: "train-quantile-96",
		title: "Quantile Regression: Airport Runway Takeoff Ground Roll Distance (P95)",
		domain: "Aviation Safety",
		type: "quantile",
		storyContext: "Flight dispatch software calculates 95th percentile (tau = 0.95) takeoff ground run distance for heavy freighter transports under high-density altitude.",
		features: ["density altitude (feet)", "gross takeoff weight (tonnes)"],
		targetName: "P95 runway ground roll distance (meters)",
		seed: 5096,
	},
	{
		id: "train-quantile-97",
		title: "Quantile Regression: High-Voltage Transformer Peak Temperature Rise",
		domain: "Electric Utility Assets",
		type: "quantile",
		storyContext: "Electrical utility substations forecast 90th percentile (tau = 0.90) hot-spot winding temperatures to prevent transformer thermal catastrophic insulation degradation.",
		features: ["transformer MVA loading ratio", "solar irradiance index"],
		targetName: "P90 winding hot-spot temp (°C)",
		seed: 5097,
	},
	{
		id: "train-quantile-98",
		title: "Quantile Regression: E-Commerce Last-Mile Delivery Delivery Window P90",
		domain: "Logistics & Supply Chain",
		type: "quantile",
		storyContext: "Logistics dispatch engines predict 90th percentile (tau = 0.90) delivery turnaround times in congested metropolitan areas to guarantee SLA delivery promises.",
		features: ["route stop count", "traffic congestion index"],
		targetName: "P90 delivery duration (minutes)",
		seed: 5098,
	},
	{
		id: "train-quantile-99",
		title: "Quantile Regression: Battery Thermal Runaway Venting Pressure Peak",
		domain: "EV Battery Safety",
		type: "quantile",
		storyContext: "Automotive battery safety testing laboratories model 95th percentile (tau = 0.95) cell vent gas explosion pressure to design explosion containment baffles.",
		features: ["cell capacity (Ah)", "heating overcharge power (Watts)"],
		targetName: "P95 vent gas explosion pressure (kPa)",
		seed: 5099,
	},
	{
		id: "train-quantile-100",
		title: "Quantile Regression: Semiconductor Fab Cleanroom Aerosol Particle Spike",
		domain: "Nanofabrication Cleanrooms",
		type: "quantile",
		storyContext: "Semiconductor ISO Class 1 cleanrooms fit 99th percentile (tau = 0.99) airborne particle count excursions to prevent photolithography reticle contamination.",
		features: ["personnel movement rate", "HEPA air exchange rate (changes/hr)"],
		targetName: "P99 0.1um particle count (particles/m3)",
		seed: 5100,
	},
];

export function buildRobustProblem(conf: RobustConfig): ModelTrainingProblemDefinition {
	const isHuber = conf.type === "huber";

	const hyperConfig: HyperparameterConfig = isHuber
		? {
				method: "Robust Linear Regression with Huber Loss (Batch Gradient Descent)",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "delta (Huber threshold transition between quadratic and linear loss)",
				updateRule:
					"r_i = x_tilde_i^T theta - y_i; psi(r_i) = r_i if |r_i| <= delta else delta * sign(r_i); grad = (1/N) * X_tilde^T * psi(r); theta := theta - step_size * grad",
				stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  }
		: {
				method: "Quantile Linear Regression (Pinball Loss Subgradient Descent)",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "tau (target quantile level, 0.0 < tau < 1.0)",
				updateRule:
					"r_i = x_tilde_i^T theta - y_i; s_i = (tau - 1) if r_i < 0 else (tau if r_i > 0 else 0); grad = (1/N) * X_tilde^T * s; theta := theta - step_size * grad",
				stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>The data science team fits a linear model relating features to the target:
<code>y = theta_0 + theta_1 * x_1 + ... + theta_D * x_D</code>
where <code>theta_0</code> is the bias/intercept term (augmented feature <code>x_0 = 1</code>).</p>
<p>To achieve ${isHuber ? "robustness against extreme measurement outliers" : "estimation of the conditional tau-quantile"}, the team optimizes ${
		isHuber ? "the <b>Huber Loss</b>" : "the <b>Pinball (Quantile) Loss</b>"
	}:</p>
${
	isHuber
		? `<p>For residual <code>r_i = x_tilde_i^T theta - y_i</code>:
<code>L_delta(r_i) = 0.5 * r_i^2</code> if <code>|r_i| <= delta</code>, and <code>delta * (|r_i| - 0.5 * delta)</code> if <code>|r_i| > delta</code>.<br/>
The gradient derivative with respect to residual is:
<code>psi(r_i) = r_i</code> if <code>|r_i| <= delta</code>, else <code>delta * sign(r_i)</code>.<br/>
The batch gradient vector is:
<code>grad = (1/N) * X_tilde^T * psi(r)</code>.</p>`
		: `<p>For residual <code>r_i = x_tilde_i^T theta - y_i</code>:
<code>rho_tau(r_i) = max(tau * r_i, (tau - 1) * r_i)</code>.<br/>
The subgradient with respect to residual is:
<code>s_i = (tau - 1)</code> if <code>r_i < 0</code>, <code>tau</code> if <code>r_i > 0</code>, and <code>0</code> if <code>r_i = 0</code>.<br/>
The batch subgradient vector is:
<code>grad = (1/N) * X_tilde^T * s</code>.</p>`
}
<p>The parameters update iteratively starting from <code>theta = [0, 0, ..., 0]</code>:
<code>theta := theta - step_size * grad</code>.
Training halts when <code>||grad||_2 < eps</code> or when <code>max_iter</code> iterations are reached.</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, ${
		isHuber ? "delta" : "tau"
	}, eps, and max_iter on the first line, followed by feature matrix X and target vector y, train the ${
		isHuber ? "Huber" : "Quantile"
	} regression model starting from theta = 0. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains six values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>${
		isHuber ? "delta" : "tau"
	}</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing the target vector <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.001 <= step_size <= 0.5",
		isHuber ? "0.1 <= delta <= 5.0" : "0.05 <= tau <= 0.95",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveHuber = (
			N: number,
			D: number,
			stepSize: number,
			delta: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let iter = 0; iter < maxIter; iter++) {
				const yHat = matVecMul(X_tilde, theta);
				const psi = yHat.map((yh, i) => {
					const r = yh - y[i];
					if (Math.abs(r) <= delta) return r;
					return r > 0 ? delta : -delta;
				});
				const grad = matVecMul(XT, psi).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th - stepSize * grad[d]);
			}
			return theta;
		};

		const solveQuantile = (
			N: number,
			D: number,
			stepSize: number,
			tau: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let iter = 0; iter < maxIter; iter++) {
				const yHat = matVecMul(X_tilde, theta);
				const s = yHat.map((yh, i) => {
					const r = yh - y[i];
					if (r < -1e-9) return tau - 1;
					if (r > 1e-9) return tau;
					return 0;
				});
				const grad = matVecMul(XT, s).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th - stepSize * grad[d]);
			}
			return theta;
		};

		// Sample 1
		if (isHuber) {
			const s1N = 4, s1D = 1, s1Step = 0.1, s1Delta = 1.0, s1Eps = 0.001, s1MaxIter = 80;
			const s1X = [[1.0], [2.0], [3.0], [4.0]];
			const s1Y = [2.0, 4.0, 6.0, 15.0]; // Outlier at x=4
			const s1Theta = solveHuber(s1N, s1D, s1Step, s1Delta, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Delta} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Huber regression with an outlier."));
		} else {
			const s1N = 4, s1D = 1, s1Step = 0.1, s1Tau = 0.5, s1Eps = 0.001, s1MaxIter = 80;
			const s1X = [[1.0], [2.0], [3.0], [4.0]];
			const s1Y = [2.0, 4.0, 6.0, 8.0];
			const s1Theta = solveQuantile(s1N, s1D, s1Step, s1Tau, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Tau} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Median quantile regression (tau=0.5)."));
		}

		// Sample 2
		if (isHuber) {
			const s2N = 5, s2D = 2, s2Step = 0.05, s2Delta = 0.8, s2Eps = 0.0001, s2MaxIter = 70;
			const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
			const s2Theta = solveHuber(s2N, s2D, s2Step, s2Delta, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Delta} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D Huber regression."));
		} else {
			const s2N = 5, s2D = 2, s2Step = 0.05, s2Tau = 0.9, s2Eps = 0.0001, s2MaxIter = 70;
			const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
			const s2Theta = solveQuantile(s2N, s2D, s2Step, s2Tau, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Tau} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D Quantile regression (tau=0.9)."));
		}

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.02, 0.08).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 120);

			const trueIntercept = rng.nextInt(-2, 2);
			const trueWeights = Array.from({ length: D }, () => rng.nextInt(-2, 2));

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.2, 1.2, 2);
				X.push(row);
				let val = trueIntercept;
				for (let d = 0; d < D; d++) val += trueWeights[d] * row[d];
				val += rng.nextFloat(-0.2, 0.2);
				// In 10% of cases, add outlier
				if (rng.next() < 0.1) val += rng.choice([-3.0, 3.0]);
				y.push(parseFloat(val.toFixed(2)));
			}

			if (isHuber) {
				const delta = parseFloat(rng.nextFloat(0.5, 2.0).toFixed(2));
				const thetas = solveHuber(N, D, stepSize, delta, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${delta} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			} else {
				const tau = parseFloat(rng.choice([0.1, 0.25, 0.5, 0.75, 0.9]).toFixed(2));
				const thetas = solveQuantile(N, D, stepSize, tau, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${tau} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			}
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: isHuber ? "Medium" : "Hard",
		category: "machine-learning",
		tags: ["machine-learning", isHuber ? "huber-regression" : "quantile-regression", "robust-statistics", "gradient-descent", "parameter-training"],
		description: `Train a ${isHuber ? "Huber" : "Quantile"} regression model using input hyperparameters and output learned parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: isHuber ? 160 : 180,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const robustAndQuantileProblems: ModelTrainingProblemDefinition[] = robustConfigs.map(buildRobustProblem);
