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
	clipByNorm,
	HyperparameterConfig,
} from "../utils";

interface BatchConfig {
	id: string;
	title: string;
	domain: string;
	type: "minibatch" | "clipping";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const batchConfigs: BatchConfig[] = [
	// 101-110: Mini-Batch SGD
	{
		id: "train-minibatch-101",
		title: "Mini-Batch SGD: High-Volume E-Commerce Ad Click Prediction",
		domain: "Online Advertising",
		type: "minibatch",
		storyContext: "Online display ad bidding systems process millions of impressions per second. Models must be trained iteratively over streaming mini-batches of user contextual features.",
		features: ["user past CTR", "ad position index", "publisher quality score"],
		targetName: "predicted continuous bid valuation (cents)",
		seed: 5101,
	},
	{
		id: "train-minibatch-102",
		title: "Mini-Batch SGD: Autonomous Fleet Telematics Engine Torque",
		domain: "Automotive Telematics",
		type: "minibatch",
		storyContext: "Connected fleet vehicles stream high-frequency CAN bus data packets. Edge learning models update engine shaft torque predictions in mini-batches.",
		features: ["throttle position (%)", "engine RPM / 1000", "manifold absolute pressure (kPa)"],
		targetName: "engine output torque (Nm)",
		seed: 5102,
	},
	{
		id: "train-minibatch-103",
		title: "Mini-Batch SGD: Smart Meter Grid Power Consumption Stream",
		domain: "Smart Energy Grid",
		type: "minibatch",
		storyContext: "Smart electrical grid aggregators train neighborhood power demand regression models from streaming batches of smart meter readings.",
		features: ["aggregate active power (kW)", "outdoor ambient temp (°C)"],
		targetName: "feeder line substation load (MW)",
		seed: 5103,
	},
	{
		id: "train-minibatch-104",
		title: "Mini-Batch SGD: Edge IoT Sensor Battery Voltage Drain",
		domain: "Industrial IoT",
		type: "minibatch",
		storyContext: "Low-power environmental sensors monitor lithium battery depletion rate using mini-batch gradient updates to conserve microcontroller memory.",
		features: ["LoRa transmission frequency", "sleep duty cycle (%)"],
		targetName: "hourly battery voltage drop (mV)",
		seed: 5104,
	},
	{
		id: "train-minibatch-105",
		title: "Mini-Batch SGD: Commercial Cargo Aircraft Cruise Trim Angle",
		domain: "Avionics Flight Controls",
		type: "minibatch",
		storyContext: "Flight management computers stream aerodynamic pitch angle telemetry to calibrate stabilizer cruise trim in batches during oceanic transit.",
		features: ["mach number", "center of gravity location (% MAC)"],
		targetName: "horizontal stabilizer trim angle (deg)",
		seed: 5105,
	},
	{
		id: "train-minibatch-106",
		title: "Mini-Batch SGD: Chemical Plant Fractional Distillation Top Temperature",
		domain: "Petrochemical Refining",
		type: "minibatch",
		storyContext: "Crude oil distillation columns train tray temperature models over mini-batches of stream analyzers to regulate reflux ratio.",
		features: ["column top pressure (bar)", "reflux flow rate (m3/h)"],
		targetName: "overhead vapor temperature (°C)",
		seed: 5106,
	},
	{
		id: "train-minibatch-107",
		title: "Mini-Batch SGD: Satellite Ground Station Antennas Tracking Error",
		domain: "Satellite Ground Stations",
		type: "minibatch",
		storyContext: "LEO satellite tracking parabolic dishes train servo pointing error corrections over batches of azimuth and elevation angle readings.",
		features: ["target azimuth rate (deg/s)", "wind gust velocity (m/s)"],
		targetName: "tracking pointing jitter (mdeg)",
		seed: 5107,
	},
	{
		id: "train-minibatch-108",
		title: "Mini-Batch SGD: High-Speed Web Proxy Request Latency",
		domain: "Network Systems",
		type: "minibatch",
		storyContext: "Reverse proxy load balancers stream upstream connection metrics to train response latency models using mini-batch updates.",
		features: ["active HTTP/2 connections", "backend queue depth"],
		targetName: "HTTP proxy response latency (ms)",
		seed: 5108,
	},
	{
		id: "train-minibatch-109",
		title: "Mini-Batch SGD: Precision CNC Lathe Thermal Spindle Growth",
		domain: "Manufacturing Automation",
		type: "minibatch",
		storyContext: "Sub-micron CNC lathes update thermal axial expansion compensation parameters from batches of bearing temperature telemetry.",
		features: ["spindle bearing temp (°C)", "continuous cutting time (min)"],
		targetName: "Z-axis thermal displacement (um)",
		seed: 5109,
	},
	{
		id: "train-minibatch-110",
		title: "Mini-Batch SGD: Autonomous Submersible Acoustic Depth Range",
		domain: "Underwater Robotics",
		type: "minibatch",
		storyContext: "Autonomous underwater vehicles update acoustic altimeter depth models in mini-batches to navigate rugged seafloor canyons.",
		features: ["acoustic round-trip time (ms)", "water salinity gradient"],
		targetName: "bottom bathymetry clearance (meters)",
		seed: 5110,
	},
	// 111-120: Gradient Clipping SGD
	{
		id: "train-clipping-111",
		title: "Gradient Clipping: High-Voltage Pulsed Plasma Deposition",
		domain: "Plasma Physics",
		type: "clipping",
		storyContext: "Pulsed DC magnetron sputtering creates high-energy plasma arcs producing sudden explosive gradient spikes, necessitating L2 gradient norm clipping.",
		features: ["discharge pulse voltage (kV)", "argon gas flow (sccm)", "substrate bias (V)"],
		targetName: "thin film deposition rate (nm/min)",
		seed: 5111,
	},
	{
		id: "train-clipping-112",
		title: "Gradient Clipping: Rocket Stage Separation Shock Load",
		domain: "Rocketry Engineering",
		type: "clipping",
		storyContext: "Stage separation pyrobolt detonation produces extreme instantaneous structural shock waves that destabilize regression training without gradient clipping.",
		features: ["pyrotechnic charge mass (g)", "fairing jettison velocity (m/s)"],
		targetName: "shock response spectrum peak (g)",
		seed: 5112,
	},
	{
		id: "train-clipping-113",
		title: "Gradient Clipping: Financial Flash Crash Order Book Microprice",
		domain: "Quantitative Trading",
		type: "clipping",
		storyContext: "Algorithmic market makers calibrate liquidity models during market flash crash selloffs, preventing exploding gradient steps via gradient norm clipping.",
		features: ["order cancellation rate", "trade volume imbalance"],
		targetName: "microprice displacement (ticks)",
		seed: 5113,
	},
	{
		id: "train-clipping-114",
		title: "Gradient Clipping: Nuclear Reactor Control Rod Drop Reactivity",
		domain: "Nuclear Systems",
		type: "clipping",
		storyContext: "Fast reactor safety shutdown SCRAM procedures record sharp neutron flux transitions that require gradient clipping during reactivity model fitting.",
		features: ["rod insertion depth (%)", "primary coolant flow (kg/s)"],
		targetName: "negative reactivity insertion (pcm)",
		seed: 5114,
	},
	{
		id: "train-clipping-115",
		title: "Gradient Clipping: Geotechnical Rock Blast Ground Vibration (PPV)",
		domain: "Mining Explosives",
		type: "clipping",
		storyContext: "Open-pit mine blasting engineers model peak particle velocity (PPV) from explosive borehole delays, clipping gradient updates to avoid explosive step sizes.",
		features: ["charge weight per delay (kg)", "scaled seismic distance (m/kg^0.5)"],
		targetName: "peak particle velocity PPV (mm/s)",
		seed: 5115,
	},
	{
		id: "train-clipping-116",
		title: "Gradient Clipping: Deep Subsea Oil Well Gas Kick Blowout Pressure",
		domain: "Drilling Engineering",
		type: "clipping",
		storyContext: "Deepwater drilling rigs model sudden gas kick annular pressure spikes using gradient clipping to guarantee numerical convergence.",
		features: ["drilling mud density (ppg)", "annular backpressure (psi)"],
		targetName: "wellbore kick pressure surge (psi)",
		seed: 5116,
	},
	{
		id: "train-clipping-117",
		title: "Gradient Clipping: Aircraft Lightning Strike Electromagnetic Transient",
		domain: "Aero Electromagnetic Compatibility",
		type: "clipping",
		storyContext: "Composite aircraft lightning protection engineers fit induced voltage transient curves from kiloampere lightning current pulses.",
		features: ["peak stroke current (kA)", "pulse rise time di/dt (kA/us)"],
		targetName: "induced cable loop voltage (V)",
		seed: 5117,
	},
	{
		id: "train-clipping-118",
		title: "Gradient Clipping: High-Speed Train Emergency Eddy Current Braking",
		domain: "Railway Electrodynamics",
		type: "clipping",
		storyContext: "Magnetic eddy current track brakes experience sharp thermal saturation surges during high-speed emergency stops, stabilized via gradient clipping.",
		features: ["rail entry speed (km/h)", "excitation field current (A)"],
		targetName: "deceleration braking force (kN)",
		seed: 5118,
	},
	{
		id: "train-clipping-119",
		title: "Gradient Clipping: Laser Inertial Fusion Target Implosion Velocity",
		domain: "Inertial Confinement Fusion",
		type: "clipping",
		storyContext: "Megajoule laser ignition facilities model capsule implosion velocity from hohlraum x-ray ablation pressures with gradient clipping.",
		features: ["laser peak power (TW)", "hohlraum drive radiation temp (eV)"],
		targetName: "capsule implosion velocity (km/s)",
		seed: 5119,
	},
	{
		id: "train-clipping-120",
		title: "Gradient Clipping: Space Shuttle Atmospheric Re-Entry Peak Plasma Heat",
		domain: "Space Re-Entry Aerothermodynamics",
		type: "clipping",
		storyContext: "Atmospheric re-entry capsules model peak stagnation ionization plasma heat flux during hypersonic blackouts, clipping gradients to stabilize learning.",
		features: ["re-entry velocity (km/s)", "atmospheric density scale"],
		targetName: "stagnation convective heat (kW/m2)",
		seed: 5120,
	},
];

export function buildBatchProblem(conf: BatchConfig): ModelTrainingProblemDefinition {
	const isMinibatch = conf.type === "minibatch";

	const hyperConfig: HyperparameterConfig = isMinibatch
		? {
				method: "Linear Regression with Mini-Batch Stochastic Gradient Descent (SGD)",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||full_grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard epoch cap)",
				extraParamsDesc: "batch_size (number of samples per mini-batch, e.g. 2, 4, 8)",
				updateRule:
					"In each epoch, iterate through consecutive mini-batches B_k: grad = (1/|B_k|) * sum_{i in B_k} (x_tilde_i^T theta - y_i) x_tilde_i; theta := theta - step_size * grad. Check full gradient at epoch end.",
				stoppingCriterion: "Stop when full gradient ||grad_{full}||_2 < eps or max_iter epochs reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  }
		: {
				method: "Linear Regression with L2 Gradient Norm Clipping",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "clip_norm (maximum allowed L2 norm of the gradient vector)",
				updateRule:
					"grad = (1/N) * X_tilde^T * (X_tilde * theta - y); if ||grad||_2 > clip_norm: grad_clipped = grad * (clip_norm / ||grad||_2) else grad; theta := theta - step_size * grad_clipped",
				stoppingCriterion: "Stop when unclipped ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team trains a <b>Linear Regression</b> model:
<code>y = theta_0 + theta_1 * x_1 + ... + theta_D * x_D</code>
where <code>theta_0</code> is the bias/intercept term (augmented feature <code>x_0 = 1</code>).</p>
<p><b>Training Procedure:</b>
${
	isMinibatch
		? `The dataset of <code>N</code> samples is processed in consecutive non-overlapping mini-batches of size <code>batch_size</code> (indices <code>[0, B-1]</code>, <code>[B, 2B-1]</code>, etc.; the last mini-batch takes all remaining samples).
For each epoch <code>iter = 0, 1, ..., max_iter - 1</code>:
<ul>
<li>Iterate through each mini-batch <code>B_k</code> in sequential order:
  <ul>
    <li>Compute the mini-batch gradient: <code>grad = (1 / |B_k|) * sum_{i in B_k} (x_tilde_i^T theta - y_i) * x_tilde_i</code></li>
    <li>Update weights: <code>theta := theta - step_size * grad</code></li>
  </ul>
</li>
<li>At the end of the epoch, compute the full-dataset gradient <code>grad_{full} = (1/N) * X_tilde^T * (X_tilde * theta - y)</code>.</li>
<li>If <code>||grad_{full}||_2 < eps</code>, terminate training early.</li>
</ul>`
		: `At each iteration step <code>iter = 0, 1, ..., max_iter - 1</code>:
<ul>
<li>Compute the analytical full gradient: <code>grad = (1/N) * X_tilde^T * (X_tilde * theta - y)</code></li>
<li>If <code>||grad||_2 < eps</code>, terminate training early.</li>
<li>Apply L2 gradient clipping:
  <code>grad_clipped = grad * (clip_norm / ||grad||_2)</code> if <code>||grad||_2 > clip_norm</code>, else <code>grad</code>.
</li>
<li>Update parameters: <code>theta := theta - step_size * grad_clipped</code></li>
</ul>`
}
All training begins from initial parameters <code>theta = [0, 0, ..., 0]</code>.</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, ${
		isMinibatch ? "batch_size" : "clip_norm"
	}, eps, and max_iter on the first line, followed by feature matrix X and target vector y, train the linear model starting from theta = 0. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains six values: integers <code>N</code>, <code>D</code>, real number <code>step_size</code>, ${
		isMinibatch ? "integer <code>batch_size</code>" : "real number <code>clip_norm</code>"
	}, real number <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing the target vector <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.001 <= step_size <= 0.5",
		isMinibatch ? "1 <= batch_size <= N" : "0.01 <= clip_norm <= 10.0",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveMinibatch = (
			N: number,
			D: number,
			stepSize: number,
			batchSize: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);

			// Precompute batches
			const batches: number[][] = [];
			for (let start = 0; start < N; start += batchSize) {
				const end = Math.min(start + batchSize, N);
				const b: number[] = [];
				for (let idx = start; idx < end; idx++) b.push(idx);
				batches.push(b);
			}

			const XT = transpose(X_tilde);

			for (let epoch = 0; epoch < maxIter; epoch++) {
				for (const batch of batches) {
					const bSize = batch.length;
					const grad = new Array(D + 1).fill(0);
					for (const idx of batch) {
						let yHat_i = 0;
						for (let d = 0; d <= D; d++) yHat_i += X_tilde[idx][d] * theta[d];
						const err = yHat_i - y[idx];
						for (let d = 0; d <= D; d++) grad[d] += (err * X_tilde[idx][d]) / bSize;
					}
					theta = theta.map((th, d) => th - stepSize * grad[d]);
				}

				// Check full grad
				const yHat = matVecMul(X_tilde, theta);
				const err = yHat.map((yh, i) => yh - y[i]);
				const fullGrad = matVecMul(XT, err).map((g) => g / N);
				if (norm2(fullGrad) < eps) break;
			}
			return theta;
		};

		const solveClipping = (
			N: number,
			D: number,
			stepSize: number,
			clipNorm: number,
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
				const err = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;

				const clipped = clipByNorm(grad, clipNorm);
				theta = theta.map((th, d) => th - stepSize * clipped[d]);
			}
			return theta;
		};

		// Sample 1
		if (isMinibatch) {
			const s1N = 6, s1D = 1, s1Step = 0.05, s1Batch = 2, s1Eps = 0.001, s1MaxIter = 50;
			const s1X = [[1.0], [2.0], [3.0], [4.0], [5.0], [6.0]];
			const s1Y = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0];
			const s1Theta = solveMinibatch(s1N, s1D, s1Step, s1Batch, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Batch} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Mini-batch SGD with batch_size=2."));
		} else {
			const s1N = 4, s1D = 1, s1Step = 0.1, s1Clip = 1.0, s1Eps = 0.001, s1MaxIter = 60;
			const s1X = [[1.0], [2.0], [3.0], [4.0]];
			const s1Y = [2.0, 4.0, 6.0, 8.0];
			const s1Theta = solveClipping(s1N, s1D, s1Step, s1Clip, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Clip} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Gradient clipping with clip_norm=1.0."));
		}

		// Sample 2
		if (isMinibatch) {
			const s2N = 6, s2D = 2, s2Step = 0.04, s2Batch = 3, s2Eps = 0.0001, s2MaxIter = 60;
			const s2X = [
				[1.0, 0.5],
				[2.0, 1.0],
				[1.5, 2.0],
				[3.0, 1.5],
				[2.5, 0.5],
				[1.8, 1.2],
			];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0, 3.8];
			const s2Theta = solveMinibatch(s2N, s2D, s2Step, s2Batch, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Batch} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D Mini-batch SGD with batch_size=3."));
		} else {
			const s2N = 5, s2D = 2, s2Step = 0.05, s2Clip = 0.5, s2Eps = 0.0001, s2MaxIter = 60;
			const s2X = [
				[1.0, 0.5],
				[2.0, 1.0],
				[1.5, 2.0],
				[3.0, 1.5],
				[2.5, 0.5],
			];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
			const s2Theta = solveClipping(s2N, s2D, s2Step, s2Clip, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Clip} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D Gradient clipping with clip_norm=0.5."));
		}

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(6, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.02, 0.08).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 100);

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
				y.push(parseFloat(val.toFixed(2)));
			}

			if (isMinibatch) {
				const batchSize = rng.nextInt(2, Math.min(6, N));
				const thetas = solveMinibatch(N, D, stepSize, batchSize, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${batchSize} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			} else {
				const clipNorm = parseFloat(rng.nextFloat(0.2, 2.0).toFixed(2));
				const thetas = solveClipping(N, D, stepSize, clipNorm, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${clipNorm} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			}
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: isMinibatch ? "Medium" : "Medium",
		category: "machine-learning",
		tags: ["machine-learning", isMinibatch ? "minibatch-sgd" : "gradient-clipping", "optimization", "parameter-training"],
		description: `Train a Linear Regression model using ${isMinibatch ? "Mini-Batch SGD" : "Gradient Clipping"} and output learned parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: 160,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const stochasticAndMinibatchProblems: ModelTrainingProblemDefinition[] = batchConfigs.map(buildBatchProblem);
