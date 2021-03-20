import {Injectable} from "@angular/core";
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from "@angular/router";
import {CadDataService} from "../modules/http/services/cad-data.service";
import {MessageService} from "../modules/message/services/message.service";

@Injectable({
    providedIn: "root"
})
export class ProjectGuard implements CanActivate {
    constructor(private router: Router, private message: MessageService, private dataService: CadDataService) {}

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const url = route.children[0]?.url.toString();
        const project = route.queryParams.project;
        if (url && !project) {
            const projectInput = await this.message.prompt({placeholder: "请输入项目"}, "", "", false);
            this.dataService.project = projectInput as string;
            return this.router.createUrlTree([url], {
                queryParams: {project: projectInput, ...route.queryParams},
                queryParamsHandling: "merge"
            });
        }
        this.dataService.project = project;
        return true;
    }
}
