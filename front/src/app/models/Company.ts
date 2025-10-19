export class Company{

    public id?: number;
    public NIT: number;
    public name: string;
    public correoContacto: string;

    constructor(NIT: number, name: string, correoContacto: string, id?: number){
        this.id = id;
        this.NIT = NIT;
        this.name = name;
        this.correoContacto = correoContacto;
    }
}