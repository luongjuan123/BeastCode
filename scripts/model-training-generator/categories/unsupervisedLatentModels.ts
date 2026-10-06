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
	dot,
	HyperparameterConfig,
} from "../utils";

interface LatentConfig {
	id: string;
	title: string;
	domain: string;
	type: "kmeans" | "pca";
	storyContext: string;
	features: string[];
	targetName: string;
	seed: number;
}

const latentConfigs: LatentConfig[] = [
	// 161-170: K-Means Centroid Learning
	{
		id: "train-kmeans-161",
		title: "K-Means Centroid Training: Autonomous Fleet Dispatch Depot Clusters",
		domain: "Urban Logistics",
		type: "kmeans",
		storyContext: "Autonomous ride-hailing fleets partition metropolitan service zones into optimal micro-depot charging hubs by iteratively learning cluster centroid coordinates.",
		features: ["pickup latitude offset (km)", "pickup longitude offset (km)"],
		targetName: "depot centroid locations",
		seed: 5161,
	},
	{
		id: "train-kmeans-162",
		title: "K-Means Centroid Training: Semiconductor Wafer Defect Spatial Clusters",
		domain: "Microchip Metrology",
		type: "kmeans",
		storyContext: "Semiconductor yield diagnostics cluster particle defect coordinates across 300mm silicon wafers to identify robotic transfer arm contamination clusters.",
		features: ["die X coordinate (mm)", "die Y coordinate (mm)"],
		targetName: "defect spatial cluster centroids",
		seed: 5162,
	},
	{
		id: "train-kmeans-163",
		title: "K-Means Centroid Training: Customer Segment Behavioral Persona Prototypes",
		domain: "Customer Analytics",
		type: "kmeans",
		storyContext: "E-commerce customer intelligence groups learn representative customer persona vector centroids based on average basket value and repurchase frequencies.",
		features: ["annual basket spend ($k)", "repurchase frequency ratio"],
		targetName: "customer persona centroid profiles",
		seed: 5163,
	},
	{
		id: "train-kmeans-164",
		title: "K-Means Centroid Training: Wireless Base Station Relay Site Anchors",
		domain: "Telecommunications Infrastructure",
		type: "kmeans",
		storyContext: "5G small-cell network architects cluster user traffic hot-spots to locate central fiber-optic relay hub transceiver anchors.",
		features: ["user coordinate X (m)", "user coordinate Y (m)"],
		targetName: "relay hub anchor coordinates",
		seed: 5164,
	},
	{
		id: "train-kmeans-165",
		title: "K-Means Centroid Training: Seismic Epicenter Aftershock Spatial Centers",
		domain: "Seismology & Geophysics",
		type: "kmeans",
		storyContext: "Earthquake response agencies cluster spatial aftershock hypocenters following major fault ruptures to deploy disaster relief triage stations.",
		features: ["aftershock strike offset (km)", "aftershock dip depth (km)"],
		targetName: "aftershock cluster centroids",
		seed: 5165,
	},
	{
		id: "train-kmeans-166",
		title: "K-Means Centroid Training: Astronomical Star Cluster Metallicity Centroids",
		domain: "Observational Astrophysics",
		type: "kmeans",
		storyContext: "Spectroscopic survey telescopes cluster stellar population metallicity and radial velocity distributions to identify merged dwarf galaxy remnants.",
		features: ["iron-to-hydrogen ratio [Fe/H]", "radial velocity (km/s)"],
		targetName: "stellar population cluster centroids",
		seed: 5166,
	},
	{
		id: "train-kmeans-167",
		title: "K-Means Centroid Training: Wind Farm Wake Interference Turbine Clusters",
		domain: "Wind Energy Modeling",
		type: "kmeans",
		storyContext: "Offshore wind farm operators cluster turbine locations into aerodynamic wake groups to schedule coordinated curtailment maneuvers.",
		features: ["turbine downwind position (m)", "turbine crosswind position (m)"],
		targetName: "wake cluster group centroids",
		seed: 5167,
	},
	{
		id: "train-kmeans-168",
		title: "K-Means Centroid Training: Medical Patient Phenotype Metabolic Profiles",
		domain: "Precision Medicine",
		type: "kmeans",
		storyContext: "Clinical trial researchers cluster type-2 diabetic patients into distinct metabolic phenotypes from fasting glucose and HbA1c biomarker distributions.",
		features: ["fasting blood glucose (mmol/L)", "glycated hemoglobin HbA1c (%)"],
		targetName: "metabolic phenotype centroids",
		seed: 5168,
	},
	{
		id: "train-kmeans-169",
		title: "K-Means Centroid Training: Power Grid Regional Load Demand Zones",
		domain: "Electric Utility Operations",
		type: "kmeans",
		storyContext: "Regional transmission organizations cluster electrical substation peak load vectors into balancing authority tariff pricing zones.",
		features: ["substation industrial load (MW)", "substation commercial load (MW)"],
		targetName: "pricing zone load centroids",
		seed: 5169,
	},
	{
		id: "train-kmeans-170",
		title: "K-Means Centroid Training: Warehouse Autonomous Mobile Robot Charging Pods",
		domain: "Robotics & Logistics",
		type: "kmeans",
		storyContext: "Automated fulfillment centers cluster package picking mission waypoints to locate induction charging pods for autonomous robot fleets.",
		features: ["mission aisle X (m)", "mission rack Y (m)"],
		targetName: "charging pod centroids",
		seed: 5170,
	},
	// 171-180: PCA Power Iteration
	{
		id: "train-pca-power-171",
		title: "PCA Power Iteration: Financial Portfolio Dominant Yield Factor",
		domain: "Quantitative Fixed Income",
		type: "pca",
		storyContext: "Fixed income asset managers train the first principal component (eigenvector) of the Treasury yield covariance matrix to extract the dominant level shift factor.",
		features: ["2Y yield change", "5Y yield change", "10Y yield change"],
		targetName: "dominant yield curve eigenvector",
		seed: 5171,
	},
	{
		id: "train-pca-power-172",
		title: "PCA Power Iteration: Satellite Multi-Spectral Band Compression",
		domain: "Earth Observation Satellites",
		type: "pca",
		storyContext: "Hyperspectral Earth imaging satellites compress optical reflectance bands down to the first principal component vector using power iteration.",
		features: ["blue band reflectance", "green band reflectance", "near-infrared reflectance"],
		targetName: "first principal component loadings",
		seed: 5172,
	},
	{
		id: "train-pca-power-173",
		title: "PCA Power Iteration: Aerospace Supersonic Wind Tunnel Pressure Modes",
		domain: "Aerodynamic Transients",
		type: "pca",
		storyContext: "Aeroelasticity researchers perform Proper Orthogonal Decomposition (POD) via power iteration to extract the dominant spatial pressure flutter mode.",
		features: ["leading edge static pressure", "mid-chord pressure", "trailing edge pressure"],
		targetName: "dominant aerodynamic mode vector",
		seed: 5173,
	},
	{
		id: "train-pca-power-174",
		title: "PCA Power Iteration: Human Facial Morphometry Eigenface Component",
		domain: "Computer Vision & Biometrics",
		type: "pca",
		storyContext: "Facial recognition systems extract the leading Eigenface projection vector from facial landmark coordinate matrices using iterative power method.",
		features: ["inter-pupillary distance", "nasal bridge height", "mandibular jaw width"],
		targetName: "primary facial eigenmode",
		seed: 5174,
	},
	{
		id: "train-pca-power-175",
		title: "PCA Power Iteration: Gas Turbine Multi-Sensor Harmonic Vibration",
		domain: "Turbomachinery Monitoring",
		type: "pca",
		storyContext: "Heavy industrial gas turbines compute the leading eigenvector of tri-axial accelerometer covariance matrices to isolate unbalance rotor whirl orbits.",
		features: ["axial vibration amplitude", "radial vibration amplitude", "tangential vibration amplitude"],
		targetName: "rotor unbalance principal axis",
		seed: 5175,
	},
	{
		id: "train-pca-power-176",
		title: "PCA Power Iteration: Genomics Population Genetics Ancestry Axis",
		domain: "Population Genomics",
		type: "pca",
		storyContext: "Biobank statistical geneticists train the leading principal component axis of allele frequency matrices to control for ancestral population stratification.",
		features: ["SNP allele frequency 1", "SNP allele frequency 2", "SNP allele frequency 3"],
		targetName: "principal ancestry component vector",
		seed: 5176,
	},
	{
		id: "train-pca-power-177",
		title: "PCA Power Iteration: Autonomous Vehicle LiDAR Cloud Ground Plane",
		domain: "Autonomous Driving Perception",
		type: "pca",
		storyContext: "Self-driving point cloud segmentation engines extract the primary road surface normal orientation by computing the principal eigenvector of point coordinates.",
		features: ["point X coordinate", "point Y coordinate", "point Z coordinate"],
		targetName: "ground plane normal eigenvector",
		seed: 5177,
	},
	{
		id: "train-pca-power-178",
		title: "PCA Power Iteration: Global Climate El Niño Southern Oscillation (ENSO)",
		domain: "Climatology & Oceanography",
		type: "pca",
		storyContext: "Climate scientists train the leading Empirical Orthogonal Function (EOF) from equatorial Pacific sea surface temperature anomaly grids to track ENSO index.",
		features: ["Niño 3.4 SST anomaly", "Niño 4 SST anomaly"],
		targetName: "leading climate mode eigenvector",
		seed: 5178,
	},
	{
		id: "train-pca-power-179",
		title: "PCA Power Iteration: Industrial Chemical Reactor Chromatographic Drift",
		domain: "Process Chemometrics",
		type: "pca",
		storyContext: "Industrial chemical synthesizers isolate the leading spectral drift axis from multi-wavelength UV-vis absorption detectors using power iteration.",
		features: ["wavelength 254nm OD", "wavelength 280nm OD", "wavelength 320nm OD"],
		targetName: "spectral drift direction vector",
		seed: 5179,
	},
	{
		id: "train-pca-power-180",
		title: "PCA Power Iteration: Nuclear Reactor Thermal Core Coolant Density Axis",
		domain: "Nuclear Thermal Hydraulics",
		type: "pca",
		storyContext: "Boiling water reactor safety systems extract the principal spatial void fraction oscillation mode across fuel assembly subchannels.",
		features: ["inlet void fraction", "mid-core void fraction", "exit void fraction"],
		targetName: "core void oscillation eigenvector",
		seed: 5180,
	},
];

export function buildLatentProblem(conf: LatentConfig): ModelTrainingProblemDefinition {
	const isKMeans = conf.type === "kmeans";

	const hyperConfig: HyperparameterConfig = isKMeans
		? {
				method: "K-Means Clustering: Iterative Centroid Training (Lloyd's Algorithm)",
				initialParams: "Centroids mu_1, ..., mu_K initialized to the first K samples: mu_k = X[k-1]",
				stepSizeDesc: "Read step_size directly from input line 1 (unused/dummy parameter in K-Means)",
				epsDesc: "Read eps directly from input line 1 (stop when total centroid movement sum_k ||mu_k^{(new)} - mu_k^{(old)}||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				extraParamsDesc: "K (number of clusters, e.g. K=2)",
				updateRule:
					"1. Assign: c_i = argmin_k ||x_i - mu_k||_2^2 (ties broken by smallest k). 2. Update: mu_k = (1/|C_k|) sum_{i in C_k} x_i (if empty, retain old centroid).",
				stoppingCriterion: "Stop when sum_{k=1}^K ||mu_k^{(new)} - mu_k^{(old)}||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for all K * D centroid coordinates: mu_{1,1} ... mu_{1,D} mu_{2,1} ... mu_{K,D}",
		  }
		: {
				method: "Principal Component Analysis (PCA): Power Iteration for Dominant Eigenvector",
				initialParams: "v_0 = [1, 1, ..., 1] / sqrt(D)",
				stepSizeDesc: "Read step_size directly from input line 1 (unused/dummy parameter in Power Iteration)",
				epsDesc: "Read eps directly from input line 1 (stop when ||v_{t+1} - v_t||_2 < eps)",
				maxIterDesc: "Read max_iter directly from input line 1 (hard iteration cap)",
				updateRule:
					"Sample covariance C = (1/N) * X^T * X; w = C * v_t; v_{t+1} = w / ||w||_2. Sign convention: if v_{t+1}[0] < 0, v_{t+1} := -v_{t+1}.",
				stoppingCriterion: "Stop when ||v_{t+1} - v_t||_2 < eps or max_iter iterations reached",
				outputPrecision: "Exactly 4 decimal places for eigenvector: v_1 v_2 ... v_D",
		  };

	const story = `<p>${conf.storyContext}</p>
${
	isKMeans
		? `<p>The engineering team trains <b>K-Means Centroids</b> <code>mu_1, mu_2, ..., mu_K</code> to partition the feature space into <code>K</code> clusters.</p>
<p><b>Algorithm Specification:</b>
<ul>
<li>Initialize the <code>K</code> cluster centroids using the first <code>K</code> samples of <code>X</code>:
  <code>mu_k = X[k - 1]</code> for <code>k = 1, 2, ..., K</code>.
</li>
<li>For each iteration <code>iter = 0, 1, ..., max_iter - 1</code>:
  <ul>
    <li><b>Assignment Step:</b> For each sample <code>i = 0, ..., N - 1</code>, assign it to the closest centroid:
      <code>c_i = argmin_{k in {1...K}} sum_{j=0}^{D-1} (X[i][j] - mu_k[j])^2</code>.
      If there is a tie in Euclidean distance, assign to the smallest centroid index <code>k</code>.
    </li>
    <li><b>Update Step:</b> For each cluster <code>k = 1, ..., K</code>, compute the new centroid as the arithmetic mean of its assigned points:
      <code>mu_k^{(new)} = (1 / |C_k|) * sum_{i in C_k} X[i]</code>.
      If cluster <code>k</code> has zero assigned points (empty cluster), retain its previous centroid: <code>mu_k^{(new)} = mu_k^{(old)}</code>.
    </li>
    <li><b>Convergence Check:</b> Compute the sum of Euclidean centroid shifts:
      <code>delta = sum_{k=1}^K sqrt(sum_{j=0}^{D-1} (mu_k^{(new)}[j] - mu_k^{(old)}[j])^2)</code>.
      If <code>delta < eps</code>, terminate training early.
    </li>
  </ul>
</li>
</ul></p>`
		: `<p>The data science team computes the <b>First Principal Component (Eigenvector)</b> <code>v in R^D</code> using the <b>Power Iteration</b> algorithm on the sample covariance matrix.</p>
<p><b>Algorithm Specification:</b>
<ul>
<li>Assume data matrix <code>X</code> (dimensions <code>N x D</code>). Compute the covariance matrix:
  <code>C = (1 / N) * X^T * X</code> (dimensions <code>D x D</code>).
</li>
<li>Initialize the eigenvector to unit normalized ones: <code>v_0 = [1 / sqrt(D), ..., 1 / sqrt(D)]</code>.</li>
<li>For each iteration <code>iter = 0, 1, ..., max_iter - 1</code>:
  <ul>
    <li>Compute matrix-vector product: <code>w = C * v_t</code></li>
    <li>Normalize: <code>v_{t+1} = w / ||w||_2</code>. (If <code>||w||_2 < 1e-12</code>, retain <code>v_t</code>).</li>
    <li>Enforce deterministic sign convention: if <code>v_{t+1}[0] < 0</code>, negate the entire vector <code>v_{t+1} := -v_{t+1}</code>.</li>
    <li>Convergence check: if <code>||v_{t+1} - v_t||_2 < eps</code>, terminate early.</li>
  </ul>
</li>
</ul></p>`
}`;

	const task = isKMeans
		? `Given N samples, D features, and hyperparameters step_size (dummy), eps, max_iter, and K on the first line, followed by the feature matrix X, train the K-Means centroids starting from the first K samples. Output all K * D centroid coordinates in order (mu_1,1 ... mu_1,D mu_2,1 ... mu_K,D) on a single line, formatted to exactly 4 decimal places.`
		: `Given N samples, D features, and hyperparameters step_size (dummy), eps, and max_iter on the first line, followed by the feature matrix X, train the first principal component eigenvector using power iteration. Output the D components (v_1 v_2 ... v_D) on a single line, formatted to exactly 4 decimal places.`;

	const inputFormat = isKMeans
		? `<p>The first line contains six values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, integer <code>max_iter</code>, and integer <code>K</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>`
		: `<p>The first line contains five values: integers <code>N</code> (samples), <code>D</code> (features), real numbers <code>step_size</code>, <code>eps</code>, and integer <code>max_iter</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing rows of the feature matrix <code>X</code>.</p>`;

	const outputFormat = isKMeans
		? `<p>Print a single line containing <code>K * D</code> space-separated real numbers representing centroid coordinates <code>mu_{1,1} ... mu_{1,D} mu_{2,1} ... mu_{K,D}</code>, each formatted to exactly 4 decimal places.</p>`
		: `<p>Print a single line containing <code>D</code> space-separated real numbers representing eigenvector coordinates <code>v_1 v_2 ... v_D</code>, each formatted to exactly 4 decimal places.</p>`;

	const constraints = formatConstraints([
		"2 <= N <= 50",
		"1 <= D <= 4",
		isKMeans ? "2 <= K <= min(N, 4)" : "1 <= D <= 4",
		"0.0001 <= step_size <= 1.0",
		"1e-6 <= eps <= 1e-2",
		"1 <= max_iter <= 500",
		"All values formatted to exactly 4 decimal places (0.0000)",
	]);

	const generateTestCases = () => {
		const rng = new DeterministicRNG(conf.seed);
		const tcs = [];

		const solveKMeans = (
			N: number,
			D: number,
			K: number,
			eps: number,
			maxIter: number,
			X: number[][]
		): number[] => {
			let centroids: number[][] = [];
			for (let k = 0; k < K; k++) {
				centroids.push([...X[k]]);
			}

			for (let iter = 0; iter < maxIter; iter++) {
				// Assign points to nearest centroid
				const clusters: number[][] = Array.from({ length: K }, () => []);
				for (let i = 0; i < N; i++) {
					let bestDist = Infinity;
					let bestK = 0;
					for (let k = 0; k < K; k++) {
						let distSq = 0;
						for (let d = 0; d < D; d++) {
							const diff = X[i][d] - centroids[k][d];
							distSq += diff * diff;
						}
						if (distSq < bestDist - 1e-12) {
							bestDist = distSq;
							bestK = k;
						}
					}
					clusters[bestK].push(i);
				}

				// Update centroids
				let totalShift = 0;
				const nextCentroids: number[][] = [];
				for (let k = 0; k < K; k++) {
					if (clusters[k].length === 0) {
						nextCentroids.push([...centroids[k]]);
					} else {
						const mean = new Array(D).fill(0);
						for (const idx of clusters[k]) {
							for (let d = 0; d < D; d++) mean[d] += X[idx][d];
						}
						for (let d = 0; d < D; d++) mean[d] /= clusters[k].length;
						nextCentroids.push(mean);
					}
					let shiftSq = 0;
					for (let d = 0; d < D; d++) {
						const diff = nextCentroids[k][d] - centroids[k][d];
						shiftSq += diff * diff;
					}
					totalShift += Math.sqrt(shiftSq);
				}

				centroids = nextCentroids;
				if (totalShift < eps) break;
			}

			const flat: number[] = [];
			for (const c of centroids) {
				for (const val of c) flat.push(val);
			}
			return flat;
		};

		const solvePCA = (
			N: number,
			D: number,
			eps: number,
			maxIter: number,
			X: number[][]
		): number[] => {
			// Covariance C = (1/N) * X^T * X
			const XT = transpose(X);
			const C: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
			for (let i = 0; i < D; i++) {
				for (let j = 0; j < D; j++) {
					let sum = 0;
					for (let n = 0; n < N; n++) sum += XT[i][n] * X[n][j];
					C[i][j] = sum / N;
				}
			}

			let v = new Array(D).fill(1 / Math.sqrt(D));
			for (let iter = 0; iter < maxIter; iter++) {
				const w = matVecMul(C, v);
				const wNorm = norm2(w);
				let nextV = wNorm < 1e-12 ? [...v] : w.map((val) => val / wNorm);
				if (nextV[0] < 0) nextV = nextV.map((val) => -val);

				const diff = norm2(nextV.map((nv, idx) => nv - v[idx]));
				v = nextV;
				if (diff < eps) break;
			}
			return v;
		};

		// Sample 1
		if (isKMeans) {
			const s1N = 4, s1D = 2, s1Step = 0.0, s1Eps = 0.001, s1MaxIter = 20, s1K = 2;
			const s1X = [
				[0.0, 0.0],
				[10.0, 10.0],
				[0.5, 0.5],
				[9.5, 9.5],
			];
			const s1Centroids = solveKMeans(s1N, s1D, s1K, s1Eps, s1MaxIter, s1X);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter} ${s1K}\n` +
				s1X.map((r) => r.join(" ")).join("\n");
			tcs.push(makeTc(1, s1In, s1Centroids.map(f4).join(" "), true, "Sample test: 2-Cluster 2D K-Means."));
		} else {
			const s1N = 4, s1D = 2, s1Step = 0.0, s1Eps = 0.001, s1MaxIter = 30;
			const s1X = [
				[1.0, 1.0],
				[2.0, 2.0],
				[3.0, 3.0],
				[4.0, 4.0],
			];
			const s1V = solvePCA(s1N, s1D, s1Eps, s1MaxIter, s1X);
			const s1In = `${s1N} ${s1D} ${s1Step} ${s1Eps} ${s1MaxIter}\n` +
				s1X.map((r) => r.join(" ")).join("\n");
			tcs.push(makeTc(1, s1In, s1V.map(f4).join(" "), true, "Sample test: PCA power iteration along diagonal line."));
		}

		// Sample 2
		if (isKMeans) {
			const s2N = 6, s2D = 2, s2Step = 0.0, s2Eps = 0.0001, s2MaxIter = 30, s2K = 2;
			const s2X = [
				[-2.0, -2.0],
				[2.0, 2.0],
				[-2.2, -1.8],
				[2.1, 1.9],
				[-1.9, -2.1],
				[1.8, 2.2],
			];
			const s2Centroids = solveKMeans(s2N, s2D, s2K, s2Eps, s2MaxIter, s2X);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter} ${s2K}\n` +
				s2X.map((r) => r.join(" ")).join("\n");
			tcs.push(makeTc(2, s2In, s2Centroids.map(f4).join(" "), true, "Sample test: 2D K-Means with 6 samples."));
		} else {
			const s2N = 5, s2D = 3, s2Step = 0.0, s2Eps = 0.0001, s2MaxIter = 50;
			const s2X = [
				[2.0, 1.0, 0.5],
				[4.0, 2.0, 1.0],
				[6.0, 3.0, 1.5],
				[8.0, 4.0, 2.0],
				[10.0, 5.0, 2.5],
			];
			const s2V = solvePCA(s2N, s2D, s2Eps, s2MaxIter, s2X);
			const s2In = `${s2N} ${s2D} ${s2Step} ${s2Eps} ${s2MaxIter}\n` +
				s2X.map((r) => r.join(" ")).join("\n");
			tcs.push(makeTc(2, s2In, s2V.map(f4).join(" "), true, "Sample test: 3D PCA power iteration."));
		}

		// 98 generated cases
		for (let i = 3; i <= 100; i++) {
			const N = rng.nextInt(6, 20);
			const D = rng.nextInt(2, 3);
			const stepSize = 0.05;
			const eps = parseFloat(rng.choice([1e-4, 1e-5, 5e-4]).toString());
			const maxIter = rng.nextInt(30, 80);

			const X: number[][] = [];
			for (let n = 0; n < N; n++) {
				X.push(rng.floatArray(D, -3.0, 3.0, 2));
			}

			if (isKMeans) {
				const K = 2; // Keep K=2 for stability and consistency
				const centroids = solveKMeans(N, D, K, eps, maxIter, X);
				const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter} ${K}\n` +
					X.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inText, centroids.map(f4).join(" ")));
			} else {
				const v = solvePCA(N, D, eps, maxIter, X);
				const inText = `${N} ${D} ${stepSize} ${eps} ${maxIter}\n` +
					X.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inText, v.map(f4).join(" ")));
			}
		}

		return tcs;
	};

	return {
		id: conf.id,
		title: conf.title,
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", isKMeans ? "k-means" : "pca", "unsupervised-learning", "clustering", "parameter-training"],
		description: `Train an unsupervised ${isKMeans ? "K-Means clustering" : "PCA eigenvector"} model using input hyperparameters and output learned parameters.`,
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

export const unsupervisedLatentModelsProblems: ModelTrainingProblemDefinition[] = latentConfigs.map(buildLatentProblem);
