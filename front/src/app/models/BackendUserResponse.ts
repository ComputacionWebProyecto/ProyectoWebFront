import { Company } from "./Company";
import { Role } from "./Role";

export interface BackendUserResponse {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  status: string;
  company: Company;
  role: Role;
}
