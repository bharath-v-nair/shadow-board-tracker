export interface Incident {
  id: string;
  toolId: string;
  boardId?: string;
  workerId: string;
  reporterId: string;
  toolName?: string;
  boardName?: string;
  reporterName?: string;
  workerName?: string;
  reportedAt: string | Date;
  resolvedAt?: string | Date;
  status: string;
  photoUrl?: string;
}

export interface CreateIncidentDto {
  toolId: string;
  workerId: string;
  status: string;
}
