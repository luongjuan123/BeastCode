import { ModelTrainingProblemDefinition } from "../types";
import {
	DeterministicRNG,
	makeTc,
	formatProblemStatement,
	formatConstraints,
	f4,
	norm2,
	dot,
	sigmoid,
	HyperparameterConfig,
} from "../utils";

interface NeuralConfig {
	id: string;
	title: string;
	domain: string;
	activation: "sigmoid" | "tanh";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const neuralConfigs: NeuralConfig[] = [
	// 181-190: Artificial Neuron with Sigmoid Activation
	{
		id: "train-single-neuron-181",
		title: "Neural Backprop (Sigmoid): Autonomous Drone Obstacle Proximity Sensation",
		domain: "Robotics & Embedded AI",
		activation: "sigmoid",
		storyContext: "Micro-aerial drone navigation units train single neuromorphic perception nodes mapping ultrasonic sonar echoes to obstacle collision avoidance activations.",
		features: ["sonar echo range (cm)", "ultrasonic envelope width (us)"],
		targetName: "collision evasion activation [0, 1]",
		seed: 5181,
	},
	{
		id: "train-single-neuron-182",
		title: "Neural Backprop (Sigmoid): Smart Thermostat HVAC Duty Cycle Activation",
		domain: "Smart Home IoT",
		activation: "sigmoid",
		storyContext: "Edge IoT smart thermostats train an artificial neuron predicting compressor duty cycle saturation from room thermal loss rate and occupancy sensor triggers.",
		features: ["indoor thermal decay rate (°C/hr)", "occupancy motion score"],
		targetName: "HVAC duty cycle activation [0, 1]",
		seed: 5182,
	},
	{
		id: "train-single-neuron-183",
		title: "Neural Backprop (Sigmoid): High-Speed Camera Exposure Gain Modulation",
		domain: "Computer Vision Hardware",
		activation: "sigmoid",
		storyContext: "Machine vision cameras in high-speed inspection lines train exposure sensor nodes to scale CMOS sensor gain based on ambient light histogram metrics.",
		features: ["scene median lux", "specular highlight percentage"],
		targetName: "CMOS gain activation [0, 1]",
		seed: 5183,
	},
	{
		id: "train-single-neuron-184",
		title: "Neural Backprop (Sigmoid): Industrial Hydraulic Valve Pilot Pressure",
		domain: "Fluid Power Controls",
		activation: "sigmoid",
		storyContext: "Electrohydraulic proportional valves train pilot stage actuation models linking solenoid command voltage to hydraulic pilot spool position.",
		features: ["coil current command (mA)", "fluid operating temperature (°C)"],
		targetName: "normalized pilot valve position [0, 1]",
		seed: 5184,
	},
	{
		id: "train-single-neuron-185",
		title: "Neural Backprop (Sigmoid): Wireless Hearing Aid Noise Suppression Gain",
		domain: "Digital Audio DSP",
		activation: "sigmoid",
		storyContext: "Ultra-low-power DSP hearing aids train single neural processing units to dynamically modulate noise reduction attenuation based on spectral entropy.",
		features: ["spectral flatness measure", "signal-to-noise ratio (dB)"],
		targetName: "noise suppression attenuation [0, 1]",
		seed: 5185,
	},
	{
		id: "train-single-neuron-186",
		title: "Neural Backprop (Sigmoid): Spacecraft Gyroscope Drift Compensation",
		domain: "Inertial Navigation",
		activation: "sigmoid",
		storyContext: "CubeSat attitude determination systems train neuromorphic bias nodes to predict optical fiber gyroscope zero-bias drift from package thermal gradients.",
		features: ["chassis temperature (°C)", "thermal gradient dT/dt"],
		targetName: "bias compensation fraction [0, 1]",
		seed: 5186,
	},
	{
		id: "train-single-neuron-187",
		title: "Neural Backprop (Sigmoid): Automotive Electric Power Steering Assist",
		domain: "Automotive Chassis",
		activation: "sigmoid",
		storyContext: "Electric power steering controllers train boost assistance curves mapping driver steering wheel torque and vehicle forward speed to assist motor current.",
		features: ["driver steering torque (Nm)", "vehicle speed (km/h)"],
		targetName: "power assist ratio [0, 1]",
		seed: 5187,
	},
	{
		id: "train-single-neuron-188",
		title: "Neural Backprop (Sigmoid): Laser Cutting Head Height Auto-Focus",
		domain: "Industrial Photonics",
		activation: "sigmoid",
		storyContext: "Fiber laser CNC sheet metal cutting machines train capacitive distance sensor nodes to control focal lens Z-axis clearance.",
		features: ["capacitive sensor capacitance (pF)", "sheet reflection return"],
		targetName: "height control activation [0, 1]",
		seed: 5188,
	},
	{
		id: "train-single-neuron-189",
		title: "Neural Backprop (Sigmoid): Solar Concentrator Heliostat Sun Tracking",
		domain: "Solar Thermal Energy",
		activation: "sigmoid",
		storyContext: "Heliostat field tracking computers train solar quadrant photodiode neurons to calibrate dual-axis azimuth tracking motor slew rates.",
		features: ["quadrant voltage differential (V)", "ambient elevation angle"],
		targetName: "tracking correction rate [0, 1]",
		seed: 5189,
	},
	{
		id: "train-single-neuron-190",
		title: "Neural Backprop (Sigmoid): Deep Sea Diving Suit Oxygen Injection Valve",
		domain: "Atmospheric Diving Systems",
		activation: "sigmoid",
		storyContext: "Atmospheric diving suits train breathing loop sensor neurons to calibrate oxygen addition valve duty cycle from metabolic oxygen consumption.",
		features: ["breathing loop PO2 (kPa)", "diver metabolic heart rate"],
		targetName: "solenoid duty cycle [0, 1]",
		seed: 5190,
	},
	// 191-200: Artificial Neuron with Tanh Activation
	{
		id: "train-tanh-neuron-191",
		title: "Neural Backprop (Tanh): Active Magnetic Bearing Magnetic Flux Centering",
		domain: "Turbomachinery & Magnetic Bearings",
		activation: "tanh",
		storyContext: "High-speed centrifugal compressor active magnetic bearings train bipolar neuromorphic centering nodes to counteract rotor shaft displacement.",
		features: ["inductive sensor X displacement (um)", "shaft rotational speed (krpm)"],
		targetName: "electromagnet centering flux [-1, 1]",
		seed: 5191,
	},
	{
		id: "train-tanh-neuron-192",
		title: "Neural Backprop (Tanh): Submarine Ballast Trim Pitch Moment",
		domain: "Naval Submersible Control",
		activation: "tanh",
		storyContext: "Submersible depth control systems train bipolar neural trim units to modulate bow and stern ballast pump water transfer against hydrodynamic pitch angles.",
		features: ["hull inclinometer pitch (deg)", "forward underwater velocity (knots)"],
		targetName: "trim pump flow direction and magnitude [-1, 1]",
		seed: 5192,
	},
	{
		id: "train-tanh-neuron-193",
		title: "Neural Backprop (Tanh): Superconducting Cavity RF Resonance Tuning",
		domain: "Linear Particle Accelerators",
		activation: "tanh",
		storyContext: "Particle beam accelerators train fast piezoelectric tuner nodes to dynamically detune superconducting RF cavities against microphonic vibration noise.",
		features: ["RF cavity phase error (deg)", "cryomodule vibration frequency (Hz)"],
		targetName: "piezo tuner voltage actuation [-1, 1]",
		seed: 5193,
	},
	{
		id: "train-tanh-neuron-194",
		title: "Neural Backprop (Tanh): Quadcopter Drone Yaw Counter-Torque",
		domain: "Unmanned Aerial Systems",
		activation: "tanh",
		storyContext: "High-agility acrobatic drone flight controllers train bipolar yaw rate neurons mapping angular rate gyro errors to differential motor RPM offsets.",
		features: ["yaw gyro rate error (deg/s)", "total collective thrust (N)"],
		targetName: "differential motor counter-torque [-1, 1]",
		seed: 5194,
	},
	{
		id: "train-tanh-neuron-195",
		title: "Neural Backprop (Tanh): High-Precision Galvanometer Mirror Deflection",
		domain: "Optical Scanning Systems",
		activation: "tanh",
		storyContext: "Ultrafast optical laser scanners train moving-magnet galvanometer driver nodes to eliminate overshoot ringing during raster line turns.",
		features: ["encoder position error (urad)", "angular velocity derivative"],
		targetName: "galvo drive torque command [-1, 1]",
		seed: 5195,
	},
	{
		id: "train-tanh-neuron-196",
		title: "Neural Backprop (Tanh): Seismic Vibration Active Mass Damper",
		domain: "Structural Earthquake Engineering",
		activation: "tanh",
		storyContext: "Skyscraper tuned mass dampers train active hydraulic actuator nodes to generate opposing inertia forces during wind and seismic ground motions.",
		features: ["top-floor floor acceleration (mg)", "damper relative stroke (mm)"],
		targetName: "damper hydraulic force output [-1, 1]",
		seed: 5196,
	},
	{
		id: "train-tanh-neuron-197",
		title: "Neural Backprop (Tanh): Bipedal Walking Robot Ankle Roll Balancing",
		domain: "Humanoid Robotics",
		activation: "tanh",
		storyContext: "Humanoid bipedal robots train balance reflex neurons mapping zero-moment point (ZMP) trajectory errors to ankle roll joint torque adjustments.",
		features: ["lateral ZMP error (mm)", "IMU lateral roll rate (deg/s)"],
		targetName: "ankle roll torque command [-1, 1]",
		seed: 5197,
	},
	{
		id: "train-tanh-neuron-198",
		title: "Neural Backprop (Tanh): Satellite Reaction Wheel Speed Despin",
		domain: "Satellite Guidance Systems",
		activation: "tanh",
		storyContext: "Small satellites train magnetorquer control neurons to generate magnetic dipole moments counteracting excess reaction wheel spin rates.",
		features: ["wheel angular momentum deficit (Nms)", "geomagnetic field component (uT)"],
		targetName: "magnetic coil drive current [-1, 1]",
		seed: 5198,
	},
	{
		id: "train-tanh-neuron-199",
		title: "Neural Backprop (Tanh): Wind Tunnel Sting Balance Aerodynamic Yaw",
		domain: "Aerospace Testing",
		activation: "tanh",
		storyContext: "Aircraft wind tunnel model sting balances train strain gauge calibration neurons to predict side-force aerodynamic yaw moments.",
		features: ["lateral strain gauge output (uV)", "angle of sideslip (deg)"],
		targetName: "yawing moment coefficient [-1, 1]",
		seed: 5199,
	},
	{
		id: "train-tanh-neuron-200",
		title: "Neural Backprop (Tanh): Cryogenic Space Cooler Linear Compressor Stroke",
		domain: "Cryogenic Space Science",
		activation: "tanh",
		storyContext: "Stirling space cryocoolers train dual-opposed linear compressor vibration canceling neurons to minimize exported micro-vibrations to infrared optics.",
		features: ["accelerometer exported force (N)", "drive frequency phase angle (rad)"],
		targetName: "opposed piston balance stroke [-1, 1]",
		seed: 5200,
	},
];

export function buildNeuralProblem(conf: NeuralConfig): ModelTrainingProblemDefinition {
	const isSigmoid = conf.activation === "sigmoid";

	const hyperConfig: HyperparameterConfig = {
		method: `Single Artificial Neuron (${isSigmoid ? "Sigmoid" : "Tanh"} Activation) via Backpropagation (MSE Loss)`,
		initialParams: "bias b = 0.0, weights w = [0.0, ..., 0.0]",
		stepSizeDesc: "Read step_size directly from input line 1",
		epsDesc: "Read eps directly from input line 1 (stop when sqrt(grad_b^2 + ||grad_w||_2^2) < eps)",
		maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
		updateRule: isSigmoid
			? "yHat_i = sigmoid(w^T x_i + b); delta_i = (yHat_i - y_i) * yHat_i * (1 - yHat_i); grad_w = (1/N) * sum delta_i * x_i; grad_b = (1/N) * sum delta_i; w := w - step_size * grad_w; b := b - step_size * grad_b"
			: "yHat_i = tanh(w^T x_i + b); delta_i = (yHat_i - y_i) * (1 - yHat_i^2); grad_w = (1/N) * sum delta_i * x_i; grad_b = (1/N) * sum delta_i; w := w - step_size * grad_w; b := b - step_size * grad_b",
		stoppingCriterion: "Stop when sqrt(grad_b^2 + ||grad_w||_2^2) < eps or max_iter iterations reached",
		outputPrecision: "Exactly 4 decimal places for: b w_1 ... w_D",
	};

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team trains a <b>Single Artificial Neuron</b> with <b>${
		isSigmoid ? "Sigmoid" : "Hyperbolic Tangent (Tanh)"
	} Activation</b> mapping input feature vector <code>x</code> to continuous prediction <code>yHat</code>:
<code>yHat = ${isSigmoid ? "sigma(w^T x + b) = 1 / (1 + exp(-(w^T x + b)))" : "tanh(w^T x + b) = (exp(2*z) - 1) / (exp(2*z) + 1)"}</code>
where <code>b</code> is the scalar bias term and <code>w = [w_1, ..., w_D]</code> is the weight vector.</p>
<p>The neuron is trained by minimizing the Mean Squared Error (MSE) loss:
<code>L(w, b) = 1 / (2N) * sum_{i=1}^N (yHat_i - y_i)^2</code></p>
<p><b>Backpropagation Gradient Equations:</b>
<ul>
<li>Forward pass: compute pre-activation <code>z_i = w^T x_i + b</code> and activation <code>yHat_i = ${
		isSigmoid ? "sigma(z_i)" : "tanh(z_i)"
	}</code>.</li>
<li>Output error signal:
  <code>delta_i = ${
		isSigmoid ? "(yHat_i - y_i) * yHat_i * (1 - yHat_i)" : "(yHat_i - y_i) * (1 - yHat_i^2)"
	}</code>
</li>
<li>Weight gradient: <code>grad_w = (1 / N) * sum_{i=1}^N delta_i * x_i</code></li>
<li>Bias gradient: <code>grad_b = (1 / N) * sum_{i=1}^N delta_i</code></li>
<li>Parameter updates:
  <code>w := w - step_size * grad_w</code><br/>
  <code>b := b - step_size * grad_b</code>
</li>
<li>Total gradient norm: <code>gNorm = sqrt(grad_b^2 + sum_{j=1}^D grad_w[j]^2)</code>.</li>
<li>Stop when <code>gNorm < eps</code> or when <code>max_iter</code> iterations are completed.</li>
</ul>
Training begins from initial parameters: <code>b = 0.0</code> and <code>w = [0.0, ..., 0.0]</code>.</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, eps, and max_iter on the first line, followed by the feature matrix X and target continuous values y, train the artificial neuron starting from b = 0 and w = 0. Output the final parameters (b w_1 ... w_D) on a single line, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains five values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing continuous targets <code>y</code> (${
		isSigmoid ? "in range [0, 1]" : "in range [-1, 1]"
	}).</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>b w_1 ... w_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.01 <= step_size <= 2.0",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		isSigmoid ? "0.0 <= y_i <= 1.0" : "-1.0 <= y_i <= 1.0",
		"Initial parameters: b = 0.0, w = [0.0, ..., 0.0]",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveNeuron = (
			N: number,
			D: number,
			stepSize: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let b = 0;
			let w = new Array(D).fill(0);

			for (let iter = 0; iter < maxIter; iter++) {
				const grad_w = new Array(D).fill(0);
				let grad_b = 0;

				for (let i = 0; i < N; i++) {
					const z = dot(w, X[i]) + b;
					let yHat = 0;
					let delta = 0;

					if (isSigmoid) {
						yHat = sigmoid(z);
						delta = (yHat - y[i]) * yHat * (1 - yHat);
					} else {
						yHat = Math.tanh(Math.min(20, Math.max(-20, z)));
						delta = (yHat - y[i]) * (1 - yHat * yHat);
					}

					for (let d = 0; d < D; d++) {
						grad_w[d] += (delta * X[i][d]) / N;
					}
					grad_b += delta / N;
				}

				const gNorm = Math.sqrt(grad_b * grad_b + norm2(grad_w) * norm2(grad_w));
				if (gNorm < eps) break;

				w = w.map((val, d) => val - stepSize * grad_w[d]);
				b -= stepSize * grad_b;
			}

			return [b, ...w];
		};

		// Sample 1
		const s1N = 4, s1D = 1, s1Step = 0.5, s1Eps = 0.001, s1MaxIter = 50;
		const s1X = [[-1.0], [-0.5], [0.5], [1.0]];
		const s1Y = isSigmoid ? [0.1, 0.3, 0.7, 0.9] : [-0.8, -0.4, 0.4, 0.8];
		const s1Params = solveNeuron(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1X, s1Y);
		const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}\n` +
			s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
		tcs.push(makeTc(1, s1In, s1Params.map(f4).join(" "), true, "Sample test: 1D artificial neuron backprop."));

		// Sample 2
		const s2N = 5, s2D = 2, s2Step = 0.2, s2Eps = 0.0001, s2MaxIter = 60;
		const s2X = [
			[-1.0, 0.5],
			[-0.5, -0.5],
			[0.0, 0.2],
			[0.8, -0.4],
			[1.2, 0.6],
		];
		const s2Y = isSigmoid ? [0.2, 0.1, 0.5, 0.8, 0.95] : [-0.6, -0.8, 0.0, 0.7, 0.9];
		const s2Params = solveNeuron(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2X, s2Y);
		const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}\n` +
			s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
		tcs.push(makeTc(2, s2In, s2Params.map(f4).join(" "), true, "Sample test: 2D artificial neuron backprop."));

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.1, 0.6).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 80);

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.5, 1.5, 2);
				X.push(row);
				if (isSigmoid) {
					y.push(parseFloat(rng.nextFloat(0.05, 0.95).toFixed(2)));
				} else {
					y.push(parseFloat(rng.nextFloat(-0.9, 0.9).toFixed(2)));
				}
			}

			const params = solveNeuron(N, D, stepSize, eps, maxIter, X, y);
			const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter}\n` +
				X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
			tcs.push(makeTc(i, inText, params.map(f4).join(" ")));
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "neural-networks", "backpropagation", "gradient-descent", "parameter-training"],
		description: `Train an artificial neuron with ${isSigmoid ? "Sigmoid" : "Tanh"} activation using backpropagation and output learned parameters (bias and weights).`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: 170,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const neuralAndEnsemblesProblems: ModelTrainingProblemDefinition[] = neuralConfigs.map(buildNeuralProblem);
