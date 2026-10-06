import { ModelTrainingProblemDefinition } from "../types";
import {
	DeterministicRNG,
	makeTc,
	formatProblemStatement,
	formatConstraints,
	f4,
	norm2,
	dot,
	HyperparameterConfig,
} from "../utils";

interface SVMConfig {
	id: string;
	title: string;
	domain: string;
	type: "svm" | "perceptron";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const svmConfigs: SVMConfig[] = [
	// 121-130: Primal Soft-Margin Linear SVM
	{
		id: "train-linear-svm-121",
		title: "Primal Linear SVM: High-Security Biometric Iris Authentication",
		domain: "Biometrics & Computer Vision",
		type: "svm",
		storyContext: "Biometric border control e-gates classify iris feature vectors as matching authorized travelers (+1) or impostors (-1) using maximum-margin linear support vector machines.",
		features: ["normalized iris texture frequency", "pupillary concentricity metric"],
		targetName: "iris match verdict (+1 / -1)",
		seed: 5121,
	},
	{
		id: "train-linear-svm-122",
		title: "Primal Linear SVM: Aircraft Engine Acoustic Foreign Object Damage",
		domain: "Aeroengine Acoustics",
		type: "svm",
		storyContext: "Turbofan intake acoustic arrays classify acoustic transient snaps as foreign object ingestion debris (+1) or baseline aero-acoustic turbulence (-1).",
		features: ["acoustic transient rise time (us)", "high-frequency spectral crest factor"],
		targetName: "foreign object damage alert (+1 / -1)",
		seed: 5122,
	},
	{
		id: "train-linear-svm-123",
		title: "Primal Linear SVM: Credit Card Malware Point-of-Sale Exfiltration",
		domain: "Cyber Threat Intelligence",
		type: "svm",
		storyContext: "Enterprise cybersecurity firewalls classify encrypted TLS egress handshakes as malware command-and-control beaconing (+1) or benign business software (-1).",
		features: ["TLS client hello entropy", "packet inter-arrival variance"],
		targetName: "malware beaconing (+1 / -1)",
		seed: 5123,
	},
	{
		id: "train-linear-svm-124",
		title: "Primal Linear SVM: Subsea Gas Pipeline Methane Seep Sonar",
		domain: "Marine Geology & Energy",
		type: "svm",
		storyContext: "Autonomous survey submarines scan seafloor multibeam water column sonar returns to identify active gaseous methane plume flares (+1) versus marine snow (-1).",
		features: ["acoustic backscatter cross section (dB)", "plume vertical rise velocity (m/s)"],
		targetName: "methane plume detected (+1 / -1)",
		seed: 5124,
	},
	{
		id: "train-linear-svm-125",
		title: "Primal Linear SVM: Precision Oncology Melanoma Dermoscopy",
		domain: "Digital Dermatology",
		type: "svm",
		storyContext: "Dermatological diagnostic imaging extracts ABCD asymmetry and border lesion features to classify suspicious skin lesions as malignant melanoma (+1) or benign nevi (-1).",
		features: ["pigment network irregularity", "structural boundary asymmetry"],
		targetName: "malignancy indicator (+1 / -1)",
		seed: 5125,
	},
	{
		id: "train-linear-svm-126",
		title: "Primal Linear SVM: Commercial Nuclear Core Neutron Flux Tilt",
		domain: "Nuclear Instrumentation",
		type: "svm",
		storyContext: "In-core fission detector strings classify quadrant azimuthal neutron power distributions as asymmetric flux tilt (+1) or balanced core operation (-1).",
		features: ["quadrant power tilt ratio", "control rod insertion offset"],
		targetName: "flux tilt alarm (+1 / -1)",
		seed: 5126,
	},
	{
		id: "train-linear-svm-127",
		title: "Primal Linear SVM: Autonomous Agricultural Weeding Vision",
		domain: "Robotic Agriculture",
		type: "svm",
		storyContext: "Robotic laser weeders classify crop row foliage as invasive weed species (+1) or target lettuce seedlings (-1) under sunlight variations.",
		features: ["leaf aspect ratio", "chlorophyll red-edge ratio"],
		targetName: "target weed (+1 / -1)",
		seed: 5127,
	},
	{
		id: "train-linear-svm-128",
		title: "Primal Linear SVM: Power Grid Substation Lightning Flashover",
		domain: "High Voltage Transmission",
		type: "svm",
		storyContext: "Smart substation relay protection systems classify high-speed surge arrestor discharge waves as direct lightning flashover (+1) or switching surge (-1).",
		features: ["surge wavefront di/dt (kA/us)", "discharge residual energy (kJ)"],
		targetName: "flashover fault (+1 / -1)",
		seed: 5128,
	},
	{
		id: "train-linear-svm-129",
		title: "Primal Linear SVM: Hypersonic Scramjet Combustor Flameout Warning",
		domain: "Scramjet Propulsion",
		type: "svm",
		storyContext: "Hypersonic propulsion test stands classify chemiluminescence optical emissions to predict imminent supersonic combustion flameout (+1) versus stable ignition (-1).",
		features: ["OH radical emission intensity", "static wall pressure variance"],
		targetName: "flameout condition (+1 / -1)",
		seed: 5129,
	},
	{
		id: "train-linear-svm-130",
		title: "Primal Linear SVM: Satellite Star Tracker Celestial Attitude Lock",
		domain: "Spacecraft Navigation",
		type: "svm",
		storyContext: "Satellite attitude determination systems classify star centroid triangle constellations as verified catalog attitude fix (+1) or false tracking lock (-1).",
		features: ["inter-star angular distance error", "brightness magnitude match score"],
		targetName: "valid celestial lock (+1 / -1)",
		seed: 5130,
	},
	// 131-140: Perceptron Learning Algorithm
	{
		id: "train-perceptron-131",
		title: "Perceptron: Industrial Assembly Robotic Part Presence Optical Gate",
		domain: "Factory Automation",
		type: "perceptron",
		storyContext: "High-speed packaging lines train online single-layer Perceptron classifiers on infrared retroreflective sensor signals to verify component presence.",
		features: ["photodiode voltage drop", "reflectance dwell time (ms)"],
		targetName: "part verified (+1 / -1)",
		seed: 5131,
	},
	{
		id: "train-perceptron-132",
		title: "Perceptron: Automotive Radar Micro-Doppler Pedestrian Detection",
		domain: "Automotive Safety",
		type: "perceptron",
		storyContext: "77 GHz millimeter-wave automotive radars train online Perceptrons to discriminate pedestrian limb Doppler signatures (+1) from static road clutter (-1).",
		features: ["Doppler frequency spread (kHz)", "radar cross section (dBsm)"],
		targetName: "pedestrian detected (+1 / -1)",
		seed: 5132,
	},
	{
		id: "train-perceptron-133",
		title: "Perceptron: Mining Rock Hardness Sonic Borehole Logging",
		domain: "Geotechnical Mining",
		type: "perceptron",
		storyContext: "Blast-hole drill rigs classify rock strata as hard basalt rock (+1) or soft sandstone (-1) using acoustic sound velocity logging.",
		features: ["compressional P-wave velocity (km/s)", "shear S-wave velocity (km/s)"],
		targetName: "hard rock stratum (+1 / -1)",
		seed: 5133,
	},
	{
		id: "train-perceptron-134",
		title: "Perceptron: Optical Fiber Cable Polarization Mode Dispersion",
		domain: "Optical Communications",
		type: "perceptron",
		storyContext: "Trans-oceanic submarine fiber terminals classify signal constellation distortion into acceptable low PMD (+1) versus severe birefringence distortion (-1).",
		features: ["differential group delay (ps)", "state-of-polarization rotation rate"],
		targetName: "acceptable polarization state (+1 / -1)",
		seed: 5134,
	},
	{
		id: "train-perceptron-135",
		title: "Perceptron: Pharmaceutical Capsule Powder Blending Uniformity",
		domain: "Pharmaceutical Quality",
		type: "perceptron",
		storyContext: "Continuous pharmaceutical blender near-infrared spectroscopy sensors classify blend batches as fully homogeneous (+1) or segregated (-1).",
		features: ["NIR absorption ratio", "powder spectral variance"],
		targetName: "homogeneous blend (+1 / -1)",
		seed: 5135,
	},
	{
		id: "train-perceptron-136",
		title: "Perceptron: Solar Panel Thermal IR Hotspot Defect Detection",
		domain: "Clean Energy Diagnostics",
		type: "perceptron",
		storyContext: "Drone thermographic inspection classifies solar cell string temperatures into defective bypass diode hotspots (+1) or normal operating cells (-1).",
		features: ["hotspot temperature delta (°C)", "adjacent cell gradient"],
		targetName: "hotspot defect detected (+1 / -1)",
		seed: 5136,
	},
	{
		id: "train-perceptron-137",
		title: "Perceptron: Hydraulic Crane Counterweight Tipping Alarm",
		domain: "Heavy Construction",
		type: "perceptron",
		storyContext: "Mobile construction cranes train safety interlocks to detect crane tipping instability (+1) from outrigger load cells and boom luffing angle.",
		features: ["outrigger pressure deficit (kN)", "boom load moment percentage"],
		targetName: "tipping limit alarm (+1 / -1)",
		seed: 5137,
	},
	{
		id: "train-perceptron-138",
		title: "Perceptron: Smart Water Distribution Pipeline Leak Acoustic Geophone",
		domain: "Municipal Utilities",
		type: "perceptron",
		storyContext: "Underground municipal water networks train acoustic geophone listeners to classify pressurized water pipe leak hiss (+1) from traffic noise (-1).",
		features: ["acoustic leak noise frequency (Hz)", "correlation coherence peak"],
		targetName: "pipe rupture leak (+1 / -1)",
		seed: 5138,
	},
	{
		id: "train-perceptron-139",
		title: "Perceptron: Container Ship Diesel Engine Cylinder Scavenge Fire",
		domain: "Marine Engineering",
		type: "perceptron",
		storyContext: "Two-stroke marine diesel engines train scavenge air trunk temperature monitors to trigger automatic CO2 fire extinguishing systems (+1) versus normal load (-1).",
		features: ["scavenge space temperature (°C)", "combustion air delta-P (bar)"],
		targetName: "scavenge fire alarm (+1 / -1)",
		seed: 5139,
	},
	{
		id: "train-perceptron-140",
		title: "Perceptron: Autonomous Drone Battery Thermal Runaway Self-Eject",
		domain: "Aerospace Safety",
		type: "perceptron",
		storyContext: "High-value autonomous survey drones train emergency battery jettison controllers to trigger parachute ejection (+1) upon detecting internal short circuit (-1).",
		features: ["cell swelling pressure (kPa)", "internal temperature rise rate (°C/s)"],
		targetName: "emergency battery jettison (+1 / -1)",
		seed: 5140,
	},
];

export function buildSVMProblem(conf: SVMConfig): ModelTrainingProblemDefinition {
	const isSVM = conf.type === "svm";

	const hyperConfig: HyperparameterConfig = isSVM
		? {
				method: "Linear Support Vector Machine (Subgradient Descent on Primal Soft-Margin SVM)",
				initialParams: "w = [0, ..., 0] and bias b = 0.0",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||subgrad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "lambda (L2 weight regularization penalty on w)",
				updateRule:
					"Active set: S = {i : y_i * (w^T x_i + b) < 1}. subgrad_w = lambda * w - (1/N) * sum_{i in S} y_i * x_i; subgrad_b = - (1/N) * sum_{i in S} y_i; w := w - step_size * subgrad_w; b := b - step_size * subgrad_b",
				stoppingCriterion: "Stop when sqrt(subgrad_b^2 + ||subgrad_w||_2^2) < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for: b w_1 ... w_D",
		  }
		: {
				method: "Perceptron Learning Algorithm (PLA) with Augmented Weights",
				initialParams: "w = [w_0, w_1, ..., w_D] = [0.0, 0.0, ..., 0.0]",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (unused or early stop if 0 errors in epoch)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard epoch cap)",
				updateRule:
					"For each epoch: iterate through samples i=0...N-1: if y_i * (x_tilde_i^T w) <= 0: w := w + step_size * y_i * x_tilde_i. Stop if all samples correctly classified in an epoch.",
				stoppingCriterion: "Stop if epoch error count == 0 or max_iter epochs reached",
				outputPrecision: "Exactly 4 decimal places for: w_0 w_1 ... w_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team trains a <b>${
		isSVM ? "Linear Support Vector Machine (Primal Soft-Margin)" : "Perceptron Classifier"
	}</b> to classify samples into binary labels <code>y_i in {-1, +1}</code>.</p>
${
	isSVM
		? `<p>The primal soft-margin SVM objective is:
<code>L(w, b) = (lambda / 2) * ||w||_2^2 + (1 / N) * sum_{i=1}^N max(0, 1 - y_i * (w^T x_i + b))</code>
Starting from initial weights <code>w = [0, 0, ..., 0]</code> and bias <code>b = 0.0</code>, subgradient descent computes at each step:
<ul>
<li>Identify margin-violating samples: <code>S = { i : y_i * (w^T x_i + b) < 1 }</code></li>
<li>Subgradient for weight vector <code>w</code>: <code>subgrad_w = lambda * w - (1/N) * sum_{i in S} y_i * x_i</code></li>
<li>Subgradient for bias <code>b</code>: <code>subgrad_b = - (1/N) * sum_{i in S} y_i</code></li>
<li>Update parameters: <code>w := w - step_size * subgrad_w</code>, and <code>b := b - step_size * subgrad_b</code></li>
<li>Compute total subgradient norm: <code>gNorm = sqrt(subgrad_b^2 + sum_{j=1}^D subgrad_w[j]^2)</code>.</li>
<li>Stop when <code>gNorm < eps</code> or when <code>max_iter</code> iterations are reached.</li>
</ul></p>`
		: `<p>The model uses augmented feature vectors <code>x_tilde_i = [1, x_{i,1}, ..., x_{i,D}]</code> with parameter vector <code>w = [w_0, w_1, ..., w_D]</code> (where <code>w_0</code> is the bias).
Starting from <code>w = [0, 0, ..., 0]</code>, the Perceptron algorithm trains across epochs:
<ul>
<li>For each epoch <code>iter = 0, 1, ..., max_iter - 1</code>:
  <ul>
    <li>Iterate sequentially through each sample <code>i = 0, 1, ..., N - 1</code>:</li>
    <li>If <code>y_i * (x_tilde_i^T w) <= 0</code> (misclassification or margin zero):</li>
    <li>Update weights: <code>w := w + step_size * y_i * x_tilde_i</code></li>
  </ul>
</li>
<li>If an entire epoch completes with zero misclassifications, training terminates immediately.</li>
<li>Otherwise, training halts after <code>max_iter</code> epochs.</li>
</ul></p>`
}`;

	const task = `Given N training instances, D features, and hyperparameters on the first line, followed by the feature matrix X and target labels y (each -1 or +1), train the ${
		isSVM ? "Linear SVM" : "Perceptron"
	} model. Output the final parameters (${
		isSVM ? "b w_1 ... w_D" : "w_0 w_1 ... w_D"
	}) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = isSVM
		? `<p>The first line contains six values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>lambda</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> integers (each -1 or +1) representing target labels <code>y</code>.</p>`
		: `<p>The first line contains five values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> integers (each -1 or +1) representing target labels <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>${
		isSVM ? "b w_1 ... w_D" : "w_0 w_1 ... w_D"
	}</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.001 <= step_size <= 1.0",
		...(isSVM ? ["0.01 <= lambda <= 5.0"] : []),
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"y_i in {-1, 1}",
		"Initial parameters all 0.0",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveSVM = (
			N: number,
			D: number,
			stepSize: number,
			lambdaVal: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let b = 0;
			let w = new Array(D).fill(0);

			for (let iter = 0; iter < maxIter; iter++) {
				const subgrad_w = w.map((wj) => lambdaVal * wj);
				let subgrad_b = 0;

				for (let i = 0; i < N; i++) {
					const margin = y[i] * (dot(w, X[i]) + b);
					if (margin < 1.0) {
						for (let j = 0; j < D; j++) {
							subgrad_w[j] -= (y[i] * X[i][j]) / N;
						}
						subgrad_b -= y[i] / N;
					}
				}

				const totalNorm = Math.sqrt(subgrad_b * subgrad_b + norm2(subgrad_w) * norm2(subgrad_w));
				if (totalNorm < eps) break;

				w = w.map((wj, j) => wj - stepSize * subgrad_w[j]);
				b -= stepSize * subgrad_b;
			}
			return [b, ...w];
		};

		const solvePerceptron = (
			N: number,
			D: number,
			stepSize: number,
			eps: number,
			maxIter: number,
			X: number[][],
			y: number[]
		): number[] => {
			let w = new Array(D + 1).fill(0);
			const X_tilde: number[][] = Array.from({ length: N }, (_, i) => [1, ...X[i]]);

			for (let epoch = 0; epoch < maxIter; epoch++) {
				let mistakes = 0;
				for (let i = 0; i < N; i++) {
					const pred = dot(w, X_tilde[i]);
					if (y[i] * pred <= 0) {
						mistakes++;
						for (let j = 0; j <= D; j++) {
							w[j] += stepSize * y[i] * X_tilde[i][j];
						}
					}
				}
				if (mistakes === 0) break;
			}
			return w;
		};

		// Sample 1
		if (isSVM) {
			const s1N = 4, s1D = 1, s1Step = 0.1, s1Lam = 0.5, s1Eps = 0.001, s1MaxIter = 50;
			const s1X = [[-2.0], [-1.0], [1.0], [2.0]];
			const s1Y = [-1, -1, 1, 1];
			const s1Param = solveSVM(s1N, s1D, s1Step, s1Lam, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Lam} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Param.map(f4).join(" "), true, "Sample test: 1D Linear SVM."));
		} else {
			const s1N = 4, s1D = 1, s1Step = 0.5, s1Eps = 0.001, s1MaxIter = 20;
			const s1X = [[-2.0], [-1.0], [1.0], [2.0]];
			const s1Y = [-1, -1, 1, 1];
			const s1Param = solvePerceptron(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1X, s1Y);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
			tcs.push(makeTc(1, s1In, s1Param.map(f4).join(" "), true, "Sample test: 1D Perceptron classifier."));
		}

		// Sample 2
		if (isSVM) {
			const s2N = 6, s2D = 2, s2Step = 0.08, s2Lam = 0.2, s2Eps = 0.0001, s2MaxIter = 80;
			const s2X = [
				[-1.0, -1.0],
				[-0.5, -0.8],
				[-0.2, -0.1],
				[0.8, 0.9],
				[1.2, 0.5],
				[0.5, 1.1],
			];
			const s2Y = [-1, -1, -1, 1, 1, 1];
			const s2Param = solveSVM(s2N, s2D, s2Step, s2Lam, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Lam} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Param.map(f4).join(" "), true, "Sample test: 2D Linear SVM."));
		} else {
			const s2N = 6, s2D = 2, s2Step = 0.2, s2Eps = 0.0001, s2MaxIter = 30;
			const s2X = [
				[-1.0, -1.0],
				[-0.5, -0.8],
				[-0.2, -0.1],
				[0.8, 0.9],
				[1.2, 0.5],
				[0.5, 1.1],
			];
			const s2Y = [-1, -1, -1, 1, 1, 1];
			const s2Param = solvePerceptron(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2X, s2Y);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
			tcs.push(makeTc(2, s2In, s2Param.map(f4).join(" "), true, "Sample test: 2D Perceptron classifier."));
		}

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(6, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(isSVM ? 0.05 : 0.1, isSVM ? 0.2 : 0.5).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 100);

			const trueWeights = Array.from({ length: D }, () => rng.nextFloat(-1.5, 1.5));
			const trueBias = rng.nextFloat(-0.5, 0.5);

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.5, 1.5, 2);
				X.push(row);
				const score = trueBias + dot(trueWeights, row);
				y.push(score >= 0 ? 1 : -1);
			}

			// Ensure both classes exist
			if (!y.includes(-1)) y[0] = -1;
			if (!y.includes(1)) y[y.length - 1] = 1;

			if (isSVM) {
				const lambdaVal = parseFloat(rng.nextFloat(0.1, 1.0).toFixed(2));
				const params = solveSVM(N, D, stepSize, lambdaVal, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${lambdaVal} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, params.map(f4).join(" ")));
			} else {
				const params = solvePerceptron(N, D, stepSize, eps, maxIter, X, y);
				const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
				tcs.push(makeTc(i, inText, params.map(f4).join(" ")));
			}
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: isSVM ? "Hard" : "Medium",
		category: "machine-learning",
		tags: ["machine-learning", isSVM ? "support-vector-machine" : "perceptron", "classification", "optimization", "parameter-training"],
		description: `Train a ${isSVM ? "Linear SVM" : "Perceptron"} classifier using input hyperparameters and output learned parameters.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: isSVM ? 190 : 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const svmAndLinearClassifiersProblems: ModelTrainingProblemDefinition[] = svmConfigs.map(buildSVMProblem);
