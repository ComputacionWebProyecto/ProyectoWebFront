// models/Gateway.ts
export interface Gateway {
  id?: number;
  status?: string;
  type: string;
  x?: number;
  y?: number;
  processId?: number;
}