import { User } from "./User";
import { Company } from "./Company";

/**
 * Representa las credenciales enviadas para el login
 */
export class LoginRequest {
  correo: string;
  contrasena: string;

  constructor(correo: string, contrasena: string) {
    this.correo = correo;
    this.contrasena = contrasena;
  }
}

/**
 * Representa la respuesta del backend después del login
 */
export class LoginResponse {
  message: string;
  company?: Company;
  user: User;

  constructor(message: string, user: User, company?: Company) {
    this.message = message;
    this.user = user;
    this.company = company;
  }
}
