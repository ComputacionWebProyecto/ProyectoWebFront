export interface Activity {
  id?: number;
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  processId?: number;
  roleId?: number;
  status?: 'active' | 'inactive';
}
