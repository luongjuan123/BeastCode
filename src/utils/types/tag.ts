export type ProblemTag = {
	id: string;
	name: string;
	description?: string;
	isHidden: boolean;
	isEnabled: boolean;
	order: number;
	createdAt: number;
	updatedAt: number;
	difficultyMetadata?: string;
	popularityCount?: number;
};

export type ThreadTag = {
	id: string;
	name: string;
	description?: string;
	isHidden: boolean;
	isEnabled: boolean;
	order: number;
	createdAt: number;
	updatedAt: number;
	color?: string;
	icon?: string;
	popularityCount?: number;
};
