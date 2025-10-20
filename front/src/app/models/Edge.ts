export interface Edge {
  id?: number;
  
  fromId?: number;
  toId?: number;
  label?: string;

  
  processId?: number;
  activitySourceId?: number;
  activityDestinyId?: number;

  status?: 'active' | 'inactive';
}
