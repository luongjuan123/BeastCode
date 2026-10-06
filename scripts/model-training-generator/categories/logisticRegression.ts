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
	sigmoid,
	HyperparameterConfig,
} from "../utils";

interface LogisticConfig {
	id: string;
	title: string;
	domain: string;
	withPenalty: boolean;
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const logisticConfigs: LogisticConfig[] = [
	// 41-50: Standard Binary Logistic BGD
	{
		id: "train-logistic-bgd-41",
		title: "Logistic BGD: Financial Fraud Transaction Detection",
		domain: "Financial Technology",
		withPenalty: false,
		storyContext: "FinSecure operates payment screening algorithms classifying transactions as fraudulent (1) or legitimate (0) using normalized transaction velocity, device IP risk score, and billing mismatch.",
		features: ["transaction velocity score", "IP address risk index", "billing distance offset"],
		targetName: "fraudulent indicator (1 = fraud, 0 = legitimate)",
		seed: 5041,
	},
	{
		id: "train-logistic-bgd-42",
		title: "Logistic BGD: Telecommunications Customer Churn Probability",
		domain: "Telecommunications",
		withPenalty: false,
		storyContext: "TelcoMobile models subscriber churn probability at the end of billing cycles from data overage frequencies, customer support ticket counts, and contract tenure.",
		features: ["monthly overage usage", "support ticket count", "contract tenure months"],
		targetName: "churn indicator (1 = churned, 0 = retained)",
		seed: 5042,
	},
	{
		id: "train-logistic-bgd-43",
		title: "Logistic BGD: Critical Hospital Patient ICU Sepsis Alert",
		domain: "Healthcare Informatics",
		withPenalty: false,
		storyContext: "Intensive care bedside monitors estimate real-time probability of septic shock onset using systemic inflammatory indicators.",
		features: ["mean arterial pressure", "heart rate variability", "serum lactate level"],
		targetName: "sepsis onset (1 = positive, 0 = negative)",
		seed: 5043,
	},
	{
		id: "train-logistic-bgd-44",
		title: "Logistic BGD: Subsea Pipeline Corrosion Failure Risk",
		domain: "Offshore Energy",
		withPenalty: false,
		storyContext: "Offshore oil and gas inspection drones predict cathodic protection failure in subsea pipelines using electrochemical potential and seawater salinity.",
		features: ["galvanic potential (mV)", "dissolved oxygen (mg/L)", "acoustic wall thickness (mm)"],
		targetName: "severe corrosion alarm (1 = alert, 0 = nominal)",
		seed: 5044,
	},
	{
		id: "train-logistic-bgd-45",
		title: "Logistic BGD: Semiconductor Die Yield Defect Classification",
		domain: "Microchip Fabrication",
		withPenalty: false,
		storyContext: "Automated optical inspection tools categorize microelectronic wafer dies as defective (1) or functional (0) based on defect density and gate leakage current.",
		features: ["particle defect count", "quiescent supply current (uA)"],
		targetName: "die defect status (1 = defective, 0 = functional)",
		seed: 5045,
	},
	{
		id: "train-logistic-bgd-46",
		title: "Logistic BGD: E-Commerce Search Query Purchase Intent",
		domain: "E-Commerce",
		withPenalty: false,
		storyContext: "Search ranking models determine if an e-commerce search session will convert into a product purchase based on session dwell time and review browsing count.",
		features: ["session dwell time (min)", "product page views", "cart additions"],
		targetName: "purchase conversion (1 = purchased, 0 = bounced)",
		seed: 5046,
	},
	{
		id: "train-logistic-bgd-47",
		title: "Logistic BGD: Railway Track Rail Defect Ultrasonic Detection",
		domain: "Transportation Infrastructure",
		withPenalty: false,
		storyContext: "High-speed rail track recording cars analyze ultrasonic echo backscattering to identify subsurface transverse fissures in steel rails.",
		features: ["ultrasonic attenuation (dB)", "echo peak latency (us)"],
		targetName: "rail fissure detected (1 = defect, 0 = intact)",
		seed: 5047,
	},
	{
		id: "train-logistic-bgd-48",
		title: "Logistic BGD: Autonomous Drone Wind Turbulence Stall Prediction",
		domain: "Aviation & Robotics",
		withPenalty: false,
		storyContext: "Autonomous delivery drones predict aerodynamic wing stall conditions in turbulent mountain canyons from angle of attack and airspeed readings.",
		features: ["angle of attack (deg)", "airspeed pitot delta (m/s)"],
		targetName: "stall warning (1 = stall imminent, 0 = safe)",
		seed: 5048,
	},
	{
		id: "train-logistic-bgd-49",
		title: "Logistic BGD: Cloud Microservice SLA Breach Prediction",
		domain: "DevOps & Cloud SRE",
		withPenalty: false,
		storyContext: "Site reliability engineering telemetry predicts whether a microservice latency threshold will breach SLO targets based on thread pool saturation and GC pauses.",
		features: ["JVM GC pause duration (ms)", "database connection wait (ms)"],
		targetName: "SLO breach (1 = breach, 0 = compliant)",
		seed: 5049,
	},
	{
		id: "train-logistic-bgd-50",
		title: "Logistic BGD: Geothermal Power Plant Well Scale Deposition",
		domain: "Geothermal Energy",
		withPenalty: false,
		storyContext: "Geothermal production engineers classify whether silica scale deposition will plug production wellheads from brine pH and silica saturation indices.",
		features: ["brine pH level", "silica saturation index"],
		targetName: "scale fouling event (1 = scaling, 0 = clean)",
		seed: 5050,
	},
	// 51-60: L2-Penalized Logistic BGD
	{
		id: "train-logistic-l2-51",
		title: "L2 Logistic BGD: Credit Scoring Default Probability",
		domain: "Banking & Credit Risk",
		withPenalty: true,
		storyContext: "Retail banking underwriting models loan default probability using applicant debt-to-income ratio, revolving credit utilization, and credit inquiries with L2 weight shrinkage.",
		features: ["debt-to-income ratio", "revolving credit utilization", "recent credit inquiries"],
		targetName: "default indicator (1 = default, 0 = repaid)",
		seed: 5051,
	},
	{
		id: "train-logistic-l2-52",
		title: "L2 Logistic BGD: Cyber Threat Intrusion Detection",
		domain: "Cybersecurity",
		withPenalty: true,
		storyContext: "Intrusion Detection Systems (IDS) classify anomalous network flow traffic as malicious port scanning or benign using flow duration and SYN packet flags.",
		features: ["SYN packet ratio", "flow bytes per second", "failed auth attempts"],
		targetName: "intrusion alert (1 = attack, 0 = benign)",
		seed: 5052,
	},
	{
		id: "train-logistic-l2-53",
		title: "L2 Logistic BGD: Pharmaceutical Clinical Trial Drop-Out Rate",
		domain: "Clinical Biostatistics",
		withPenalty: true,
		storyContext: "Phase III clinical trial researchers model patient drop-out probabilities using baseline vital signs and self-reported adverse events under L2 regularized logistic regression.",
		features: ["adverse event severity", "dosage cohort level", "baseline biomarker"],
		targetName: "trial discontinuation (1 = dropped out, 0 = completed)",
		seed: 5053,
	},
	{
		id: "train-logistic-l2-54",
		title: "L2 Logistic BGD: Autonomous Driving Pedestrian Crossing Intent",
		domain: "Autonomous Driving",
		withPenalty: true,
		storyContext: "Robo-taxi vision stacks classify whether a detected curb-side pedestrian intends to step into the crosswalk using head pose orientation and walking velocity.",
		features: ["head orientation angle (rad)", "approach velocity (m/s)"],
		targetName: "crossing intent (1 = crossing, 0 = waiting)",
		seed: 5054,
	},
	{
		id: "train-logistic-l2-55",
		title: "L2 Logistic BGD: Spacecraft Reaction Wheel Desaturation Trigger",
		domain: "Aerospace Guidance",
		withPenalty: true,
		storyContext: "Attitude control systems decide whether momentum wheel angular momentum limits will saturate within the orbit cycle, requiring thruster desaturation pulses.",
		features: ["wheel angular momentum (Nms)", "solar torque integral (Nms)"],
		targetName: "desaturation trigger (1 = dump momentum, 0 = hold)",
		seed: 5055,
	},
	{
		id: "train-logistic-l2-56",
		title: "L2 Logistic BGD: Smart Electrical Grid Transformer Failure",
		domain: "Electrical Smart Grid",
		withPenalty: true,
		storyContext: "Power grid transformers are classified for imminent insulation breakdown based on dissolved hydrogen and acetylene gas concentrations in cooling oil.",
		features: ["dissolved hydrogen (ppm)", "dissolved acetylene (ppm)"],
		targetName: "transformer fault alarm (1 = trip, 0 = normal)",
		seed: 5056,
	},
	{
		id: "train-logistic-l2-57",
		title: "L2 Logistic BGD: Precision Agriculture Pest Outbreak Warning",
		domain: "AgriTech",
		withPenalty: true,
		storyContext: "Crop monitoring stations classify regional locust and aphid infestation risk from accumulated growing degree days and relative humidity.",
		features: ["growing degree days", "consecutive humid days", "foliar canopy density"],
		targetName: "pest infestation warning (1 = outbreak, 0 = safe)",
		seed: 5057,
	},
	{
		id: "train-logistic-l2-58",
		title: "L2 Logistic BGD: Commercial Aviation Hydraulic Valve Stiction",
		domain: "Aerospace Maintenance",
		withPenalty: true,
		storyContext: "Flight control computer diagnostics classify whether an elevator servo actuator is experiencing mechanical valve stiction from current command lag.",
		features: ["actuator position lag (ms)", "command tracking error (deg)"],
		targetName: "valve stiction detected (1 = stuck, 0 = smooth)",
		seed: 5058,
	},
	{
		id: "train-logistic-l2-59",
		title: "L2 Logistic BGD: High-Yield Bond Credit Rating Downgrade",
		domain: "Fixed Income Finance",
		withPenalty: true,
		storyContext: "Fixed income asset managers model the 12-month downgrade probability of corporate high-yield bonds from interest coverage and EBITDA margin.",
		features: ["interest coverage ratio", "EBITDA margin (%)", "net debt to EBITDA"],
		targetName: "downgrade event (1 = downgraded, 0 = stable)",
		seed: 5059,
	},
	{
		id: "train-logistic-l2-60",
		title: "L2 Logistic BGD: Deep Sea ROV Battery Low-Voltage Cutoff",
		domain: "Marine Robotics",
		withPenalty: true,
		storyContext: "Deep-sea underwater robotic vehicles classify emergency battery abort conditions using cell voltage sag under deep subsea ambient pressure.",
		features: ["cell pack voltage sag (V)", "ambient sea temperature (°C)"],
		targetName: "emergency abort cutoff (1 = abort, 0 = continue)",
		seed: 5060,
	},
];

export function buildLogisticProblem(conf: LogisticConfig): ModelTrainingProblemDefinition {
	const withL2 = conf.withPenalty;

	const hyperConfig: HyperparameterConfig = {
		method: withL2
			? "Binary Logistic Regression with L2 Regularization (BGD)"
			: "Standard Binary Logistic Regression (Batch Gradient Descent)",
		initialParams: "theta = [0.0, 0.0, ..., 0.0] (all initialized to 0.0)",
		stepSizeDesc: "Read step_size directly from input line 1",
		epsDesc: "Read eps directly from input line 1 (stop when ||grad||_2 < eps)",
		maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
		extraParamsDesc: withL2 ? "lambda (L2 penalty coefficient on features theta_1 ... theta_D)" : undefined,
		updateRule: withL2
			? "p_i = sigmoid(x_tilde_i^T theta); grad_0 = (1/N)*sum(p_i - y_i); grad_j = (1/N)*sum((p_i - y_i)*x_ij) + lambda*theta_j; theta := theta - step_size * grad"
			: "p_i = sigmoid(x_tilde_i^T theta); grad = (1/N) * X_tilde^T * (p - y); theta := theta - step_size * grad",
		stoppingCriterion: "Stop when ||grad||_2 < eps or max_iter iterations reached",
		outputPrecision: "Exactly 4 decimal places for each parameter: theta_0 theta_1 ... theta_D",
	};

	const story = `<p>${conf.storyContext}</p>
<p>The engineering team trains a <b>Binary Logistic Regression</b> model predicting the probability that a sample belongs to class 1:
<code>P(y = 1 | x) = sigma(theta_0 + theta_1 * x_1 + ... + theta_D * x_D) = 1 / (1 + exp(-x_tilde^T theta))</code>
where <code>theta_0</code> represents the unpenalized intercept parameter (corresponding to <code>x_0 = 1</code>).</p>
<p>The model minimizes Binary Cross-Entropy (BCE) loss${withL2 ? " with an L2 weight penalty on non-intercept terms" : ""}:
<code>${
		withL2
			? "L(theta) = -1/N * sum_{i=1}^N [y_i * ln(p_i) + (1 - y_i) * ln(1 - p_i)] + (lambda / 2) * sum_{j=1}^D theta_j^2"
			: "L(theta) = -1/N * sum_{i=1}^N [y_i * ln(p_i) + (1 - y_i) * ln(1 - p_i)]"
	}</code></p>
<p>Batch Gradient Descent computes the exact gradient at each step:
<code>grad = (1/N) * X_tilde^T * (p - y)${withL2 ? " + [0, lambda*theta_1, ..., lambda*theta_D]^T" : ""}</code>
and updates parameters:
<code>theta := theta - step_size * grad</code>.
Training begins at initial parameters <code>theta = [0, 0, ..., 0]</code> and halts when <code>||grad||_2 < eps</code> or when <code>max_iter</code> iterations are reached.</p>`;

	const task = `Given N training instances, D features, and hyperparameters ${
		withL2 ? "step_size, eps, max_iter, and lambda" : "step_size, eps, and max_iter"
	} on the first line, followed by the feature matrix X and binary labels y (each 0 or 1), train the logistic regression model starting from theta = 0. Output the final parameters (theta_0 theta_1 ... theta_D) separated by spaces, formatted to exactly 4 decimal places.`;

	const inputFormat = `<p>The first line contains ${
		withL2 ? "six" : "five"
	} values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, integer <code>max_iter</code>${
		withL2 ? ", and real number <code>lambda</code>" : ""
	}.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>
<p>The last line contains <code>N</code> integers (each 0 or 1) representing binary target labels <code>y</code>.</p>`;

	const outputFormat = `<p>Print a single line containing <code>D + 1</code> space-separated real numbers: <code>theta_0 theta_1 ... theta_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		"0.001 <= step_size <= 1.0",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		...(withL2 ? ["0.0 <= lambda <= 5.0"] : []),
		"y_i in {0, 1}",
		"Initial parameters: theta = [0.0, 0.0, ..., 0.0]",
		"Augment X with an intercept column of 1s: x_0 = 1",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveLogistic = (
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
				const z = matVecMul(X_tilde, theta);
				const p = z.map(sigmoid);
				const err = p.map((prob, i) => prob - y[i]);
				const grad = matVecMul(XT, err).map((g) => g / N);
				if (withL2) {
					for (let j = 1; j <= D; j++) {
						grad[j] += lambdaVal * theta[j];
					}
				}
				const gNorm = norm2(grad);
				if (gNorm < eps) break;
				theta = theta.map((th, d) => th - stepSize * grad[d]);
			}
			return theta;
		};

		// Sample 1: 1D simple classification
		const s1N = 4, s1D = 1, s1Step = 0.2, s1Eps = 0.001, s1MaxIter = 50, s1Lam = withL2 ? 0.5 : 0;
		const s1X = [[-1.5], [-0.5], [0.5], [1.5]];
		const s1Y = [0, 0, 1, 1];
		const s1Theta = solveLogistic(s1N, s1D, s1Step, s1Eps, s1MaxIter, s1Lam, s1X, s1Y);
		const s1Header = withL2
			? `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter} ${s1Lam}`
			: `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}`;
		const s1In = `${s1Header}\n` + s1X.map((r) => r.join(" ")).join("\n") + `\n${s1Y.join(" ")}`;
		tcs.push(makeTc(1, s1In, s1Theta.map(f4).join(" "), true, "Sample test: 1D separable binary classification."));

		// Sample 2: 2D classification
		const s2N = 6, s2D = 2, s2Step = 0.1, s2Eps = 0.0001, s2MaxIter = 60, s2Lam = withL2 ? 1.0 : 0;
		const s2X = [
			[-1.0, -1.0],
			[-0.5, -0.8],
			[-0.2, -0.1],
			[0.8, 0.9],
			[1.2, 0.5],
			[0.5, 1.1],
		];
		const s2Y = [0, 0, 0, 1, 1, 1];
		const s2Theta = solveLogistic(s2N, s2D, s2Step, s2Eps, s2MaxIter, s2Lam, s2X, s2Y);
		const s2Header = withL2
			? `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter} ${s2Lam}`
			: `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}`;
		const s2In = `${s2Header}\n` + s2X.map((r) => r.join(" ")).join("\n") + `\n${s2Y.join(" ")}`;
		tcs.push(makeTc(2, s2In, s2Theta.map(f4).join(" "), true, "Sample test: 2D binary classification."));

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(6, 20);
			const D = rng.nextInt(1, 3);
			const stepSize = parseFloat(rng.nextFloat(0.05, 0.25).toFixed(4));
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 120);
			const lambdaVal = withL2 ? parseFloat(rng.nextFloat(0.1, 1.5).toFixed(2)) : 0;

			const hyperplane = Array.from({ length: D }, () => rng.nextFloat(-1.5, 1.5));
			const bias = rng.nextFloat(-0.5, 0.5);

			const X: number[][] = [];
			const y: number[] = [];
			for (let n = 0; n < N; n++) {
				const row = rng.floatArray(D, -1.5, 1.5, 2);
				X.push(row);
				let score = bias;
				for (let d = 0; d < D; d++) score += hyperplane[d] * row[d];
				const prob = sigmoid(score);
				// Add small noise to prob to create realistic non-perfect separation
				const label = rng.next() < prob ? 1 : 0;
				y.push(label);
			}

			// Ensure at least one 0 and at least one 1
			if (!y.includes(0)) y[0] = 0;
			if (!y.includes(1)) y[y.length - 1] = 1;

			const thetas = solveLogistic(N, D, stepSize, eps, maxIter, lambdaVal, X, y);
			const header = withL2
				? `${N} ${D} ${stepSize} ${eps} ${maxIter} ${lambdaVal}`
				: `${N} ${D} ${stepSize} ${eps} ${maxIter}`;
			const inText = `${header}\n` + X.map((r) => r.join(" ")).join("\n") + `\n${y.join(" ")}`;
			tcs.push(makeTc(i, inText, thetas.map(f4).join(" ")));
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: withL2 ? "Hard" : "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "logistic-regression", "binary-classification", "gradient-descent", "parameter-training"],
		description: `Train a ${withL2 ? "L2-regularized " : ""}Binary Logistic Regression model using input hyperparameters and output learned parameters theta.`,
		story: formatProblemStatement(conf.title, story, task, hyperConfig),
		task,
		inputFormat,
		outputFormat,
		constraints,
		points: withL2 ? 180 : 160,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases,
	};
}

export const logisticRegressionProblems: ModelTrainingProblemDefinition[] = logisticConfigs.map(buildLogisticProblem);
