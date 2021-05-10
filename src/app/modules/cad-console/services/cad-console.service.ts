import {Injectable} from "@angular/core";
import {ObjectOf} from "@utils";
import {BehaviorSubject} from "rxjs";
import {ValuedCommand} from "../cad-command-types";
import {CadConsoleModule} from "../cad-console.module";

@Injectable({
    providedIn: CadConsoleModule
})
export class CadConsoleService {
    command = new BehaviorSubject<ValuedCommand>({name: "", args: []});

    constructor() {}

    execute(name: string, argsObj: ObjectOf<string> = {}) {
        const args: ValuedCommand["args"] = [];
        for (const key in argsObj) {
            args.push({name: key, value: argsObj[key]});
        }
        this.command.next({name, args});
    }
}
