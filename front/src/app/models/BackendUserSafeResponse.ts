import { Company } from "./Company";
import { Role } from "./Role";

export interface BackendUserSafeResponse {
  id: number;
  nombre: string;
  correo: string;
  status: string;
  company: Company;
  role: Role;
}