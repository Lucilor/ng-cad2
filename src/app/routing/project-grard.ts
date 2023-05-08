import {inject} from "@angular/core";
import {ActivatedRouteSnapshot, CanActivateFn, Router} from "@angular/router";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";

export const projectGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const project = route.queryParams.project;
  const message = inject(MessageService);
  const router = inject(Router);
  const status = inject(AppStatusService);
  if (!project) {
    const url = route.children[0]?.url.toString() || "/";
    const projectInput = await message.prompt({type: "string", label: "项目缩写"}, {disableCancel: true});
    return router.createUrlTree([url], {
      queryParams: {project: projectInput, ...route.queryParams},
      queryParamsHandling: "merge"
    });
  }
  return await status.setProject(route.queryParams);
};
