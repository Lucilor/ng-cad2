import {Component, OnDestroy, OnInit} from "@angular/core";
import {environment} from "@env";
import {ListRandom, timeout} from "@utils";

interface Thuum {
    text: string;
    translation: string;
}

interface ThuumChar {
    content: string;
    charStyle: Partial<CSSStyleDeclaration>;
    layerStyle: Partial<CSSStyleDeclaration>;
}

const originThuums: Thuum[] = [
    {text: "Dur Neh Viir", translation: "Summon Durnehviir"},
    {text: "Faas Ru Maar", translation: "Dismay"},
    {text: "Feim Zii Gron", translation: "Become Ethereal"},
    {text: "Fo Krah Diin", translation: "Frost Breath"},
    {text: "Fus Ro Dah", translation: "Unrelenting Force"},
    {text: "Gaan Lah Haas", translation: "Drain Vitality"},
    {text: "Gol Hah Dov", translation: "Bend Will"},
    {text: "Hun Kaal Zoor", translation: "Call of Valor"},
    {text: "Iiz Slen Nus", translation: "Ice Form"},
    {text: "Joor Zah Frul", translation: "Dragonrend"},
    {text: "Kaan Drem Ov", translation: "Kyne's Peace"},
    {text: "Krii Lun Aus", translation: "Marked for Death"},
    {text: "Laas Yah Nir", translation: "Aura Whisper"},
    {text: "Lok Vah Koor", translation: "Clear Skies"},
    {text: "Mid Vur Shaan", translation: "Battle Fury"},
    {text: "Mul Qah Diiv", translation: "Dragon Aspect"},
    {text: "Od Ah Viing", translation: "Call Dragon"},
    {text: "Raan Mir Tah", translation: "Animal Allegiance"},
    {text: "Rii Vaaz Zol", translation: "Soul Tear"},
    {text: "Strun Bah Qo", translation: "Storm Call"},
    {text: "Su Grah Dun", translation: "Elemental Fury"},
    {text: "Tiid Klo Ul", translation: "Slow Time"},
    {text: "Ven Gaar Nos", translation: "Cyclone"},
    {text: "Wuld Nah Kest", translation: "Whirlwind Sprint"},
    {text: "Yol Toor Shol", translation: "Fire Breath"},
    {text: "Zul Mey Gut", translation: "Throw Voice"},
    {text: "Zun Haal Viik", translation: "Disarm"}
];

@Component({
    selector: "app-thuum",
    templateUrl: "./thuum.component.html",
    styleUrls: ["./thuum.component.scss"]
})
export class ThuumComponent implements OnInit, OnDestroy {
    private _intervalId = -1;
    thuumRandom = new ListRandom(originThuums);
    thuumChars: ThuumChar[] = [];
    layerStyle: Partial<CSSStyleDeclaration> = {};
    animationDuration = {main: 1200, char: 360};
    thuumStyle: Partial<CSSStyleDeclaration> = {};
    isProd = environment.production;

    constructor() {}

    ngOnInit() {
        this.loop();
    }

    ngOnDestroy() {
        window.clearInterval(this._intervalId);
    }

    async loop() {
        const {main: mainDuration, char: charDuration} = this.animationDuration;
        this.thuumChars = this.thuumRandom
            .next()
            .text.split("")
            .map((v, i) => ({
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
        this.thuumStyle = {animation: `show-thuum ${mainDuration}ms`};
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
}
