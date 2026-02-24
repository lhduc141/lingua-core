import { IrtParameters } from './irt-parameters.interface';

export interface CatQuestion {
	questionId: string;
	passageId: string | null;
	irt: IrtParameters;
	usageCount: number;

	// type: string;
	// difficulty: number;
	// estimatedTheta?: number;
}
