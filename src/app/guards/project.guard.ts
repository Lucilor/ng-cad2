import {Injectable} from "@angular/core";
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from "@angular/router";
import {MessageService} from "../modules/message/services/message.service";
import {AppStatusService} from "../services/app-status.service";

@Injectable({
    providedIn: "root"
})
export class ProjectGuard implements CanActivate {
    constructor(private router: Router, private message: MessageService, private status: AppStatusService) {}

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const project = route.queryParams.project;
        if (!project) {
            const url = route.children[0]?.url.toString() || "/";
            const projectInput = await this.message.prompt({promptData: {placeholder: "请输入项目"}, cancelable: false});
            return this.router.createUrlTree([url], {
                queryParams: {project: projectInput, ...route.queryParams},
                queryParamsHandling: "merge"
            });
        }
        return true;
    }
}
