export class Process{
    public id?: number;
    public name: string;
    public description: string;
    public companyId?: number;

    constructor(name: string, description: string, id?: number, companyId?: number){
        this.name = name;
        this.description = description;
        this.id = id;
        this.companyId = companyId;
    }
}