import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {PathResolveService} from "./services/path-resolve.service";
import {IndexComponent} from "./components/index/index.component";
import {PrintCadComponent} from "./components/print-cad/print-cad.component";
import {TestComponent} from "./components/test/test.component";

const routes: Routes = [
	{path: "", pathMatch: "full", redirectTo: paths.index},
	{path: paths.index, component: IndexComponent},
	{path: paths["print-cad"], component: PrintCadComponent},
	{path: paths.test, component: TestComponent},
	{path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
