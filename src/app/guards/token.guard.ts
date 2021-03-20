import {Injectable} from "@angular/core";
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot} from "@angular/router";
import {session} from "../app.common";
import {CadDataService} from "../modules/http/services/cad-data.service";
import {MessageService} from "../modules/message/services/message.service";

@Injectable({
    providedIn: "root"
})
export class TokenGuard implements CanActivate {
    constructor(private message: MessageService, private dataService: CadDataService) {}

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        let token = session.load("token");
        if (!token) {
            token = await this.message.prompt({placeholder: "请输入口令", type: "password"}, "", "", false);
        }
        const response = await this.dataService.post("jichu/ngcad/verifyToken", {token});
        if (response?.code === 0) {
            session.save("token", token);
            return true;
        }
        return false;
    }
}
