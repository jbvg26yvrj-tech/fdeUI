export interface ScheduleData {
  pipelineId: string;
  cronExpression: string;
  active?: boolean;
  enabled?: boolean;
  timezone?: string;
  timeZone?: string;
}

export interface CreateScheduleRequest {
  pipelineId: string;
  cronExpression: string;
}

export interface UpdateScheduleRequest {
  cronExpression: string;
}
