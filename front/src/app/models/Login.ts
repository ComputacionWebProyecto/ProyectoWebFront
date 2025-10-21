import { User } from "./User";
import { Company } from "./Company";
import { Role } from "./Role";

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
