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

export function formatProblemStatement(title: string, story: string, task: string): string {
	return `<h1>${title}</h1>

<div class="story-container mb-4">
${story}
</div>

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
 * Format float to fixed 4 decimals as standard in ML / Linear Regression problems
 */
export function f4(val: number): string {
	if (isNaN(val) || !isFinite(val)) return "0.0000";
	const sign = Math.abs(val) < 0.00005 ? 0 : val;
	return sign.toFixed(4);
}

export function f2(val: number): string {
	if (isNaN(val) || !isFinite(val)) return "0.00";
	const sign = Math.abs(val) < 0.005 ? 0 : val;
	return sign.toFixed(2);
}

// -------------------------------------------------------------
// Matrix & Vector Algebra Helpers for Linear Regression Reference Solvers
// -------------------------------------------------------------

export function dot(a: number[], b: number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

export function norm2(v: number[]): number {
	return Math.sqrt(dot(v, v));
}

export function matMul(A: number[][], B: number[][]): number[][] {
	const rowsA = A.length;
	const colsA = A[0].length;
	const colsB = B[0].length;
	const C: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
	for (let i = 0; i < rowsA; i++) {
		for (let j = 0; j < colsB; j++) {
			let s = 0;
			for (let k = 0; k < colsA; k++) s += A[i][k] * B[k][j];
			C[i][j] = s;
		}
	}
	return C;
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
	const T: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < cols; j++) T[j][i] = A[i][j];
	}
	return T;
}

/**
 * Invert a square matrix of size D (D <= 10) using Gauss-Jordan elimination with partial pivoting.
 */
export function invertMatrix(M: number[][]): number[][] {
	const n = M.length;
	const A = M.map((row) => [...row]);
	const inv = Array.from({ length: n }, (_, i) => {
		const row = new Array(n).fill(0);
		row[i] = 1;
		return row;
	});

	for (let col = 0; col < n; col++) {
		// Pivot
		let maxRow = col;
		for (let r = col + 1; r < n; r++) {
			if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
		}
		if (Math.abs(A[maxRow][col]) < 1e-12) {
			// Add tiny diagonal perturbation for numerical stability
			A[col][col] += 1e-9;
		} else {
			[A[col], A[maxRow]] = [A[maxRow], A[col]];
			[inv[col], inv[maxRow]] = [inv[maxRow], inv[col]];
		}

		const pivot = A[col][col];
		for (let j = 0; j < n; j++) {
			A[col][j] /= pivot;
			inv[col][j] /= pivot;
		}

		for (let r = 0; r < n; r++) {
			if (r === col) continue;
			const factor = A[r][col];
			for (let j = 0; j < n; j++) {
				A[r][j] -= factor * A[col][j];
				inv[r][j] -= factor * inv[col][j];
			}
		}
	}

	return inv;
}

/**
 * Solve Normal Equation (X^T X + lambda I) w = X^T y
 */
export function solveOLS(X: number[][], y: number[], lambda = 0): number[] {
	const XT = transpose(X);
	const XTX = matMul(XT, X);
	if (lambda > 0) {
		for (let i = 0; i < XTX.length; i++) XTX[i][i] += lambda;
	}
	const invXTX = invertMatrix(XTX);
	const XTy = matVecMul(XT, y);
	return matVecMul(invXTX, XTy);
}
