import {Component, OnDestroy, OnInit} from "@angular/core";
import {environment} from "@env";
import {MessageService} from "@modules/message/services/message.service";
import {ListRandom, timeout} from "@utils";
import originThuums from "./thuums.json";

interface Thuum {
    name: string;
    translation: string;
    description: string;
}

interface ThuumChar {
    content: string;
    charStyle: Partial<CSSStyleDeclaration>;
    layerStyle: Partial<CSSStyleDeclaration>;
}

@Component({
    selector: "app-thuum",
    templateUrl: "./thuum.component.html",
    styleUrls: ["./thuum.component.scss"]
})
export class ThuumComponent implements OnInit, OnDestroy {
    private _intervalId = -1;
    thuumRandom = new ListRandom(originThuums);
    thuum: Thuum = this.thuumRandom.list[0];
    thuumChars: ThuumChar[] = [];
    layerStyle: Partial<CSSStyleDeclaration> = {};
    animationDuration = {main: 2000, char: 360};
    thuumStyle: Partial<CSSStyleDeclaration> = {};
    isProd = environment.production;
    get thuumTitle() {
        return `${this.thuum.name} - ${this.thuum.translation}`;
    }

    constructor(private message: MessageService) {}

    ngOnInit() {
        this.loop();
    }

    ngOnDestroy() {
        window.clearInterval(this._intervalId);
    }

    async loop() {
        const {main: mainDuration, char: charDuration} = this.animationDuration;
        this.thuum = this.thuumRandom.next();
        this.thuumChars = this.thuum.name.split("").map((v, i) => ({
            content: v,
            charStyle: {opacity: "0", animation: `fade-in ${charDuration}ms ${charDuration * i}ms forwards`},
            layerStyle: {
                left: "unset",
                right: "0",
                width: "100%",
                animation: `slide-out ${charDuration}ms ${charDuration * i}ms forwards`
            }
        }));
        const charsDuration = this.thuumChars.length * charDuration;
        await timeout(charsDuration);
        if (!this.isProd) {
            this.thuumStyle = {animation: `show-thuum ${mainDuration}ms`};
        }
        await timeout(mainDuration);
        this.thuumStyle = {};
        this.thuumChars.forEach((v, i) => {
            v.charStyle = {opacity: "1", animation: `fade-out ${charDuration}ms ${charDuration * i}ms forwards`};
            v.layerStyle = {
                left: "0",
                right: "unset",
                width: "0",
                animation: `slide-in ${charDuration}ms ${charDuration * i}ms forwards`
            };
        });
        await timeout(charsDuration);
        this.loop();
    }

    showDetails() {
        const {name, translation, description} = this.thuum;
        this.message.alert({
            title: name,
            titleClass: "thuum-title",
            content: `${name} - ${translation}<br>${description}`
        });
    }
}
