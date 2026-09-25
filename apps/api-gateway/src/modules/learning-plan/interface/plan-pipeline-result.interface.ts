import { AiPlanItem } from './ai-plan-item.interface';
import { PlanContentSelection } from './plan-content-selection.interface';
import { PlanSelectedContentDetail } from './plan-content-candidate.interface';

export interface PlanPipelineResult {
	selection: PlanContentSelection;
	selectedContent: PlanSelectedContentDetail[];
	rawPlanItems: AiPlanItem[];
	validatedPlanItems: AiPlanItem[];
}
