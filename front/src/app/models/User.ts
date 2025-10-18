export class User{

    public id?: number;
    public name: string;
    public correo: string;
    public contrasena: string;
    public companyId?: number;
    public roleId?: number;

    constructor(name: string, correo: string, contrasena: string, id?: number, companyId?: number, roleId?: number){
        this.name = name;
        this.correo = correo;
        this.contrasena = contrasena;
        this.id = id;
        this.companyId = companyId;
        this.roleId = roleId;
    }
}