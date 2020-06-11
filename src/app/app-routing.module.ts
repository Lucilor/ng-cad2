import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {PathResolveService} from "./services/path-resolve.service";

const routes: Routes = [
	{path: "", pathMatch: "full", redirectTo: paths.index},
	{path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
