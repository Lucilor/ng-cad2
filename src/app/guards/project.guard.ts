import {Injectable} from "@angular/core";
import {CanActivate, ActivatedRouteSnapshot, Router} from "@angular/router";
import {MessageService} from "../modules/message/services/message.service";

@Injectable({
    providedIn: "root"
})
export class ProjectGuard implements CanActivate {
    constructor(private router: Router, private message: MessageService) {}

    async canActivate(route: ActivatedRouteSnapshot) {
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
