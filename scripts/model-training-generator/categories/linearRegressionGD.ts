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

interface LinearBGDConfig {
	id: string;
	title: string;
	domain: string;
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const linearConfigs: LinearBGDConfig[] = [
	{
		id: "train-linear-bgd-01",
		title: "BGD Linear Regression: Logistics Fleet Fuel Consumption",
		domain: "Freight & Transportation",
		storyContext: "Heavy-haul trucking logistics giant Bomboclat Freight optimizes diesel fuel consumption across national routes. Telemetry sensors record vehicle payload, average incline, highway speed, and engine RPM.",
		features: ["cargo payload (tons)", "average road gradient (%)", "cruising speed (km/h)"],
		targetName: "fuel consumption rate (liters / 100km)",
		seed: 5001,
	},
	{
		id: "train-linear-bgd-02",
		title: "BGD Linear Regression: Cloud Data Center Cooling Load",
		domain: "Cloud Infrastructure",
		storyContext: "Hyper-scale data center facility EquiCool regulates chilled-water HVAC consumption based on rack compute load, external ambient temperature, and humidity levels.",
		features: ["CPU utilization (%)", "ambient temperature (°C)", "relative humidity (%)"],
		targetName: "HVAC power consumption (kW)",
		seed: 5002,
	},
	{
		id: "train-linear-bgd-03",
		title: "BGD Linear Regression: Solar Photovoltaic Inverter Yield",
		domain: "Renewable Energy",
		storyContext: "Helios Solar Farm monitors solar irradiance, ambient temperature, and module tilt angle to forecast peak alternating current inverter output.",
		features: ["solar irradiance (W/m²)", "ambient temperature (°C)"],
		targetName: "AC power yield (MW)",
		seed: 5003,
	},
	{
		id: "train-linear-bgd-04",
		title: "BGD Linear Regression: Rocket Booster Thrust Decay",
		domain: "Aerospace Propulsion",
		storyContext: "AeroDynamics propulsion engineers model chamber pressure decay during cryogenic rocket stage burns based on oxidizer mass flow rate and throat temperature.",
		features: ["oxidizer mass flow (kg/s)", "throat temperature (K)"],
		targetName: "effective thrust (kN)",
		seed: 5004,
	},
	{
		id: "train-linear-bgd-05",
		title: "BGD Linear Regression: Wind Turbine Aerodynamic Drag",
		domain: "Wind Energy",
		storyContext: "Offshore wind turbines adjust rotor pitch to minimize drag and structural torque based on wind velocity and air density.",
		features: ["wind velocity (m/s)", "air density (kg/m³)", "pitch angle (deg)"],
		targetName: "aerodynamic drag force (kN)",
		seed: 5005,
	},
	{
		id: "train-linear-bgd-06",
		title: "BGD Linear Regression: FPGA Interconnect Propagation Delay",
		domain: "Semiconductor Design",
		storyContext: "SiliconLogic EDA tools train routing timing models relating metal wirelength, parasitic capacitance, and driver resistance to signal propagation delay.",
		features: ["wire length (um)", "parasitic capacitance (fF)", "driver resistance (ohms)"],
		targetName: "propagation delay (picoseconds)",
		seed: 5006,
	},
	{
		id: "train-linear-bgd-07",
		title: "BGD Linear Regression: Catalytic Chemical Reaction Yield",
		domain: "Chemical Engineering",
		storyContext: "BioChem Synthesis reactors monitor catalyst concentration, reaction temperature, and vessel pressure to optimize product yield.",
		features: ["catalyst loading (mol %)", "reaction temperature (°C)", "system pressure (bar)"],
		targetName: "product synthesis yield (%)",
		seed: 5007,
	},
	{
		id: "train-linear-bgd-08",
		title: "BGD Linear Regression: Agricultural Nitrogen Uptake",
		domain: "Agronomy & Soil Science",
		storyContext: "TerraCrop precision soil sensors predict crop nitrogen uptake from soil moisture, organic matter percentage, and soil nitrate concentration.",
		features: ["soil moisture content (%)", "organic matter (%)", "nitrate concentration (mg/kg)"],
		targetName: "nitrogen absorption (kg/ha)",
		seed: 5008,
	},
	{
		id: "train-linear-bgd-09",
		title: "BGD Linear Regression: Deep-Space Telescope Optical Aberration",
		domain: "Astrophysics Optics",
		storyContext: "Orbiting orbital observatory AstroEye calculates wavefront aberration based on mirror thermal gradient and structural truss expansion.",
		features: ["mirror delta-T (°C)", "truss deflection (nm)"],
		targetName: "wavefront error (RMS nm)",
		seed: 5009,
	},
	{
		id: "train-linear-bgd-10",
		title: "BGD Linear Regression: Server Rack Thermal Dissipation",
		domain: "High Performance Computing",
		storyContext: "Supercomputing cluster compute blades estimate exhaust air temperature based on workload thermal design power (TDP) and cooling fan RPM.",
		features: ["workload TDP (W)", "fan speed (RPM/1000)"],
		targetName: "exhaust temperature (°C)",
		seed: 5010,
	},
	{
		id: "train-linear-bgd-11",
		title: "BGD Linear Regression: Lithium-Ion Battery Impedance Wear",
		domain: "Battery Energy Storage",
		storyContext: "VoltStorage grid batteries estimate internal resistance rise from cumulative cycle count, average discharge C-rate, and operating temperature.",
		features: ["cumulative cycles", "average C-rate", "mean operating temp (°C)"],
		targetName: "internal resistance rise (mOhm)",
		seed: 5011,
	},
	{
		id: "train-linear-bgd-12",
		title: "BGD Linear Regression: Fiber-Optic Transmission Jitter",
		domain: "Telecommunications",
		storyContext: "Trans-oceanic optical fibers model packet jitter based on optical amplifier gain, chromatic dispersion, and wavelength division multiplexing (WDM) channel density.",
		features: ["amplifier gain (dB)", "chromatic dispersion (ps/nm)", "channel density"],
		targetName: "transmission jitter (ns)",
		seed: 5012,
	},
	{
		id: "train-linear-bgd-13",
		title: "BGD Linear Regression: Drone Quadcopter Rotor Drag",
		domain: "Robotics & UAVs",
		storyContext: "Autonomous delivery quadcopters estimate battery energy draw from rotor angular velocity, flight speed, and payload mass.",
		features: ["rotor angular velocity (rad/s)", "ground speed (m/s)", "payload mass (kg)"],
		targetName: "instantaneous power draw (W)",
		seed: 5013,
	},
	{
		id: "train-linear-bgd-14",
		title: "BGD Linear Regression: Hydroelectric Dam Flow Rate",
		domain: "Civil Hydrology",
		storyContext: "HydroPower reservoir management calculates tailrace discharge from hydraulic head elevation and penstock sluice gate aperture opening.",
		features: ["reservoir head (m)", "gate aperture (cm)"],
		targetName: "water discharge rate (m³/s)",
		seed: 5014,
	},
	{
		id: "train-linear-bgd-15",
		title: "BGD Linear Regression: Electric Train Regenerative Braking",
		domain: "Railway Engineering",
		storyContext: "High-speed rail trainsets predict recovered electrical energy during deceleration from train mass, initial braking speed, and track gradient.",
		features: ["train total mass (tons)", "initial speed (km/h)", "track grade (‰)"],
		targetName: "regenerated energy (kWh)",
		seed: 5015,
	},
	{
		id: "train-linear-bgd-16",
		title: "BGD Linear Regression: Satellite Solar Cell Degradation",
		domain: "Spacecraft Power Systems",
		storyContext: "Geostationary satellites predict solar cell voltage drop from trapped radiation fluence and operating solar days.",
		features: ["cumulative proton fluence", "spacecraft mission days"],
		targetName: "photovoltaic voltage drop (V)",
		seed: 5016,
	},
	{
		id: "train-linear-bgd-17",
		title: "BGD Linear Regression: Semiconductor Lithography Etch Depth",
		domain: "Nanofabrication",
		storyContext: "EUV semiconductor foundry processes predict silicon wafer trench etch depth from plasma RF power, gas chamber pressure, and exposure time.",
		features: ["RF power (W)", "chamber pressure (mTorr)", "etch duration (s)"],
		targetName: "silicon trench depth (nm)",
		seed: 5017,
	},
	{
		id: "train-linear-bgd-18",
		title: "BGD Linear Regression: Cryogenic Superconductor Resistance",
		domain: "Condensed Matter Physics",
		storyContext: "Quantum research magnet coils monitor residual electrical resistance based on magnetic field strength and cryostat temperature above critical point.",
		features: ["magnetic field B (Tesla)", "cryostat temperature (K)"],
		targetName: "residual resistivity (micro-ohm cm)",
		seed: 5018,
	},
	{
		id: "train-linear-bgd-19",
		title: "BGD Linear Regression: Autonomous Vehicle LiDAR Calibration",
		domain: "Autonomous Vehicles",
		storyContext: "Self-driving sensor fusion units calibrate vertical LiDAR range offset based on vehicle suspension pitch and chassis vibration frequency.",
		features: ["suspension pitch (mrad)", "vibration frequency (Hz)"],
		targetName: "LiDAR depth calibration offset (mm)",
		seed: 5019,
	},
	{
		id: "train-linear-bgd-20",
		title: "BGD Linear Regression: High-Frequency Market Bid-Ask Spread",
		domain: "Quantitative Finance",
		storyContext: "Quantitative market making engines model equity bid-ask spread from order book queue imbalance, realized return volatility, and recent trade volume.",
		features: ["queue imbalance ratio", "rolling volatility (bps)", "recent volume (lots)"],
		targetName: "bid-ask spread (basis points)",
		seed: 5020,
	},
];

export function buildLinearBGDProblem(conf: LinearBGDConfig): ModelTrainingProblemDefinition {
	const config: HyperparameterConfig = {
		method: "Batch Gradient Descent (BGD) on Mean Squared Error (MSE)",
		initialParams: "theta_0 = 0.0, theta_1 = 0.0, ..., theta_D = 0.0 (all initialized to 0.0)",
		stepSizeDesc: "Read step_size directly from input line 1",
		epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
		maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
		updateRule: "grad = (1/N) * X_tilde^T * (X_tilde * theta - y), theta_{t+1} = theta_t - step_size * grad",
		stoppingCriterion: "Stop when ||grad||_2 < eps or when max_iter iterations are completed",
		outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
	};

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team has decided to train a <b>Multiple Linear Regression</b> model relating the features to the target:
<code>y = theta_0 + theta_1 * x_1 + ... + theta_D * x_D</code>
where <code>theta_0</code> is the bias/intercept term (corresponding to an augmented column of 1s: <code>x_0 = 1</code>).</p>
<p>To ensure reproducible and consistent results across systems, the training pipeline executes standard <b>Batch Gradient Descent (BGD)</b> on the Mean Squared Error (MSE) objective:
<code>L(theta) = 1 / (2*N) * sum_{i=1}^N (theta^T x_tilde_i - y_i)^2</code>
with analytical gradient:
<code>grad = (1/N) * X_tilde^T * (X_tilde * theta - y)</code>
starting from initial weights <code>theta = [0, 0, ..., 0]</code>. At each iteration, the weights update as:
<code>theta := theta - step_size * grad</code>.</p>
<p>The algorithm terminates early if the L2 norm of the gradient falls below the user-specified tolerance:
<code>||grad||_2 = sqrt(sum_{j=0}^D grad_j^2) < eps</code>.
Otherwise, training halts after exactly <code>max_iter</code> iterations.</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, eps, and max_iter on the first line, followed by the feature matrix X and target vector y, train the linear regression model starting from theta = 0. Output the final learned parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains five values: integers <code>N</code> (number of samples), <code>D</code> (number of features), real number <code>step_size</code>, real number <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing the target vector <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.0001 <= step_size <= 0.5",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s as feature 0: x_0 = 1",
		"Stopping criterion: ||grad||_2 < eps or max_iter iterations reached",
		"All values formatted to exactly 4 decimal places (0.0000)"
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveBGD = (
			N: number,
			D: number,
			stepSize: number,
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
				theta = theta.map((th, d) => th - stepSize * grad[d]);
			}
			return theta;
		};

		// Sample 1: 1D simple line
		const s1N = 4, s1D = 1, s1Step = 0.1, s1Eps = 0.001, s1MaxIter = 100;
		const s1X = [[1.0], [2.0], [3.0], [4.0]];
		const s1Y = [3.0, 5.0, 7.0, 9.0]; // y = 1 + 2x
		const s1Theta = solveBGD(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1X, s1Y);
		const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}\n` +
			s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
		tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: 1D linear regression approaching intercept=1, slope=2."));

		// Sample 2: 2D plane
		const s2N = 5, s2D = 2, s2Step = 0.05, s2Eps = 0.0001, s2MaxIter = 50;
		const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
		const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
		const s2Theta = solveBGD(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2X, s2Y);
		const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}\n` +
			s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
		tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D feature matrix with 50 BGD iterations."));

		// Generate 98 random calibrated test cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.01, 0.1).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(20, 150);

			const trueIntercept = rng.nextInt(-3, 3);
			const trueWeights = Array.from({ length: D }, () => rng.nextInt(-2, 3));

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.5, 1.5, 2);
				X.push(row);
				let val = trueIntercept;
				for (let d = 0; d < D; d++) val += trueWeights[d] * row[d];
				val += rng.nextFloat(-0.2, 0.2);
				y.push(parseFloat(val.toFixed(2)));
			}

			const thetas = solveBGD(N, D, stepSize, eps, maxIter, X, y);
			const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter}\n` +
				X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
			tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "linear-regression", "gradient-descent", "optimization", "parameter-training"],
		description: `Train a Linear Regression model with Batch Gradient Descent using input hyperparameters (step_size, eps, max_iter) and output model parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, config),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const linearRegressionGDProblems: ModelTrainingProblemDefinition[] = linearConfigs.map(buildLinearBGDProblem);
