import { ProblemDefinition } from "./types";
import { arrayProblems } from "./categories/arrays";
import { stringProblems } from "./categories/strings";
import { mathProblems } from "./categories/math";
import { twoPointersProblems } from "./categories/twoPointers";
import { binarySearchProblems } from "./categories/binarySearch";
import { greedyProblems } from "./categories/greedy";
import { stackProblems } from "./categories/stacks";
import { bfsProblems } from "./categories/bfs";
import { graphProblems } from "./categories/graphs";
import { dpProblems } from "./categories/dp";
import { bitmaskProblems } from "./categories/bitmask";
import { sortingProblems } from "./categories/sorting";

export const allStoryProblems: ProblemDefinition[] = [
	...arrayProblems,
	...stringProblems,
	...mathProblems,
	...twoPointersProblems,
	...binarySearchProblems,
	...greedyProblems,
	...stackProblems,
	...bfsProblems,
	...graphProblems,
	...dpProblems,
	...bitmaskProblems,
	...sortingProblems,
];

export function validateProblemDefinitions(problems: ProblemDefinition[] = allStoryProblems) {
	if (problems.length !== 100) {
		throw new Error(`Expected exactly 100 problems, found ${problems.length}`);
	}

	const idSet = new Set<string>();
	for (const p of problems) {
		if (idSet.has(p.id)) {
			throw new Error(`Duplicate problem ID detected: ${p.id}`);
		}
		idSet.add(p.id);

		if (!p.title || !p.story || !p.task || !p.inputFormat || !p.outputFormat) {
			throw new Error(`Problem ${p.id} is missing required story/task/format metadata`);
		}
	}

	console.log(`[Validation] Successfully validated ${problems.length} unique story problem definitions.`);
}
