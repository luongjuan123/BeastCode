import { ModelTrainingProblemDefinition } from "./types";
import { linearRegressionGDProblems } from "./categories/linearRegressionGD";
import { regularizedRegressionProblems } from "./categories/regularizedRegression";
import { logisticRegressionProblems } from "./categories/logisticRegression";
import { advancedOptimizersProblems } from "./categories/advancedOptimizers";
import { robustAndQuantileProblems } from "./categories/robustAndQuantile";
import { stochasticAndMinibatchProblems } from "./categories/stochasticAndMinibatch";
import { svmAndLinearClassifiersProblems } from "./categories/svmAndLinearClassifiers";
import { generalizedLinearModelsProblems } from "./categories/generalizedLinearModels";
import { unsupervisedLatentModelsProblems } from "./categories/unsupervisedLatentModels";
import { neuralAndEnsemblesProblems } from "./categories/neuralAndEnsembles";

export const all200ModelTrainingProblems: ModelTrainingProblemDefinition[] = [
	...linearRegressionGDProblems,
	...regularizedRegressionProblems,
	...logisticRegressionProblems,
	...advancedOptimizersProblems,
	...robustAndQuantileProblems,
	...stochasticAndMinibatchProblems,
	...svmAndLinearClassifiersProblems,
	...generalizedLinearModelsProblems,
	...unsupervisedLatentModelsProblems,
	...neuralAndEnsemblesProblems,
];

export * from "./types";
export * from "./utils";
