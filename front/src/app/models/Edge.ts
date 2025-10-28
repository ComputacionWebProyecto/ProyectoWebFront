// Tipo de extremo (nodo) soportado por un Edge
export type EndpointKind = 'activity' | 'gateway';

export interface Edge {
  id?: number;

  //extremos tipados (para Activity↔Gateway y Activity↔Activity)
  fromType?: EndpointKind;
  fromId?: number;
  toType?: EndpointKind;
  toId?: number;

  label?: string;

  processId?: number;

  // LEGADO: compat para Activity↔Activity (no eliminar)
  activitySourceId?: number;
  activityDestinyId?: number;

  status?: 'active' | 'inactive';
}
