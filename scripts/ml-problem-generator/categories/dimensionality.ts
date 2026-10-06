import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const dimensionalityProblems: MLProblemDefinition[] = [
	// 41. Spectral Telescope PCA Projection
	{
		id: "spectral-telescope-pca-projection",
		title: "Spectral Telescope PCA Projection",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "pca", "dimensionality-reduction", "linear-algebra"],
		description: "Center data points and project onto the first principal component eigenvector.",
		story: `<p>Astronomers at the Mauna Kea Observatory project high-dimensional galaxy spectra onto their primary principal component. Given <code>N</code> data points of dimension <code>D</code> and the unit-norm principal eigenvector <code>v</code>, the PCA projection of point <code>x</code> is: <code>z = dot(x - mu, v)</code>, where <code>mu</code> is the empirical mean vector.</p>`,
		task: "Compute the empirical mean vector mu, center each point (x - mu), and project onto eigenvector v. Output the 1D projected scalar for each of the N points.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers (data points).</p>
<p>The last line contains <code>D</code> real numbers representing unit eigenvector <code>v</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines: each containing the projected 1D scalar with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= D <= 5",
			"||v|| ≈ 1.0"
		]),
		points: 140,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(501);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n0 0\n2 2\n0.7071 0.7071", "-1.4142\n1.4142", true, "Mean is (1, 1). Centered: (-1, -1) and (1, 1). Projections: -0.7071-0.7071 = -1.4142, and +1.4142."));
			tcs.push(makeTc(2, "1 1\n5\n1", "0.0000", true, "Single point centers to 0, projection is 0."));

			const projectPCA = (N: number, D: number, pts: number[][], v: number[]): number[] => {
				const mu = new Array(D).fill(0);
				for (const p of pts) {
					for (let d = 0; d < D; d++) mu[d] += p[d];
				}
				for (let d = 0; d < D; d++) mu[d] /= N;

				const res: number[] = [];
				for (const p of pts) {
					let dot = 0;
					for (let d = 0; d < D; d++) dot += (p[d] - mu[d]) * v[d];
					res.push(dot);
				}
				return res;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(3, 15);
				const D = rng.nextInt(2, 3);
				const pts = Array.from({ length: N }, () => rng.floatArray(D, -10, 10, 2));
				// Random unit vector
				const rawV = rng.floatArray(D, 0.5, 2, 2);
				const norm = Math.sqrt(rawV.reduce((sum, val) => sum + val * val, 0));
				const v = rawV.map((x) => x / norm);

				const proj = projectPCA(N, D, pts, v);
				let inStr = `${N} ${D}\n`;
				inStr += pts.map((p) => p.join(" ")).join("\n") + "\n";
				inStr += v.map(f4).join(" ");
				tcs.push(makeTc(i, inStr, proj.map(f4).join("\n")));
			}

			return tcs;
		},
	},

	// 42. Genomic Variance Explained Ratio
	{
		id: "genomic-variance-explained-ratio",
		title: "Genomic Variance Explained Ratio",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "pca", "eigenvalues", "variance"],
		description: "Compute the individual and cumulative explained variance ratio for PCA eigenvalues.",
		story: `<p>Bioinformaticians analyzing microarray gene expression use PCA to compress 20,000 gene dimensions into a handful of principal axes. Given eigenvalues <code>lambda_1 >= lambda_2 >= ... >= lambda_D >= 0</code>, the explained variance ratio for component <code>i</code> is <code>lambda_i / sum(lambda)</code>.</p>`,
		task: "Given D eigenvalues sorted descending, compute the individual explained variance ratio and cumulative variance ratio for each component.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> space-separated non-negative real numbers: <code>lambda_1 ... lambda_D</code>.</p>`,
		outputFormat: `<p>Print <code>D</code> lines: <code>ratio cumulative_ratio</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 20",
			"Sum of eigenvalues > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(502);
			const tcs = [];

			tcs.push(makeTc(1, "2\n3 1", "0.7500 0.7500\n0.2500 1.0000", true, "Total=4. Ratio 1: 3/4=0.75. Ratio 2: 1/4=0.25, cum=1.0000."));
			tcs.push(makeTc(2, "3\n5 3 2", "0.5000 0.5000\n0.3000 0.8000\n0.2000 1.0000", true, "Total=10. Cumulative: 0.5, 0.8, 1.0."));

			const evalVariance = (lambdas: number[]): string[] => {
				const sum = lambdas.reduce((a, b) => a + b, 0);
				let cum = 0;
				const res: string[] = [];
				for (const l of lambdas) {
					const r = l / sum;
					cum += r;
					res.push(`${f4(r)} ${f4(cum)}`);
				}
				return res;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 6);
				const raw = rng.intArray(D, 1, 100).sort((a, b) => b - a);
				const lines = evalVariance(raw);
				tcs.push(makeTc(i, `${D}\n${raw.join(" ")}`, lines.join("\n")));
			}

			return tcs;
		},
	},

	// 43. Deep Vault SVD Low-Rank Reconstruction
	{
		id: "deep-vault-svd-low-rank-reconstruction",
		title: "Deep Vault SVD Low-Rank Reconstruction",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "svd", "matrix-factorization", "linear-algebra"],
		description: "Compute the optimal rank-1 matrix approximation A_1 = sigma_1 * u_1 * v_1^T from top singular triplets.",
		story: `<p>A secure archival system compresses surveillance video frames using <b>Singular Value Decomposition (SVD)</b>. Under the Eckart-Young theorem, the best rank-1 approximation of matrix <code>A</code> is given by the outer product of the first singular triplet: <code>A_1 = sigma_1 * (u_1 * v_1^T)</code>.</p>`,
		task: "Given M, N, singular value sigma1, left singular vector u1 (M values), and right singular vector v1 (N values), compute matrix A_1 = sigma1 * u1 * v1^T.",
		inputFormat: `<p>The first line contains integers <code>M</code> and <code>N</code>, and real number <code>sigma1</code>.</p>
<p>The second line contains <code>M</code> real numbers: <code>u1</code>.</p>
<p>The third line contains <code>N</code> real numbers: <code>v1</code>.</p>`,
		outputFormat: `<p>Print <code>M</code> lines, each containing <code>N</code> space-separated real numbers with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= M, N <= 10",
			"sigma1 >= 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(503);
			const tcs = [];

			tcs.push(makeTc(1, "2 2 10.0\n0.6 0.8\n0.8 0.6", "4.8000 3.6000\n6.4000 4.8000", true, "10 * [[0.6*0.8, 0.6*0.6], [0.8*0.8, 0.8*0.6]] = [[4.8, 3.6], [6.4, 4.8]]."));
			tcs.push(makeTc(2, "1 1 5.0\n1.0\n1.0", "5.0000", true, "1x1 outer product."));

			const solveRank1 = (M: number, N: number, s: number, u: number[], v: number[]): string[] => {
				const rows: string[] = [];
				for (let i = 0; i < M; i++) {
					const row: string[] = [];
					for (let j = 0; j < N; j++) {
						row.push(f4(s * u[i] * v[j]));
					}
					rows.push(row.join(" "));
				}
				return rows;
			};

			for (let i = 3; i <= 100; i++) {
				const M = rng.nextInt(2, 4);
				const N = rng.nextInt(2, 4);
				const s = parseFloat(rng.nextFloat(1, 20).toFixed(1));
				const u = rng.floatArray(M, -1, 1, 2);
				const v = rng.floatArray(N, -1, 1, 2);
				const mat = solveRank1(M, N, s, u, v);
				const inStr = `${M} ${N} ${s}\n${u.join(" ")}\n${v.join(" ")}`;
				tcs.push(makeTc(i, inStr, mat.join("\n")));
			}

			return tcs;
		},
	},

	// 44. Tactical Radar Gram-Schmidt Orthogonalization
	{
		id: "tactical-radar-gram-schmidt-orthogonalization",
		title: "Tactical Radar Gram-Schmidt Orthogonalization",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "linear-algebra", "orthogonalization"],
		description: "Transform two linearly independent vectors v1 and v2 into an orthonormal basis u1, u2.",
		story: `<p>Phased array radar receivers decompose coupled target reflection signals into orthogonal beamforming channels using the <b>Gram-Schmidt Process</b>:
1. <code>u_1 = v_1 / ||v_1||</code>
2. <code>proj = (dot(v_2, u_1)) * u_1</code>
3. <code>w_2 = v_2 - proj</code>
4. <code>u_2 = w_2 / ||w_2||</code>.</p>`,
		task: "Given two linearly independent D-dimensional vectors v1 and v2, output orthonormal vectors u1 and u2.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> real numbers representing vector <code>v1</code>.</p>
<p>The third line contains <code>D</code> real numbers representing vector <code>v2</code>.</p>`,
		outputFormat: `<p>Print two lines.</p>
<p>Line 1: <code>u1</code> coordinates (4 decimal places).</p>
<p>Line 2: <code>u2</code> coordinates (4 decimal places).</p>`,
		constraints: formatConstraints([
			"2 <= D <= 5",
			"v1 and v2 are linearly independent"
		]),
		points: 130,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(504);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1 0\n1 1", "1.0000 0.0000\n0.0000 1.0000", true, "v1=[1,0], v2=[1,1]. u1=[1,0]. w2=[1,1]-[1,0]=[0,1], u2=[0,1]."));
			tcs.push(makeTc(2, "2\n0 2\n3 0", "0.0000 1.0000\n1.0000 0.0000", true, "Already orthogonal, normalized to unit length."));

			const gramSchmidt2 = (D: number, v1: number[], v2: number[]) => {
				let norm1Sq = 0;
				for (const val of v1) norm1Sq += val * val;
				const norm1 = Math.sqrt(norm1Sq);
				const u1 = v1.map((x) => x / norm1);

				let dot = 0;
				for (let d = 0; d < D; d++) dot += v2[d] * u1[d];

				const w2 = v2.map((x, idx) => x - dot * u1[idx]);
				let norm2Sq = 0;
				for (const val of w2) norm2Sq += val * val;
				const norm2 = Math.sqrt(norm2Sq);
				const u2 = w2.map((x) => x / norm2);

				return { u1, u2 };
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const v1 = rng.intArray(D, 1, 5);
				let v2 = rng.intArray(D, 1, 5);
				// ensure independent
				v2[0] += 5;
				const { u1, u2 } = gramSchmidt2(D, v1, v2);
				let inStr = `${D}\n${v1.join(" ")}\n${v2.join(" ")}`;
				tcs.push(makeTc(i, inStr, `${u1.map(f4).join(" ")}\n${u2.map(f4).join(" ")}`));
			}

			return tcs;
		},
	},

	// 45. Macro-Economy Correlation to Covariance Matrix
	{
		id: "macro-economy-correlation-to-covariance",
		title: "Macro-Economy Correlation to Covariance Matrix",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "covariance", "correlation", "statistics"],
		description: "Convert a Pearson Correlation matrix R and standard deviation vector sigma into a Covariance matrix Sigma.",
		story: `<p>Econometric models analyze market volatility across <code>D</code> macroeconomic indicators. Risk models receive the normalized Pearson Correlation matrix <code>R</code> (with 1.0 on diagonal) and a vector of standard deviations <code>sigma</code>. The full Covariance matrix is reconstructed using: <code>Cov_{ij} = R_{ij} * sigma_i * sigma_j</code>.</p>`,
		task: "Given dimension D, correlation matrix R, and standard deviations sigma, compute the Covariance matrix.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The next <code>D</code> lines each contain <code>D</code> real numbers representing correlation matrix <code>R</code>.</p>
<p>The last line contains <code>D</code> positive real numbers representing <code>sigma</code>.</p>`,
		outputFormat: `<p>Print <code>D</code> lines representing the Covariance matrix with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 5",
			"sigma[i] > 0",
			"R[i][i] = 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(505);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1.0 0.5\n0.5 1.0\n2.0 4.0", "4.0000 4.0000\n4.0000 16.0000", true, "Cov(1,1)=1*2*2=4, Cov(1,2)=0.5*2*4=4, Cov(2,2)=1*4*4=16."));
			tcs.push(makeTc(2, "1\n1.0\n3.0", "9.0000", true, "Variance = 3^2 = 9.0000."));

			const solveCov = (D: number, R: number[][], sig: number[]): string[] => {
				const rows: string[] = [];
				for (let i = 0; i < D; i++) {
					const row: string[] = [];
					for (let j = 0; j < D; j++) {
						row.push(f4(R[i][j] * sig[i] * sig[j]));
					}
					rows.push(row.join(" "));
				}
				return rows;
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 3);
				const sig = rng.floatArray(D, 1.0, 5.0, 1);
				const R: number[][] = Array.from({ length: D }, () => new Array(D).fill(1));
				for (let r = 0; r < D; r++) {
					for (let c = r + 1; c < D; c++) {
						const corr = parseFloat(rng.nextFloat(-0.8, 0.8).toFixed(2));
						R[r][c] = corr;
						R[c][r] = corr;
					}
				}
				const cov = solveCov(D, R, sig);
				let inStr = `${D}\n` + R.map((r) => r.join(" ")).join("\n") + "\n" + sig.join(" ");
				tcs.push(makeTc(i, inStr, cov.join("\n")));
			}

			return tcs;
		},
	},

	// 46. Hyperspectral Satellite LDA Between-Class Scatter
	{
		id: "hyperspectral-satellite-lda-scatter",
		title: "Hyperspectral Satellite LDA Between-Class Scatter",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "lda", "linear-discriminant-analysis", "scatter-matrix"],
		description: "Compute the Between-Class Scatter matrix S_B = sum N_c * (mu_c - mu)(mu_c - mu)^T in Linear Discriminant Analysis.",
		story: `<p>Satellite land-cover classification uses Fisher's Linear Discriminant Analysis (LDA) to separate vegetation, urban, and water pixels. Maximizing class separation requires computing the <b>Between-Class Scatter Matrix</b>: <code>S_B = sum_{c} N_c * (mu_c - mu) * (mu_c - mu)^T</code>, where <code>mu_c</code> is the mean vector of class <code>c</code>, and <code>mu</code> is the overall dataset mean.</p>`,
		task: "Given class sample counts N_c and class centroid vectors mu_c, compute the D x D matrix S_B.",
		inputFormat: `<p>The first line contains integers <code>C</code> (classes) and <code>D</code> (dimension).</p>
<p>The next <code>C</code> lines each contain integer <code>N_c</code> followed by <code>D</code> real numbers representing class mean <code>mu_c</code>.</p>`,
		outputFormat: `<p>Print <code>D</code> lines representing matrix <code>S_B</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= C <= 5",
			"1 <= D <= 4",
			"N_c >= 1"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(506);
			const tcs = [];

			tcs.push(makeTc(1, "2 1\n10 0\n10 2", "20.0000", true, "mu = (10*0 + 10*2)/20 = 1.0. S_B = 10*(0-1)^2 + 10*(2-1)^2 = 20.0000."));
			tcs.push(makeTc(2, "2 2\n5 0 0\n5 2 0", "10.0000 0.0000\n0.0000 0.0000", true, "Scatter purely along first dimension."));

			const solveSB = (C: number, D: number, classes: { n: number; mu: number[] }[]): string[] => {
				let totalN = 0;
				const grandMu = new Array(D).fill(0);
				for (const item of classes) {
					totalN += item.n;
					for (let d = 0; d < D; d++) grandMu[d] += item.n * item.mu[d];
				}
				for (let d = 0; d < D; d++) grandMu[d] /= totalN;

				const SB: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
				for (const item of classes) {
					const diff = item.mu.map((m, idx) => m - grandMu[idx]);
					for (let r = 0; r < D; r++) {
						for (let c = 0; c < D; c++) {
							SB[r][c] += item.n * diff[r] * diff[c];
						}
					}
				}
				return SB.map((row) => row.map(f4).join(" "));
			};

			for (let i = 3; i <= 100; i++) {
				const C = rng.nextInt(2, 3);
				const D = rng.nextInt(2, 3);
				const classes = Array.from({ length: C }, () => ({
					n: rng.nextInt(5, 20),
					mu: rng.floatArray(D, -5, 5, 1),
				}));
				const res = solveSB(C, D, classes);
				let inStr = `${C} ${D}\n`;
				inStr += classes.map((c) => `${c.n} ${c.mu.join(" ")}`).join("\n");
				tcs.push(makeTc(i, inStr, res.join("\n")));
			}

			return tcs;
		},
	},

	// 47. Drone Swarm Mahalanobis Distance
	{
		id: "drone-swarm-mahalanobis-distance",
		title: "Drone Swarm Mahalanobis Distance",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "mahalanobis-distance", "metrics", "statistics"],
		description: "Compute the Mahalanobis distance D_M = sqrt(sum (x_d - y_d)^2 / var_d) with diagonal variance.",
		story: `<p>Autonomous search-and-rescue drone swarms measure coordinate distances accounting for sensor anisotropy (e.g. altitude GPS error variance is much greater than horizontal variance). Under uncorrelated diagonal variance <code>var_1, ..., var_D</code>, the Mahalanobis distance between two positions is: <code>D_M = sqrt(sum (x_d - y_d)^2 / var_d)</code>.</p>`,
		task: "Given dimension D, diagonal variances var, and two vectors x and y, compute the Mahalanobis distance.",
		inputFormat: `<p>The first line contains integer <code>D</code>.</p>
<p>The second line contains <code>D</code> positive real numbers representing feature variances <code>var</code>.</p>
<p>The third line contains <code>D</code> coordinates of point <code>x</code>.</p>
<p>The fourth line contains <code>D</code> coordinates of point <code>y</code>.</p>`,
		outputFormat: `<p>Print the Mahalanobis distance with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= D <= 10",
			"var[d] > 0"
		]),
		points: 110,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(507);
			const tcs = [];

			tcs.push(makeTc(1, "2\n1.0 4.0\n0.0 0.0\n1.0 2.0", "1.4142", true, "sq = (1-0)^2/1 + (2-0)^2/4 = 1 + 1 = 2 -> sqrt(2) = 1.4142."));
			tcs.push(makeTc(2, "1\n9.0\n0.0\n6.0", "2.0000", true, "sqrt((6-0)^2 / 9) = 6/3 = 2.0000."));

			const computeMahalanobis = (D: number, vars: number[], x: number[], y: number[]): number => {
				let sq = 0;
				for (let d = 0; d < D; d++) {
					sq += ((x[d] - y[d]) ** 2) / vars[d];
				}
				return Math.sqrt(sq);
			};

			for (let i = 3; i <= 100; i++) {
				const D = rng.nextInt(2, 5);
				const vars = rng.floatArray(D, 0.5, 10.0, 2);
				const x = rng.floatArray(D, -20, 20, 2);
				const y = rng.floatArray(D, -20, 20, 2);
				const dist = computeMahalanobis(D, vars, x, y);
				const inStr = `${D}\n${vars.join(" ")}\n${x.join(" ")}\n${y.join(" ")}`;
				tcs.push(makeTc(i, inStr, f4(dist)));
			}

			return tcs;
		},
	},

	// 48. Holographic Memory Cosine Similarity Matrix
	{
		id: "holographic-memory-cosine-similarity-matrix",
		title: "Holographic Memory Cosine Similarity Matrix",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "cosine-similarity", "linear-algebra", "metrics"],
		description: "Compute the pairwise N x N Cosine Similarity matrix between N feature vectors.",
		story: `<p>A neural associative memory system matches query embedding vectors against storage patterns using <b>Cosine Similarity</b>: <code>cos(u, v) = dot(u, v) / (||u||_2 * ||v||_2)</code>.</p>`,
		task: "Given N vectors of dimension D, compute the symmetric N x N pairwise cosine similarity matrix.",
		inputFormat: `<p>The first line contains integers <code>N</code> and <code>D</code>.</p>
<p>The next <code>N</code> lines each contain <code>D</code> real numbers representing vector <code>0</code> to <code>N-1</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines representing the N x N similarity matrix with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 20",
			"1 <= D <= 10",
			"Vector norm > 0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(508);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n0 1", "1.0000 0.0000\n0.0000 1.0000", true, "Orthogonal axes have 0 cosine similarity."));
			tcs.push(makeTc(2, "2 2\n1 1\n2 2", "1.0000 1.0000\n1.0000 1.0000", true, "Parallel vectors have cosine similarity = 1.0000."));

			const solveCosMat = (N: number, D: number, vecs: number[][]): string[] => {
				const norms = vecs.map((v) => Math.sqrt(v.reduce((sum, val) => sum + val * val, 0)));
				const rows: string[] = [];
				for (let i = 0; i < N; i++) {
					const row: string[] = [];
					for (let j = 0; j < N; j++) {
						let dot = 0;
						for (let d = 0; d < D; d++) dot += vecs[i][d] * vecs[j][d];
						const cos = dot / (norms[i] * norms[j]);
						row.push(f4(cos));
					}
					rows.push(row.join(" "));
				}
				return rows;
			};

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(2, 6);
				const D = rng.nextInt(2, 4);
				const vecs = Array.from({ length: N }, () => rng.floatArray(D, -5, 5, 1));
				// Ensure non-zero norms
				for (const v of vecs) if (v.every((x) => x === 0)) v[0] = 1;
				const mat = solveCosMat(N, D, vecs);
				let inStr = `${N} ${D}\n` + vecs.map((v) => v.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, mat.join("\n")));
			}

			return tcs;
		},
	},
];
