import { GeneratedTestCase } from "./types";

/**
 * Seedable deterministic PRNG (Mulberry32).
 */
export class DeterministicRNG {
	private s: number;

	constructor(seed: number) {
		this.s = seed >>> 0;
	}

	next(): number {
		let t = (this.s += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	nextFloat(min: number, max: number): number {
		return this.next() * (max - min) + min;
	}

	choice<T>(arr: T[]): T {
		return arr[this.nextInt(0, arr.length - 1)];
	}

	shuffle<T>(arr: T[]): T[] {
		const copy = [...arr];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = this.nextInt(0, i);
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	intArray(length: number, min: number, max: number): number[] {
		const arr: number[] = [];
		for (let i = 0; i < length; i++) {
			arr.push(this.nextInt(min, max));
		}
		return arr;
	}

	floatArray(length: number, min: number, max: number, decimals = 2): number[] {
		const arr: number[] = [];
		for (let i = 0; i < length; i++) {
			arr.push(parseFloat(this.nextFloat(min, max).toFixed(decimals)));
		}
		return arr;
	}
}

export function makeTc(
	id: number,
	inputText: string,
	outputText: string,
	isSample = false,
	explanation = ""
): GeneratedTestCase {
	return {
		id,
		inputText: inputText.trimEnd(),
		outputText: outputText.trimEnd(),
		isSample,
		isAdditional: false,
		strength: isSample ? 1 : 2,
		...(explanation ? { explanation } : {}),
	};
}

export interface HyperparameterConfig {
	method: string;
	initialParams?: string;
	stepSizeDesc: string;
	epsDesc: string;
	maxIterDesc: string;
	extraParamsDesc?: string;
	updateRule: string;
	stoppingCriterion: string;
	outputPrecision: string;
}

export function renderHyperparameterBox(config: HyperparameterConfig): string {
	const items: string[] = [
		`<li><strong>Training Method:</strong> ${config.method}</li>`,
		config.initialParams ? `<li><strong>Initial Parameters:</strong> <code>${config.initialParams}</code></li>` : "",
		`<li><strong>Step Size / Learning Rate (&alpha;):</strong> <code>${config.stepSizeDesc}</code></li>`,
		`<li><strong>Convergence Tolerance (&epsilon;):</strong> <code>${config.epsDesc}</code></li>`,
		`<li><strong>Maximum Iterations (max_iter):</strong> <code>${config.maxIterDesc}</code></li>`,
		config.extraParamsDesc ? `<li><strong>Additional Hyperparameters:</strong> <code>${config.extraParamsDesc}</code></li>` : "",
		`<li><strong>Parameter Update Rule:</strong> <code>${config.updateRule}</code></li>`,
		`<li><strong>Stopping Criterion:</strong> ${config.stoppingCriterion}</li>`,
		`<li><strong>Output Format & Precision:</strong> ${config.outputPrecision}</li>`,
	].filter(Boolean);

	return `<div class="hyperparameter-box" style="background-color: rgba(30, 41, 59, 0.75); border: 1px solid rgba(59, 130, 246, 0.4); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
  <h4 style="color: #60a5fa; margin: 0 0 10px 0; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
    <span>⚙️</span> Required Hyperparameters & Solver Configuration
  </h4>
  <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13.5px; line-height: 1.6;">
    ${items.join("\n    ")}
  </ul>
</div>`;
}

export function formatProblemStatement(
	title: string,
	story: string,
	task: string,
	config?: HyperparameterConfig
): string {
	const configBox = config ? `\n${renderHyperparameterBox(config)}\n` : "";
	return `<h1>${title}</h1>

<div class="story-container mb-4">
${story}
</div>
${configBox}
<div class="task-description mt-4">
<h3>Your Task</h3>
<p>${task}</p>
</div>`;
}

export function formatConstraints(constraints: string[]): string {
	const items = constraints.map((c) => `<li><code>${c}</code></li>`).join("\n");
	return `<h2>Constraints</h2>
<ul>
${items}
</ul>`;
}

/**
 * Format float to fixed 4 decimals (standard ML precision)
 */
export function f4(val: number): string {
	if (isNaN(val) || !isFinite(val)) return "0.0000";
	const sign = Math.abs(val) < 0.00005 ? 0 : val;
	return sign.toFixed(4);
}

// -------------------------------------------------------------
// Vector & Matrix Math Helpers
// -------------------------------------------------------------

export function dot(a: number[], b: number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

export function norm2(v: number[]): number {
	return Math.sqrt(dot(v, v));
}

export function matVecMul(A: number[][], x: number[]): number[] {
	const rows = A.length;
	const cols = x.length;
	const res: number[] = new Array(rows).fill(0);
	for (let i = 0; i < rows; i++) {
		let s = 0;
		for (let j = 0; j < cols; j++) s += A[i][j] * x[j];
		res[i] = s;
	}
	return res;
}

export function transpose(A: number[][]): number[][] {
	const rows = A.length;
	const cols = A[0].length;
	const res: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < cols; j++) {
			res[j][i] = A[i][j];
		}
	}
	return res;
}

export function sigmoid(z: number): number {
	if (z < -30) return 0;
	if (z > 30) return 1;
	return 1 / (1 + Math.exp(-z));
}

export function softThreshold(z: number, gamma: number): number {
	if (z > gamma) return z - gamma;
	if (z < -gamma) return z + gamma;
	return 0;
}

export function vecAdd(a: number[], b: number[]): number[] {
	return a.map((val, i) => val + b[i]);
}

export function vecSub(a: number[], b: number[]): number[] {
	return a.map((val, i) => val - b[i]);
}

export function vecScale(a: number[], s: number): number[] {
	return a.map((val) => val * s);
}

export function clipByNorm(v: number[], maxNorm: number): number[] {
	const n = norm2(v);
	if (n <= maxNorm || n < 1e-12) return [...v];
	return vecScale(v, maxNorm / n);
}
