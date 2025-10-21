import { Company } from "./Company";

export interface BackendRoleResponse {
    id: number;
    nombre: string;
    descripcion: string;
    status: string;
    company: Company;
}