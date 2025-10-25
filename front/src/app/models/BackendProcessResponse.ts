import { Company } from "./Company";

export interface BackendProcessResponse {
    id: number;
    name: string;
    description: string;
    company: Company;
}