export interface Tool {
  id: string;
  name: string;
  type: string;
  iconName?: string;
  condition: string;
  boardId: string;
}

export interface CreateToolPayload {
  name: string;
  type: string;
  iconName?: string;
  condition: string;
  boardId: string;
}

export interface UpdateToolPayload {
  id: string;
  name: string;
  type: string;
  iconName?: string;
  condition: string;
  boardId: string;
}

