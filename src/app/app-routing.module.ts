import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {ProjectGuard} from "@guards/project.guard";
import {PathResolveService} from "@services/path-resolve.service";
import {BackupComponent} from "@views/backup/backup.component";
import {ChangelogAdminComponent} from "@views/changelog-admin/changelog-admin.component";
import {ImportComponent} from "@views/import/import.component";
import {IndexComponent} from "@views/index/index.component";
import {KailiaokongweipeizhiComponent} from "@views/kailiaokongweipeizhi/kailiaokongweipeizhi.component";
import {PageNotFoundComponent} from "@views/page-not-found/page-not-found.component";
import {PrintA4A015PreviewComponent} from "@views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "@views/print/print-cad.component";
import {ReplaceTextComponent} from "@views/replace-text/replace-text.component";
import {SelectBancaiComponent} from "@views/select-bancai/select-bancai.component";
import {routesInfo} from "./app.common";

const routes: Routes = [
    {
        path: "",
        children: [
            {path: "", pathMatch: "full", redirectTo: routesInfo.index.path},
            {path: routesInfo.index.path, component: IndexComponent},
            {path: routesInfo.printCad.path, component: PrintCadComponent},
            {path: routesInfo.printA4A015Preview.path, component: PrintA4A015PreviewComponent},
            {path: routesInfo.import.path, component: ImportComponent},
            {path: routesInfo.backup.path, component: BackupComponent},
            {path: routesInfo.selectBancai.path, component: SelectBancaiComponent},
            {path: routesInfo.changelogAdmin.path, component: ChangelogAdminComponent},
            {path: routesInfo.kailiaokongweipeizhi.path, component: KailiaokongweipeizhiComponent},
            {path: routesInfo.replaceText.path, component: ReplaceTextComponent}
        ],
        canActivate: [ProjectGuard]
    },
    {path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
