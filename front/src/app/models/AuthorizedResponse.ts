import { BackendUserSafeResponse } from "./BackendUserSafeResponse";

export interface AuthorizedResponse {
    user: BackendUserSafeResponse;
    token: string;
    prefix: string;
}