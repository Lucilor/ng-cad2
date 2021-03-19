import {Injectable} from "@angular/core";
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from "@angular/router";
import {MessageService} from "../modules/message/services/message.service";

@Injectable({
    providedIn: "root"
})
export class IndexGuard implements CanActivate {
    constructor(private router: Router, private message: MessageService) {}

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        let project = route.queryParams.project;
        if (!project) {
            project = await this.message.prompt({placeholder: "请输入项目"}, "", "", false);
            return false;
            return this.router.createUrlTree(["/index"], {queryParams: {project}, queryParamsHandling: "merge"});
        }
        return true;
    }
}
