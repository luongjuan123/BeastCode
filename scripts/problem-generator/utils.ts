import { GeneratedTestCase } from "./types";

/**
 * Seedable deterministic PRNG (Mulberry32).
 * Ensures reproducible test case generation across environments.
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

	nextBigInt(min: bigint, max: bigint): bigint {
		const range = max - min + 1n;
		const rand = BigInt(Math.floor(this.next() * 1000000000));
		return min + (rand % range);
	}

	choice<T>(arr: T[]): T {
		return arr[this.nextInt(0, arr.length - 1)];
	}

	choices<T>(arr: T[], count: number): T[] {
		const res: T[] = [];
		for (let i = 0; i < count; i++) {
			res.push(this.choice(arr));
		}
		return res;
	}

	shuffle<T>(arr: T[]): T[] {
		const copy = [...arr];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = this.nextInt(0, i);
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	nextString(length: number, charset = "abcdefghijklmnopqrstuvwxyz"): string {
		let res = "";
		for (let i = 0; i < length; i++) {
			res += this.choice(charset.split(""));
		}
		return res;
	}

	intArray(length: number, min: number, max: number): number[] {
		const arr: number[] = [];
		for (let i = 0; i < length; i++) {
			arr.push(this.nextInt(min, max));
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
<h3>Your Quest</h3>
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
