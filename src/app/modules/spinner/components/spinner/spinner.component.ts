import {AfterViewInit, Component, Input, OnInit, ViewChild} from "@angular/core";
import {Subscribed} from "@mixins/subscribed.mixin";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {NgxUiLoaderConfig} from "ngx-ui-loader";

@Component({
    selector: "app-spinner",
    templateUrl: "./spinner.component.html",
    styleUrls: ["./spinner.component.scss"]
})
export class SpinnerComponent extends Subscribed() implements OnInit, AfterViewInit {
    @Input() id = "master";
    @Input() text = "";
    @Input() inline = false;
    @Input() config: NgxUiLoaderConfig = {};
    @ViewChild("loader") loader?: any;

    constructor(private spinner: SpinnerService) {
        super();
    }

    ngOnInit() {
        if (this.inline) {
            if (this.config.fgsSize === undefined) {
                this.config.fgsSize = 30;
            }
            if (this.config.hasProgressBar === undefined) {
                this.config.hasProgressBar = false;
            }
        }
        this.subscribe(this.spinner.spinnerShow$, ({id, text}) => {
            if (id === this.id) {
                if (this.inline) {
                    this.text = "";
                } else if (text) {
                    this.text = text;
                }
            }
        });
    }

    ngAfterViewInit() {
        Object.assign(this.loader, this.config);
    }
}
