import {Component, Input} from "@angular/core";

@Component({
	selector: "app-image",
	templateUrl: "./image.component.html",
	styleUrls: ["./image.component.scss"]
})
export class ImageComponent {
	@Input() width: string;
	@Input() height: string;
	@Input() src: string;
	loading = true;
	loadingSrc = "assets/images/loading.gif";
	emptySrc = "assets/images/empty.jpg";

	constructor() {}

	onLoad() {
		this.loading = false;
	}

	onError() {
		this.loading = false;
		this.src = this.emptySrc;
	}
}
