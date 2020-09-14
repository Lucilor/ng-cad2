import {Component, Input} from "@angular/core";
import {imgEmpty, imgLoading} from "@app/app.common";

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
	loadingSrc = imgLoading;
	emptySrc = imgEmpty;

	constructor() {}

	onLoad() {
		this.loading = false;
	}

	onError() {
		this.loading = false;
		this.src = this.emptySrc;
	}
}
