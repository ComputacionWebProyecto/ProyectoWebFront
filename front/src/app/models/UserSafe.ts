export class UserSafe {

    public id?: number;
    public name: string;
    public correo: string;
    public companyId?: number;
    public roleId?: number;

    constructor(name: string, correo: string, companyId?: number, roleId?: number, id?: number) {
        this.name = name;
        this.correo = correo;
        this.id = id;
        this.companyId = companyId;
        this.roleId = roleId;
    }
}