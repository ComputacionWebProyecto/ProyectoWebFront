import { Company } from "./Company";
import { User } from "./User";

export class Registration {
    company: Company;
    user: User;

    constructor(company: Company, user: User) {
        this.company = company;
        this.user = user;
    }
}