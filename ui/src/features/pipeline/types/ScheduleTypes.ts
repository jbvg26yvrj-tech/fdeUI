export interface ScheduleData {
  pipelineId: string;
  cronExpression: string;
  active: boolean;
}

export interface CreateScheduleRequest {
  pipelineId: string;
  cronExpression: string;
}

export interface UpdateScheduleRequest {
  cronExpression: string;
}
