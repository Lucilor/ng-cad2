import {Component, OnDestroy, OnInit} from "@angular/core";
import {ListRandom} from "@utils";

interface Thuum {
    text: string;
    translation: string;
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
    currThuum = this.thuumRandom.next();

    constructor() {}

    ngOnInit() {
        this._intervalId = window.setInterval(() => {
            this.currThuum = this.thuumRandom.next();
        }, 3000);
    }

    ngOnDestroy() {
        window.clearInterval(this._intervalId);
    }
}
