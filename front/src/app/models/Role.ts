export class Role{

    public id?: number;
    public nombre: string;
    public descripcion: string;
    public companyId?: number;

    constructor(nombre: string, descripcion: string, companyId?: number, id?: number){
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.id = id;
        this.companyId = companyId;
    }


    
}