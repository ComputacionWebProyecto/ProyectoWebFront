export class User{

    public id?: number;
    public nombre: string;
    public correo: string;
    public contrasena: string;
    public companyId?: number;
    public roleId?: number;

    constructor(nombre: string, correo: string, contrasena: string, companyId?: number, roleId?: number, id?: number){
        this.nombre = nombre;
        this.correo = correo;
        this.contrasena = contrasena;
        this.id = id;
        this.companyId = companyId;
        this.roleId = roleId;
    }
}