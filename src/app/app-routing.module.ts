import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {BackupComponent} from "./components/views/backup/backup.component";
import {ImportComponent} from "./components/views/import/import.component";
import {PrintA4A015PreviewComponent} from "./components/views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "./components/views/print/print-cad.component";
import {PathResolveService} from "./services/path-resolve.service";
import {IndexComponent} from "./views/index/index.component";
import {PageNotFoundComponent} from "./views/page-not-found/page-not-found.component";

const routes: Routes = [
    {path: "", pathMatch: "full", redirectTo: paths.index},
    {path: paths.index, component: IndexComponent},
    {path: paths["print-cad"], component: PrintCadComponent},
    // {path: paths.test, component: TestComponent},
    {path: paths.printA4A015Preview, component: PrintA4A015PreviewComponent},
    {path: paths.import, component: ImportComponent},
    {path: paths.backup, component: BackupComponent},
    {path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
