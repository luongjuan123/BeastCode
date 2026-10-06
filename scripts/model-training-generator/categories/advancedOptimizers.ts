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

interface OptimizerConfig {
	id: string;
	title: string;
	domain: string;
	optimizer: "momentum" | "adam";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const optimizerConfigs: OptimizerConfig[] = [
	// 61-70: Momentum Gradient Descent
	{
		id: "train-momentum-61",
		title: "Momentum Optimizer: Aerodynamic Aircraft Drag Polar Curve",
		domain: "Aeronautical Engineering",
		optimizer: "momentum",
		storyContext: "Computational fluid dynamics engineers fit wing polar drag curves across mach numbers. Ravines in the optimization landscape cause standard BGD to oscillate, requiring momentum smoothing.",
		features: ["lift coefficient squared", "compressibility drag rise", "aspect ratio"],
		targetName: "total aircraft drag coefficient",
		seed: 5061,
	},
	{
		id: "train-momentum-62",
		title: "Momentum Optimizer: Superconducting Magnet Quench Heat Load",
		domain: "Particle Physics Accelerator",
		optimizer: "momentum",
		storyContext: "CERN cryogenics engineers model heat dissipation in superconducting quadrupole magnets during beam steering ramps using Polyak momentum gradient descent.",
		features: ["excitation current (kA)", "helium vapor pressure (mbar)", "ramp rate (A/s)"],
		targetName: "quench heat load (Watts)",
		seed: 5062,
	},
	{
		id: "train-momentum-63",
		title: "Momentum Optimizer: Geotechnical Tunnel Bore Ground Subsidence",
		domain: "Civil Engineering",
		optimizer: "momentum",
		storyContext: "Subway tunnel boring machine telemetry trains ground subsidence models based on face pressure, grout injection volume, and soil overburden depth.",
		features: ["tunnel face pressure (bar)", "slurry grout volume (m3)", "soil overburden (m)"],
		targetName: "surface subsidence settlement (mm)",
		seed: 5063,
	},
	{
		id: "train-momentum-64",
		title: "Momentum Optimizer: Blast Furnace Molten Iron Silicon Content",
		domain: "Metallurgical Engineering",
		optimizer: "momentum",
		storyContext: "Steelworks blast furnace operators train thermal balance models to predict silicon concentration in tapping hot metal using coke rate and blast temperature.",
		features: ["coke consumption rate", "hot blast temperature (°C)", "slag basicity ratio"],
		targetName: "molten iron silicon percentage (%)",
		seed: 5064,
	},
	{
		id: "train-momentum-65",
		title: "Momentum Optimizer: Battery Electric Vehicle Regenerative Braking",
		domain: "Automotive Powertrain",
		optimizer: "momentum",
		storyContext: "Electric vehicle powertrain engineers model electric motor regenerative torque recovery against battery state-of-charge and rotor RPM.",
		features: ["rotor speed (RPM/1000)", "battery pack SOC (%)"],
		targetName: "regen braking torque (Nm)",
		seed: 5065,
	},
	{
		id: "train-momentum-66",
		title: "Momentum Optimizer: Hydroelectric Pumped Storage Flow Velocity",
		domain: "Hydro Power",
		optimizer: "momentum",
		storyContext: "Pumped-storage hydroelectric stations model penstock water flow transient velocity during fast wicket-gate closure.",
		features: ["effective water head (m)", "gate opening percentage (%)"],
		targetName: "flow transient velocity (m/s)",
		seed: 5066,
	},
	{
		id: "train-momentum-67",
		title: "Momentum Optimizer: Silicon Ingot Czochralski Crystal Pulling",
		domain: "Semiconductor Materials",
		optimizer: "momentum",
		storyContext: "Czochralski crystal growth pullers calibrate monocrystalline silicon ingot diameter against furnace RF heater power and pull velocity.",
		features: ["crucible pull speed (mm/h)", "RF heater power (kW)"],
		targetName: "ingot diameter error (mm)",
		seed: 5067,
	},
	{
		id: "train-momentum-68",
		title: "Momentum Optimizer: Gas Turbine Compressor Surge Margin",
		domain: "Power Generation",
		optimizer: "momentum",
		storyContext: "Industrial heavy-duty gas turbine controls predict aerodynamic compressor surge margin from variable stator vane angles and inlet guide vane position.",
		features: ["inlet guide vane angle", "compressor pressure ratio"],
		targetName: "surge margin percentage (%)",
		seed: 5068,
	},
	{
		id: "train-momentum-69",
		title: "Momentum Optimizer: Submarine Sonar Acoustic Transmission Loss",
		domain: "Underwater Acoustics",
		optimizer: "momentum",
		storyContext: "Naval acoustics researchers model acoustic path attenuation in shallow maritime thermoclines from water sound speed gradient and seafloor sediment reflection.",
		features: ["thermocline gradient", "bottom reflection loss (dB)", "acoustic frequency (kHz)"],
		targetName: "transmission acoustic loss (dB)",
		seed: 5069,
	},
	{
		id: "train-momentum-70",
		title: "Momentum Optimizer: Autonomous Drone Propeller Rotor Acoustic Noise",
		domain: "Aeroacoustics",
		optimizer: "momentum",
		storyContext: "Urban air mobility eVTOL designers fit aerodynamic blade passing noise models based on propeller tip Mach number and thrust disc loading.",
		features: ["blade tip Mach number", "propeller disc loading (N/m2)"],
		targetName: "acoustic sound pressure level (dBA)",
		seed: 5070,
	},
	// 71-80: Adam Optimizer
	{
		id: "train-adam-71",
		title: "Adam Optimizer: Deep Neural Latent Space Embedding Calibration",
		domain: "Deep Learning Foundations",
		optimizer: "adam",
		storyContext: "Vector search infrastructure trains linear projection heads mapping multimodal embedding representations to metric search spaces using Adam optimization.",
		features: ["cosine similarity proxy", "embedding norm dimension 1", "embedding norm dimension 2"],
		targetName: "target alignment metric",
		seed: 5071,
	},
	{
		id: "train-adam-72",
		title: "Adam Optimizer: High-Frequency Limit Order Book Fill Time",
		domain: "Algorithmic Market Making",
		optimizer: "adam",
		storyContext: "Quantitative liquidity providers train regression weights mapping passive limit order queue placement and micro-price imbalance to execution fill time.",
		features: ["normalized queue priority", "microprice drift (bps)", "order book depth ratio"],
		targetName: "expected order fill latency (ms)",
		seed: 5072,
	},
	{
		id: "train-adam-73",
		title: "Adam Optimizer: Autonomous Rover Mars Regolith Wheel Slip",
		domain: "Space Robotics",
		optimizer: "adam",
		storyContext: "Planetary exploration rovers fit adaptive terrain traversability parameters estimating wheel slippage from chassis tilt and soil shear strength.",
		features: ["terrain slope inclination (deg)", "regolith cohesive strength (kPa)", "motor drive torque (Nm)"],
		targetName: "wheel longitudinal slip ratio",
		seed: 5073,
	},
	{
		id: "train-adam-74",
		title: "Adam Optimizer: Nuclear Fusion Tokamak Plasma Beta Poloidal",
		domain: "Nuclear Fusion",
		optimizer: "adam",
		storyContext: "Magnetic confinement fusion diagnostics predict poloidal beta magnetic pressure from diamagnetic loop flux measurements and neutral beam heating power.",
		features: ["diamagnetic loop flux (Wb)", "neutral beam injection (MW)", "plasma current (MA)"],
		targetName: "poloidal beta parameter",
		seed: 5074,
	},
	{
		id: "train-adam-75",
		title: "Adam Optimizer: 3D Metal Laser Powder Bed Fusion Porosity",
		domain: "Additive Manufacturing",
		optimizer: "adam",
		storyContext: "Metal 3D printing software models volumetric keyhole porosity in titanium components from laser power, scan speed, and hatch spacing.",
		features: ["laser power (Watts)", "hatch spacing (um)", "linear scan velocity (mm/s)"],
		targetName: "subsurface porosity volume fraction (%)",
		seed: 5075,
	},
	{
		id: "train-adam-76",
		title: "Adam Optimizer: Cryogenic Hydrogen Fuel Tank Slosh Dynamics",
		domain: "Launch Vehicle Cryogenics",
		optimizer: "adam",
		storyContext: "Rocket booster propellant management models liquid hydrogen sloshing natural frequency from tank fill level and transverse lateral acceleration.",
		features: ["tank fill fraction (%)", "lateral vehicle acceleration (g)"],
		targetName: "slosh resonance frequency (Hz)",
		seed: 5076,
	},
	{
		id: "train-adam-77",
		title: "Adam Optimizer: Cloud Kubernetes Autoscaler Pod Scheduling Delay",
		domain: "Cloud Infrastructure",
		optimizer: "adam",
		storyContext: "Cluster autoscaler schedulers optimize container placement latency based on pending memory allocations and node daemon set resource contention.",
		features: ["pending pod CPU requests (cores)", "node resource fragmentation"],
		targetName: "pod scheduling turnaround (seconds)",
		seed: 5077,
	},
	{
		id: "train-adam-78",
		title: "Adam Optimizer: Satellite Laser Optical Downlink Bit Error Rate",
		domain: "Space Optical Communications",
		optimizer: "adam",
		storyContext: "Free-space optical ground terminals calibrate adaptive optics deformable mirror wavefront corrections against atmospheric scintillation index.",
		features: ["atmospheric turbulence index (Cn2)", "ground elevation angle (deg)"],
		targetName: "bit error rate exponent",
		seed: 5078,
	},
	{
		id: "train-adam-79",
		title: "Adam Optimizer: Bioreactor Monoclonal Antibody Titer Growth",
		domain: "Biotechnology & Bioprocess",
		optimizer: "adam",
		storyContext: "Mammalian cell culture bioreactors optimize glucose feeding schedules to maximize monoclonal antibody protein titer using oxygen transfer rate and viable cell density.",
		features: ["dissolved oxygen uptake rate", "glucose feed rate (g/L/day)", "viable cell count (10^6/mL)"],
		targetName: "monoclonal antibody titer (g/L)",
		seed: 5079,
	},
	{
		id: "train-adam-80",
		title: "Adam Optimizer: Commercial Quantum Computer Qubit Decoherence T2",
		domain: "Quantum Computing",
		optimizer: "adam",
		storyContext: "Transmon superconducting qubit calibration routines train cryogenic noise coupling models predicting Ramsey dephasing coherence time T2 from flux bias noise.",
		features: ["magnetic flux bias noise (uPhi0)", "dilution fridge mixing chamber temp (mK)"],
		targetName: "dephasing time T2 (microseconds)",
		seed: 5080,
	},
];

export function buildOptimizerProblem(conf: OptimizerConfig): ModelTrainingProblemDefinition {
	const isAdam = conf.optimizer === "adam";

	const hyperConfig: HyperparameterConfig = isAdam
		? {
				method: "Linear Regression with Adam Optimizer (Adaptive Moment Estimation)",
				initialParams: "theta = [0, ..., 0], m = [0, ..., 0], v = [0, ..., 0] (t = 1)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "beta1 (first moment decay), beta2 (second moment decay)",
				updateRule:
					"g_t = (1/N)*X_tilde^T*(X_tilde*theta - y); m_t = beta1*m_{t-1} + (1-beta1)*g_t; v_t = beta2*v_{t-1} + (1-beta2)*g_t^2; mHat = m_t / (1 - beta1^t); vHat = v_t / (1 - beta2^t); theta_{t} = theta_{t-1} - step_size * mHat / (sqrt(vHat) + 1e-8)",
				stoppingCriterion: "Stop when ||grad_t||_2 < eps or max_iter iterations completed",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  }
		: {
				method: "Linear Regression with Polyak Momentum Gradient Descent",
				initialParams: "theta = [0, ..., 0], velocity v = [0, ..., 0]",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "beta (momentum decay factor, typically 0.8 to 0.95)",
				updateRule:
					"g_t = (1/N)*X_tilde^T*(X_tilde*theta_t - y); v_{t+1} = beta*v_t + step_size * g_t; theta_{t+1} = theta_t - v_{t+1}",
				stoppingCriterion: "Stop when ||g_t||_2 < eps or max_iter iterations completed",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team trains a <b>Linear Regression</b> model:
<code>y = theta_0 + theta_1 * x_1 + ... + theta_D * x_D</code>
using the <b>${isAdam ? "Adam (Adaptive Moment Estimation)" : "Polyak Momentum"}</b> optimization algorithm to minimize Mean Squared Error (MSE):
<code>L(theta) = 1/(2N) * ||X_tilde * theta - y||_2^2</code>
with analytical gradient:
<code>g_t = (1/N) * X_tilde^T * (X_tilde * theta - y)</code>
starting from initial parameters <code>theta = [0, 0, ..., 0]</code>.</p>
<p><b>Algorithm Specification:</b>
${
	isAdam
		? `<ul>
<li>Initialize first moment vector <code>m_0 = [0, 0, ..., 0]</code> and second moment vector <code>v_0 = [0, 0, ..., 0]</code>.</li>
<li>For each iteration step <code>t = 1, 2, ..., max_iter</code>:
  <ul>
    <li>Compute analytical gradient: <code>g_t = (1/N) * X_tilde^T * (X_tilde * theta_{t-1} - y)</code></li>
    <li>If <code>||g_t||_2 < eps</code>, terminate early.</li>
    <li>Update biased first moment estimate: <code>m_t = beta1 * m_{t-1} + (1 - beta1) * g_t</code></li>
    <li>Update biased second raw moment estimate: <code>v_t = beta2 * v_{t-1} + (1 - beta2) * (g_t^2)</code> (element-wise)</li>
    <li>Compute bias-corrected first moment: <code>mHat_t = m_t / (1 - beta1^t)</code></li>
    <li>Compute bias-corrected second raw moment: <code>vHat_t = v_t / (1 - beta2^t)</code></li>
    <li>Update parameters: <code>theta_{t, j} = theta_{t-1, j} - step_size * mHat_{t, j} / (sqrt(vHat_{t, j}) + 1e-8)</code></li>
  </ul>
</li>
</ul>`
		: `<ul>
<li>Initialize velocity vector <code>v_0 = [0, 0, ..., 0]</code>.</li>
<li>For each iteration <code>t = 0, 1, ..., max_iter - 1</code>:
  <ul>
    <li>Compute analytical gradient: <code>g_t = (1/N) * X_tilde^T * (X_tilde * theta_t - y)</code></li>
    <li>If <code>||g_t||_2 < eps</code>, terminate early.</li>
    <li>Update velocity: <code>v_{t+1} = beta * v_t + step_size * g_t</code></li>
    <li>Update parameter: <code>theta_{t+1} = theta_t - v_{t+1}</code></li>
  </ul>
</li>
</ul>`
}</p>`;

	const task = `Given N training instances, D features, and hyperparameters ${
		isAdam ? "step_size, beta1, beta2, eps, max_iter" : "step_size, beta, eps, max_iter"
	} on the first line, followed by the feature matrix X and target vector y, train the linear model using ${
		isAdam ? "Adam" : "Momentum GD"
	}. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = isAdam
		? `<p>The first line contains seven values: integers <code>N</code>, <code>D</code>, real numbers <code>step_size</code>, <code>beta1</code>, <code>beta2</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing the target vector <code>y</code>.</p>`
		: `<p>The first line contains six values: integers <code>N</code>, <code>D</code>, real numbers <code>step_size</code>, <code>beta</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing the target vector <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.0001 <= step_size <= 0.5",
		isAdam ? "0.5 <= beta1 <= 0.99" : "0.5 <= beta <= 0.95",
		...(isAdam ? ["0.8 <= beta2 <= 0.999"] : []),
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveMomentum = (
			N: number,
			D: number,
			stepSize: number,
			beta: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			let v = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let iter = 0; iter < maxIter; iter++) {
				const yHat = matVecMul(X_tilde, theta);
				const err = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				v = v.map((vVal, d) => beta * vVal + stepSize * grad[d]);
				theta = theta.map((th, d) => th - v[d]);
			}
			return theta;
		};

		const solveAdam = (
			N: number,
			D: number,
			stepSize: number,
			beta1: number,
			beta2: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let theta = new Array(D + 1).fill(0);
			let m = new Array(D + 1).fill(0);
			let v = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);
			const XT = transpose(X_tilde);

			for (let t = 1; t <= maxIter; t++) {
				const yHat = matVecMul(X_tilde, theta);
				const err = yHat.map((yh, i) => yh - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;

				m = m.map((mVal, d) => beta1 * mVal + (1 - beta1) * grad[d]);
				v = v.map((vVal, d) => beta2 * vVal + (1 - beta2) * (grad[d] * grad[d]));

				const b1Pow = Math.pow(beta1, t);
				const b2Pow = Math.pow(beta2, t);

				theta = theta.map((th, d) => {
					const mHat = m[d] / (1 - b1Pow);
					const vHat = v[d] / (1 - b2Pow);
					return th - (stepSize * mHat) / (Math.sqrt(vHat) + 1e-8);
				});
			}
			return theta;
		};

		// Sample 1
		if (isAdam) {
			const s1N = 4, s1D = 1, s1Step = 0.1, s1B1 = 0.9, s1B2 = 0.999, s1Eps = 0.001, s1MaxIter = 80;
			const s1X = [[1.0], [2.0], [3.0], [4.0]];
			const s1Y = [2.0, 4.0, 6.0, 8.0];
			const s1Theta = solveAdam(s1N, s1D, s1Step, s1B1, s1B2, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1B1} ${s1B2} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Adam optimization on 1D linear regression."));
		} else {
			const s1N = 4, s1D = 1, s1Step = 0.05, s1Beta = 0.9, s1Eps = 0.001, s1MaxIter = 80;
			const s1X = [[1.0], [2.0], [3.0], [4.0]];
			const s1Y = [2.0, 4.0, 6.0, 8.0];
			const s1Theta = solveMomentum(s1N, s1D, s1Step, s1Beta, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Beta} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: Momentum optimization on 1D linear regression."));
		}

		// Sample 2
		if (isAdam) {
			const s2N = 5, s2D = 2, s2Step = 0.08, s2B1 = 0.9, s2B2 = 0.99, s2Eps = 0.0001, s2MaxIter = 100;
			const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
			const s2Theta = solveAdam(s2N, s2D, s2Step, s2B1, s2B2, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2B1} ${s2B2} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: Adam optimization on 2D linear regression."));
		} else {
			const s2N = 5, s2D = 2, s2Step = 0.04, s2Beta = 0.85, s2Eps = 0.0001, s2MaxIter = 80;
			const s2X = [[1.0, 0.5], [2.0, 1.0], [1.5, 2.0], [3.0, 1.5], [2.5, 0.5]];
			const s2Y = [2.0, 3.5, 4.0, 5.0, 3.0];
			const s2Theta = solveMomentum(s2N, s2D, s2Step, s2Beta, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Beta} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: Momentum optimization on 2D linear regression."));
		}

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(isAdam ? 0.05 : 0.02, isAdam ? 0.15 : 0.06).toFixed(4));
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
				y.push(parseFloat(val.toFixed(2)));
			}

			if (isAdam) {
				const beta1 = parseFloat(rng.choice([0.85, 0.9, 0.92]).toFixed(2));
				const beta2 = parseFloat(rng.choice([0.98, 0.99, 0.999]).toFixed(3));
				const thetas = solveAdam(N, D, stepSize, beta1, beta2, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${beta1} ${beta2} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			} else {
				const beta = parseFloat(rng.choice([0.8, 0.85, 0.9]).toFixed(2));
				const thetas = solveMomentum(N, D, stepSize, beta, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${beta} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
			}
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: isAdam ? "Hard" : "Medium",
		category: "machine-learning",
		tags: ["machine-learning", isAdam ? "adam-optimizer" : "momentum-optimizer", "gradient-descent", "optimization", "parameter-training"],
		description: `Train a Linear Regression model using the ${isAdam ? "Adam" : "Momentum"} optimizer and output learned parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: isAdam ? 190 : 170,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const advancedOptimizersProblems: ModelTrainingProblemDefinition[] = optimizerConfigs.map(buildOptimizerProblem);
