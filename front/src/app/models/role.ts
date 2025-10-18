export class Role{

    public id?: number;
    public nombre: string;
    public descripcion: string;
    public companyId?: number;
    public processId?: number;

    constructor(nombre: string, descripcion: string, status: string, id?: number, companyId?: number, processId?: number){
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.id = id;
        this.companyId;
        this.processId = processId;
    }


}