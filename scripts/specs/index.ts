import { ProblemHyperparameterSpec, renderHyperparameterBox } from "../hyperparameter-renderer";
import { linearRegressionSpecs } from "./linear-regression-specs";
import { mlProblemSpecs } from "./ml-specs";
import { storyProblemSpecs } from "./story-specs";

export const all300ProblemSpecs: Record<string, { spec: ProblemHyperparameterSpec; isStory: boolean }> = {};

for (const [id, spec] of Object.entries(linearRegressionSpecs)) {
	all300ProblemSpecs[id] = { spec, isStory: false };
}

for (const [id, spec] of Object.entries(mlProblemSpecs)) {
	all300ProblemSpecs[id] = { spec, isStory: false };
}

for (const [id, spec] of Object.entries(storyProblemSpecs)) {
	all300ProblemSpecs[id] = { spec, isStory: true };
}

export function getEnrichedProblemFields(
	problemId: string,
	currentStatement: string,
	currentConstraints: string
): { enrichedStatement: string; enrichedConstraints: string } | null {
	const entry = all300ProblemSpecs[problemId];
	if (!entry) return null;

	const { spec, isStory } = entry;
	const boxHtml = renderHyperparameterBox(spec, isStory);

	// Check if already enriched with the box
	let enrichedStatement = currentStatement;
	if (!enrichedStatement.includes("hyperparameter-box") && !enrichedStatement.includes("⚙️ Required Hyperparameters") && !enrichedStatement.includes("📋 Algorithm Specifications")) {
		// Inject the box right after the story-container or at the beginning of task-description
		if (enrichedStatement.includes("</div>\n\n<div class=\"task-description")) {
			enrichedStatement = enrichedStatement.replace(
				"</div>\n\n<div class=\"task-description",
				`</div>\n\n${boxHtml}\n\n<div class="task-description`
			);
		} else if (enrichedStatement.includes("<div class=\"task-description")) {
			enrichedStatement = enrichedStatement.replace(
				"<div class=\"task-description",
				`${boxHtml}\n\n<div class="task-description`
			);
		} else {
			// Append at bottom of statement
			enrichedStatement = `${enrichedStatement}\n\n${boxHtml}`;
		}
	}

	// Update constraints if extra constraints exist and are not already in constraints
	let enrichedConstraints = currentConstraints;
	if (spec.extraConstraints && spec.extraConstraints.length > 0) {
		const missingConstraints = spec.extraConstraints.filter((c) => !enrichedConstraints.includes(c));
		if (missingConstraints.length > 0) {
			const constraintLis = missingConstraints.map((c) => `<li><code>${c}</code></li>`).join("\n");
			if (enrichedConstraints.includes("</ul>")) {
				enrichedConstraints = enrichedConstraints.replace("</ul>", `${constraintLis}\n</ul>`);
			} else {
				enrichedConstraints = `<h2>Constraints</h2>\n<ul>\n${constraintLis}\n</ul>`;
			}
		}
	}

	return { enrichedStatement, enrichedConstraints };
}
