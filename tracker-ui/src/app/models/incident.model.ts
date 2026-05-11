export interface Incident {
  id: string;
  toolId: string;
  workerId: string;
  reportedAt: string | Date;
  resolvedAt?: string | Date;
  status: string;
}

export interface CreateIncidentDto {
  toolId: string;
  workerId: string;
  status: string;
}
