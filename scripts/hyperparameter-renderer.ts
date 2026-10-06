export interface ProblemHyperparameterSpec {
	solverMethod: string;
	initialParams?: string;
	learningRate?: string;
	iterations?: string;
	tolerance?: string;
	regularization?: string;
	formula?: string;
	conventions?: string;
	outputPrecision: string;
	extraConstraints?: string[];
}

export function renderHyperparameterBox(spec: ProblemHyperparameterSpec, isStoryProblem = false): string {
	const icon = isStoryProblem ? "📋" : "⚙️";
	const headerTitle = isStoryProblem
		? "Algorithm Specifications & Parameter Rules"
		: "Required Hyperparameters & Solver Configuration";

	const items: string[] = [];
	if (spec.solverMethod) {
		items.push(`<li><strong>Method / Paradigm:</strong> ${spec.solverMethod}</li>`);
	}
	if (spec.initialParams) {
		items.push(`<li><strong>Initial Parameters:</strong> <code>${spec.initialParams}</code></li>`);
	}
	if (spec.learningRate) {
		items.push(`<li><strong>Learning Rate / Step Size (&alpha;):</strong> <code>${spec.learningRate}</code></li>`);
	}
	if (spec.iterations) {
		items.push(`<li><strong>Iterations / Epochs:</strong> <code>${spec.iterations}</code></li>`);
	}
	if (spec.tolerance) {
		items.push(`<li><strong>Convergence Tolerance (&epsilon;):</strong> <code>${spec.tolerance}</code></li>`);
	}
	if (spec.regularization) {
		items.push(`<li><strong>Regularization / Penalty:</strong> <code>${spec.regularization}</code></li>`);
	}
	if (spec.formula) {
		items.push(`<li><strong>Mathematical Formulation:</strong> <code>${spec.formula}</code></li>`);
	}
	if (spec.conventions) {
		items.push(`<li><strong>Conventions & Tie-Breaking:</strong> ${spec.conventions}</li>`);
	}
	if (spec.outputPrecision) {
		items.push(`<li><strong>Output Precision:</strong> ${spec.outputPrecision}</li>`);
	}

	return `<div class="hyperparameter-box" style="background-color: rgba(30, 41, 59, 0.75); border: 1px solid rgba(59, 130, 246, 0.4); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
  <h4 style="color: #60a5fa; margin: 0 0 10px 0; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
    <span>${icon}</span> ${headerTitle}
  </h4>
  <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13.5px; line-height: 1.6;">
    ${items.join("\n    ")}
  </ul>
</div>`;
}
