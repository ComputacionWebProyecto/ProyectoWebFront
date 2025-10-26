export interface Activity {
  id?: number;
  name?: string;
  description?: string;

  // Posición y tamaño en el board
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Relaciones opcionales
  processId?: number;
  roleId?: number;

  status?: 'active' | 'inactive';
}
