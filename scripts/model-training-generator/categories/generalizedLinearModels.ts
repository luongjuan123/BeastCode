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

interface GLMConfig {
	id: string;
	title: string;
	domain: string;
	type: "poisson" | "exponential";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const glmConfigs: GLMConfig[] = [
	// 141-150: Poisson Regression
	{
		id: "train-poisson-glm-141",
		title: "Poisson GLM: Server Cluster Hardware Failure Event Counts",
		domain: "Cloud Infrastructure Reliability",
		type: "poisson",
		storyContext: "Cloud data center reliability engineers model the hourly count of server NVMe drive failures across cluster zones using operating temperatures and chassis vibrations.",
		features: ["operating chassis temp (°C)", "mean disk IOPS / 1000"],
		targetName: "hourly drive replacement count",
		seed: 5141,
	},
	{
		id: "train-poisson-glm-142",
		title: "Poisson GLM: Nuclear Medical Facility Radiation Scintillation Counts",
		domain: "Nuclear Medicine & Health Physics",
		type: "poisson",
		storyContext: "Positron emission tomography (PET) facilities fit Poisson count models relating radioisotope tracer dosage and crystal detector angle to photon coincidence counts.",
		features: ["tracer dosage activity (MBq)", "detector ring angle (rad)"],
		targetName: "gamma photon count",
		seed: 5142,
	},
	{
		id: "train-poisson-glm-143",
		title: "Poisson GLM: Urban Transit Bus Passenger Boarding Flow",
		domain: "Urban Transportation",
		type: "poisson",
		storyContext: "City transit authorities model passenger tap-in boardings per stop based on schedule headway interval and stop pedestrian foot-traffic index.",
		features: ["bus headway interval (min)", "stop pedestrian density index"],
		targetName: "boarding passenger count",
		seed: 5143,
	},
	{
		id: "train-poisson-glm-144",
		title: "Poisson GLM: Telecommunications Cell Tower Dropped Packet Bursts",
		domain: "Cellular Networks",
		type: "poisson",
		storyContext: "5G network operations centers model packet retransmission burst counts per 100ms slot from radio link fading and connected user density.",
		features: ["radio link fading depth (dB)", "connected user count"],
		targetName: "retransmission packet count",
		seed: 5144,
	},
	{
		id: "train-poisson-glm-145",
		title: "Poisson GLM: Semiconductor Photolithography Micro-Defect Spikes",
		domain: "Nanofabrication",
		type: "poisson",
		storyContext: "Extreme ultraviolet (EUV) photolithography scanners model pinhole defect counts per wafer from reticle illumination dose and pellicle temperature.",
		features: ["EUV exposure dose (mJ/cm2)", "pellicle temperature (°C)"],
		targetName: "pinhole defect count",
		seed: 5145,
	},
	{
		id: "train-poisson-glm-146",
		title: "Poisson GLM: Retail Supermarket Checkout Queue Transaction Rate",
		domain: "Retail Operations",
		type: "poisson",
		storyContext: "Supermarket logistics managers model hourly customer checkout transactions from store sales promotions and time past opening.",
		features: ["active promotional discount items", "store ambient occupancy"],
		targetName: "checkout transaction count",
		seed: 5146,
	},
	{
		id: "train-poisson-glm-147",
		title: "Poisson GLM: Deep Sea Hydrothermal Vent Microbial Colony Counts",
		domain: "Marine Microbiology",
		type: "poisson",
		storyContext: "Oceanographic research vessels model hyperthermophile archaea colony counts from hydrothermal chimney water hydrogen sulfide concentrations.",
		features: ["dissolved H2S (mmol/kg)", "fluid venting temperature (°C)"],
		targetName: "microbial colony count",
		seed: 5147,
	},
	{
		id: "train-poisson-glm-148",
		title: "Poisson GLM: Wildlife Conservation Camera Trap Animal Sightings",
		domain: "Ecological Conservation",
		type: "poisson",
		storyContext: "Conservation biologists model nocturnal leopard sightings from infrared camera traps based on proximity to waterholes and vegetative canopy cover.",
		features: ["waterhole distance (km)", "canopy canopy density (%)"],
		targetName: "animal sighting count",
		seed: 5148,
	},
	{
		id: "train-poisson-glm-149",
		title: "Poisson GLM: Solar Coronal Mass Ejection Flare Occurrences",
		domain: "Solar Space Weather",
		type: "poisson",
		storyContext: "Space weather prediction centers model daily solar X-ray flare counts from sunspot active region magnetic shear and sunspot group area.",
		features: ["sunspot group area (micro-hemispheres)", "magnetic neutral line shear"],
		targetName: "M-class solar flare count",
		seed: 5149,
	},
	{
		id: "train-poisson-glm-150",
		title: "Poisson GLM: Commercial Aviation Pilot Air Traffic Alert (TCAS)",
		domain: "Aviation Safety Operations",
		type: "poisson",
		storyContext: "Aviation safety investigators model traffic collision avoidance resolution advisory counts in dense terminal airspace from traffic density.",
		features: ["terminal airspace hourly arrivals", "weather convective index"],
		targetName: "TCAS advisory count",
		seed: 5150,
	},
	// 151-160: Exponential GLM
	{
		id: "train-exponential-glm-151",
		title: "Exponential GLM: Offshore Wind Turbine Bearing Time-To-Failure",
		domain: "Wind Turbine Reliability",
		type: "exponential",
		storyContext: "Offshore wind farm reliability engineers model bearing operational time-to-failure (survival hours) using rotational vibration energy and lubricant metal particle debris.",
		features: ["bearing vibration RMS (mm/s)", "ferrous debris particle density (ppm)"],
		targetName: "time to bearing failure (operating hours)",
		seed: 5151,
	},
	{
		id: "train-exponential-glm-152",
		title: "Exponential GLM: Web Application Server Request Response Duration",
		domain: "Internet Systems Performance",
		type: "exponential",
		storyContext: "High-throughput microservices model server response duration service times as memoryless exponential distributions parameterized by request payload and thread concurrency.",
		features: ["request payload size (KB)", "concurrent worker threads"],
		targetName: "request service time (ms)",
		seed: 5152,
	},
	{
		id: "train-exponential-glm-153",
		title: "Exponential GLM: Radioactive Isotope Nuclear Decay Waiting Interval",
		domain: "Nuclear Radiochemistry",
		type: "exponential",
		storyContext: "Isotope separator facilities model atomic decay waiting intervals under varying electromagnetic trap fields and kinetic temperatures.",
		features: ["magnetic trap field (Tesla)", "ion temperature (mK)"],
		targetName: "decay event waiting time (microseconds)",
		seed: 5153,
	},
	{
		id: "train-exponential-glm-154",
		title: "Exponential GLM: Call Center Customer Hold Queue Patience Time",
		domain: "Service Operations",
		type: "exponential",
		storyContext: "Customer service telephony queues model caller patience waiting time before customer abandon/hang-up as an exponential rate model.",
		features: ["initial estimated wait announcement (min)", "caller customer tier"],
		targetName: "queue wait duration until abandon (seconds)",
		seed: 5154,
	},
	{
		id: "train-exponential-glm-155",
		title: "Exponential GLM: Geothermal Drill Bit Diamond Cutter Failure Life",
		domain: "Geothermal Drilling",
		type: "exponential",
		storyContext: "Deep ultra-hot geothermal drill rigs model poly-crystalline diamond compact (PDC) cutter impact wear life before spalling failure.",
		features: ["weight on drill bit (kN)", "rock unconfined compressive strength (MPa)"],
		targetName: "cutter operational life (drilling hours)",
		seed: 5155,
	},
	{
		id: "train-exponential-glm-156",
		title: "Exponential GLM: Aircraft Hydraulic Hose Burst Rupture Life",
		domain: "Aerospace Hydraulics",
		type: "exponential",
		storyContext: "Flight test safety teams model braided Teflon hydraulic hose pressure cycle fatigue life under high fluid temperatures.",
		features: ["hydraulic fluid temp (°C)", "pressure impulse peak (psi)"],
		targetName: "impulse cycles to rupture",
		seed: 5156,
	},
	{
		id: "train-exponential-glm-157",
		title: "Exponential GLM: Spacecraft Solar Array Micro-Meteoroid Impact Interval",
		domain: "Orbital Debris Science",
		type: "exponential",
		storyContext: "Space station environmental telemetry models interplanetary dust particle strike intervals against orbital altitude and solar inclination angle.",
		features: ["orbital altitude (km)", "solar beta angle (deg)"],
		targetName: "inter-impact arrival interval (hours)",
		seed: 5157,
	},
	{
		id: "train-exponential-glm-158",
		title: "Exponential GLM: Cryogenic Valve Seal Gasket Helium Leak Induction",
		domain: "Cryogenic Engineering",
		type: "exponential",
		storyContext: "Superconducting liquid helium transfer lines model seal gasket leak induction time from cold thermal shock cycles.",
		features: ["cryogenic chill-down rate (K/min)", "flange bolt torque (Nm)"],
		targetName: "time to leak onset (hours)",
		seed: 5158,
	},
	{
		id: "train-exponential-glm-159",
		title: "Exponential GLM: Medical Ventilator Filter Clogging Lifespan",
		domain: "Biomedical Engineering",
		type: "exponential",
		storyContext: "Intensive care mechanical ventilators model HEPA filter airflow resistance saturation duration against patient minute ventilation volumes.",
		features: ["minute ventilation (L/min)", "relative aerosol humidity (%)"],
		targetName: "hours until differential pressure alarm",
		seed: 5159,
	},
	{
		id: "train-exponential-glm-160",
		title: "Exponential GLM: Highway Bridge Expansion Joint Rubber Seal Rupture",
		domain: "Structural Health Monitoring",
		type: "exponential",
		storyContext: "Bridge maintenance engineers model neoprene expansion joint tear failure lifespan from annual thermal expansion stroke and heavy axle cycles.",
		features: ["annual joint stroke (mm)", "daily heavy truck volume / 1000"],
		targetName: "years until seal tear replacement",
		seed: 5160,
	},
];

export function buildGLMProblem(conf: GLMConfig): ModelTrainingProblemDefinition {
	const isPoisson = conf.type === "poisson";

	const hyperConfig: HyperparameterConfig = isPoisson
		? {
				method: "Poisson Generalized Linear Model (Log-Link Gradient Ascent on Log-Likelihood)",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				updateRule:
					"mu_i = exp(min(20, x_tilde_i^T theta)); grad = (1/N) * X_tilde^T * (y - mu); theta := theta + step_size * grad",
				stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  }
		: {
				method: "Exponential Rate Generalized Linear Model (Log-Link Gradient Ascent)",
				initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
				stepSizeDesc: "Read step_size directly from input line 1",
				epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				updateRule:
					"lambda_i = exp(min(20, x_tilde_i^T theta)); grad = (1/N) * sum_{i=1}^N (1 - lambda_i * y_i) * x_tilde_i; theta := theta + step_size * grad",
				stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
		  };

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team fits a <b>Generalized Linear Model (GLM)</b> with a logarithmic link function relating the features to the target:
<code>eta_i = theta_0 + theta_1 * x_{i,1} + ... + theta_D * x_{i,D} = x_tilde_i^T theta</code>
where <code>theta_0</code> is the intercept term (augmented feature <code>x_{i,0} = 1</code>).</p>
${
	isPoisson
		? `<p>For Poisson count data, the expected mean count is:
<code>mu_i = E[y_i | x_i] = exp(x_tilde_i^T theta)</code>.
To prevent numerical overflow during intermediate steps, clip exponent arguments: <code>mu_i = exp(min(20.0, x_tilde_i^T theta))</code>.<br/>
The average log-likelihood gradient is:
<code>grad = (1/N) * X_tilde^T * (y - mu)</code>.</p>`
		: `<p>For exponential duration data, the rate parameter is:
<code>lambda_i = exp(x_tilde_i^T theta)</code>.
To prevent numerical overflow during intermediate steps, clip exponent arguments: <code>lambda_i = exp(min(20.0, x_tilde_i^T theta))</code>.<br/>
The average log-likelihood gradient is:
<code>grad = (1/N) * sum_{i=1}^N (1 - lambda_i * y_i) * x_tilde_i</code>.</p>`
}
<p>The model is trained via <b>Gradient Ascent</b> starting from initial parameters <code>theta = [0, 0, ..., 0]</code>:
<code>theta := theta + step_size * grad</code>.
Training terminates when <code>||grad||_2 < eps</code> or when <code>max_iter</code> iterations are reached.</p>`;

	const task = `Given N training instances, D features, and hyperparameters step_size, eps, and max_iter on the first line, followed by the feature matrix X and targets y, train the ${
		isPoisson ? "Poisson" : "Exponential"
	} GLM via gradient ascent starting from theta = 0. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains five values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> real numbers representing targets <code>y</code> (${
		isPoisson ? "non-negative counts" : "positive durations"
	}).</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.0001 <= step_size <= 0.2",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		isPoisson ? "y_i >= 0 (counts)" : "y_i > 0 (durations)",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solvePoisson = (
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
				const eta = matVecMul(X_tilde, theta);
				const mu = eta.map((val) => Math.exp(Math.min(20, Math.max(-20, val))));
				const diff = y.map((yVal, i) => yVal - mu[i]);
				const grad = matVecMul(XT, diff).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th + stepSize * grad[d]);
			}
			return theta;
		};

		const solveExponential = (
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
				const eta = matVecMul(X_tilde, theta);
				const lambda = eta.map((val) => Math.exp(Math.min(20, Math.max(-20, val))));
				const diff = lambda.map((lVal, i) => 1 - lVal * y[i]);
				const grad = matVecMul(XT, diff).map((g) => g / N);
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th + stepSize * grad[d]);
			}
			return theta;
		};

		const solver = isPoisson ? solvePoisson : solveExponential;

		// Sample 1
		const s1N = 4, s1D = 1, s1Step = 0.05, s1Eps = 0.001, s1MaxIter = 50;
		const s1X = [[0.1], [0.2], [0.3], [0.4]];
		const s1Y = isPoisson ? [1.0, 2.0, 2.0, 3.0] : [1.2, 0.9, 0.7, 0.5];
		const s1Theta = solver(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1X, s1Y);
		const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}\n` +
			s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
		tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: 1D GLM parameter fitting."));

		// Sample 2
		const s2N = 5, s2D = 2, s2Step = 0.03, s2Eps = 0.0001, s2MaxIter = 60;
		const s2X = [
			[0.1, 0.2],
			[0.3, 0.1],
			[0.2, 0.4],
			[0.4, 0.3],
			[0.5, 0.2],
		];
		const s2Y = isPoisson ? [1.0, 3.0, 2.0, 4.0, 5.0] : [1.5, 1.0, 0.8, 0.6, 0.4];
		const s2Theta = solver(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2X, s2Y);
		const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}\n` +
			s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
		tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D GLM parameter fitting."));

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(5, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.01, 0.05).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 80);

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -0.8, 0.8, 2);
				X.push(row);
				if (isPoisson) {
					// Count between 0 and 10
					y.push(rng.nextInt(0, 8));
				} else {
					// Duration between 0.2 and 4.0
					y.push(parseFloat(rng.nextFloat(0.2, 3.0).toFixed(2)));
				}
			}

			const thetas = solver(N, D, stepSize, eps, maxIter, X, y);
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
		tags: ["machine-learning", isPoisson ? "poisson-glm" : "exponential-glm", "generalized-linear-models", "gradient-ascent", "parameter-training"],
		description: `Train a ${isPoisson ? "Poisson" : "Exponential"} Generalized Linear Model (GLM) using input hyperparameters and output learned parameters theta.`,
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

export const generalizedLinearModelsProblems: ModelTrainingProblemDefinition[] = glmConfigs.map(buildGLMProblem);
