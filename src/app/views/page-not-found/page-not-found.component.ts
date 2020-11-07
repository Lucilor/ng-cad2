import {Component} from "@angular/core";
import {ActivatedRoute, Router, Params} from "@angular/router";

@Component({
    selector: "app-page-not-found",
    templateUrl: "./page-not-found.component.html",
    styleUrls: ["./page-not-found.component.scss"]
})
export class PageNotFoundComponent {
	data: {path: string; queryParams: Params};

	constructor(private route: ActivatedRoute, private router: Router) {
	    this.data = this.route.snapshot.data.redirect;
	}

	redirect() {
	    this.router.navigate([this.data.path], {queryParams: this.data.queryParams});
	}
}
