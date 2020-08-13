import {Component, OnInit, ViewChild, ElementRef, Input, Injector, Output, EventEmitter} from "@angular/core";
import {differenceWith} from "lodash";
import {timeout, removeCadGongshi, Collection, addCadGongshi} from "@src/app/app.common";
import {MatSnackBar} from "@angular/material/snack-bar";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {openMessageDialog, MessageComponent} from "../message/message.component";
import {validateLines} from "@src/app/cad-viewer/cad-data/cad-lines";
import {MenuComponent} from "../menu/menu.component";
import {CurrCadsAction, CadStatusAction} from "@src/app/store/actions";
import {MathUtils} from "three";

export interface Command {
	name: string;
	args: {name: string; defaultValue?: string; value?: string; isBoolean?: boolean; desc: string}[];
	desc: string;
}

export const commands: Command[] = [
	{name: "fillet", args: [{name: "radius", defaultValue: "0", desc: "圆角半径"}], desc: "根据两条直线生成圆角"},
	{name: "man", args: [{name: "name", defaultValue: "", desc: "查看特定命令的详细信息"}], desc: "查看控制台帮助手册"},
	{name: "save", args: [], desc: "保存当前所有CAD"},
	{
		name: "test",
		args: [
			{name: "qwer", defaultValue: "aaa", desc: "..."},
			{name: "asdf", isBoolean: true, desc: "???"}
		],
		desc: "测试"
	}
];

export const cmdNames = commands.map((v) => v.name);

const getList = (content: string[]) => {
	return `<ul>${content.map((v) => `<li>${v}</li>`).join("")}</ul>`;
};

const spaceReplacer = MathUtils.generateUUID();

@Component({
	selector: "app-cad-console",
	templateUrl: "./cad-console.component.html",
	styleUrls: ["./cad-console.component.scss"]
})
export class CadConsoleComponent extends MenuComponent implements OnInit {
	content = {correct: "", wrong: "", hint: "", args: ""};
	currCmd: Command = {name: "", args: [], desc: ""};
	history: string[] = [];
	historyOffset = -1;
	historySize = 100;
	collection: Collection;
	@ViewChild("consoleOuter", {read: ElementRef}) consoleOuter: ElementRef<HTMLDivElement>;
	@ViewChild("consoleInner", {read: ElementRef}) consoleInner: ElementRef<HTMLDivElement>;
	@ViewChild("contentEl", {read: ElementRef}) contentEl: ElementRef<HTMLDivElement>;
	@Input() cad: CadViewer;
	@Output() afterOpenCad = new EventEmitter<void>();

	get contentLength() {
		const el = this.contentEl.nativeElement;
		return el.offsetWidth + getSelection().focusOffset + "px";
	}

	constructor(injector: Injector, private snackBar: MatSnackBar) {
		super(injector);
	}

	ngOnInit() {}

	onKeyDown(event: KeyboardEvent) {
		const currCmdName = this.content;
		const el = this.contentEl.nativeElement;
		const key = event.key;
		if (key === "Enter") {
			event.preventDefault();
			this.beforeExecute();
		} else if (key === "Backspace") {
			// this.update();
		} else if (key === "Tab") {
			event.preventDefault();
			el.innerHTML = currCmdName.correct + currCmdName.wrong + currCmdName.hint + "&nbsp;";
			const selection = getSelection();
			selection.setPosition(selection.focusNode, el.textContent.length);
			this.update();
		} else if (key === "ArrowUp") {
			this.backward(1);
		} else if (key === "ArrowDown") {
			this.backward(-1);
		}
	}

	focuscontentEl() {
		const el = this.contentEl.nativeElement;
		el.focus();
		const selection = getSelection();
		selection.setPosition(selection.focusNode, el.textContent.length);
	}

	update() {
		const {content, currCmd} = this;
		const el = this.contentEl.nativeElement;
		let elContent = decodeURI(encodeURI(el.textContent).replace(/%C2%A0/g, "%20"));
		const matches = elContent.match(/['"]([^'^"]*)['"]/g);
		matches?.forEach((match) => {
			const replcer = match.replace(/ /g, spaceReplacer);
			elContent = elContent.replace(new RegExp(match, "g"), replcer);
		});
		const elCmd = elContent.match(/([^ ]*[ ]*)[^ ]?/)?.[1] ?? "";
		const elCmdTrimed = elCmd.trim();
		const arr = elContent
			.slice(elCmd.length)
			.split(" ")
			.filter((v) => v !== " ")
			.map((v) => v.replace(new RegExp(spaceReplacer, "g"), " "));

		for (const key in content) {
			content[key] = "";
		}
		content.correct = content.wrong = content.hint = "";
		currCmd.name = "";
		currCmd.args.length = 0;
		for (const name of cmdNames) {
			if (name === elCmdTrimed) {
				content.correct = elCmd;
				content.wrong = "";
				break;
			} else if (elCmdTrimed.length && name.startsWith(elCmdTrimed)) {
				content.hint = name.slice(elCmdTrimed.length);
				break;
			}
		}
		if (content.correct) {
			currCmd.name = elCmdTrimed;
		} else {
			content.wrong = elCmd;
		}

		const cmd = commands.find((v) => v.name === elCmdTrimed);
		if (cmd) {
			for (let i = 0; i < arr.length; i++) {
				let arg: Command["args"][0];
				if (arr[i].startsWith("--")) {
					const name = arr[i].slice(2);
					arg = cmd.args.find((v) => v.name === name);
				} else if (arr[i].startsWith("-")) {
					const name = arr[i].slice(1);
					const args = cmd.args.filter((v) => v.name.startsWith(name));
					if (args.length === 1) {
						arg = args[0];
					}
				} else if (i === 0 && arr[i]) {
					arg = cmd.args[0];
				}
				if (arg) {
					if (arg.isBoolean) {
						arg.value = "true";
					} else if (i < arr.length - 1) {
						const argVal = arr[i + 1];
						if (!argVal.startsWith("-")) {
							arg.value = argVal.replace(/^['"]|['"]$/g, "");
							i++;
						}
					}
					currCmd.args.push(arg);
				}
			}
			const hintArgs = differenceWith(cmd.args, currCmd.args, (a, b) => a.name === b.name);
			const hintArgsStr = hintArgs
				.map((v) => {
					let result = v.name;
					if (v.isBoolean) {
						result += "=false";
					} else if (typeof v.defaultValue === "string") {
						result += "=" + v.defaultValue;
					}
					return result;
				})
				.join(", ");
			if (hintArgsStr) {
				content.hint = `[ ${hintArgsStr} ]`;
			}
		}
		content.args = elContent.slice(elCmd.length).replace(new RegExp(spaceReplacer, "g"), " ");

		for (const key in content) {
			content[key] = content[key].replace(/ /g, "&nbsp;");
		}
	}

	beforeExecute() {
		const el = this.contentEl.nativeElement;
		if (!el.textContent) {
			el.textContent = this.history[0];
			this.update();
		}
		const {currCmd, history, historySize} = this;
		if (currCmd.name) {
			this.execute(currCmd);
		} else {
			this.snackBar.open("无效命令");
		}
		const prevCmd = history[0];
		if (prevCmd !== el.textContent) {
			if (history.length >= historySize) {
				history.pop();
			}
			history.unshift(el.textContent);
		}
		el.textContent = "";
		this.update();
	}

	async backward(offset: number) {
		const el = this.contentEl.nativeElement;
		const history = this.history;
		this.historyOffset = Math.min(history.length - 1, Math.max(-1, this.historyOffset + offset));
		console.log(offset, this.historyOffset);
		if (this.historyOffset < 0) {
			el.textContent = "";
		} else {
			el.textContent = history[this.historyOffset];
			await timeout(0);
			const selection = getSelection();
			selection.setPosition(selection.focusNode, el.textContent.length);
		}
		this.update();
	}

	execute(cmd: Command) {
		const {name, args} = cmd;
		const values = {};
		args.forEach((v) => (values[v.name] = v.value));
		const args2 = commands.find((v) => v.name === name).args;
		const argsValue = args2.map((v) => {
			if (v.isBoolean) {
				return values[v.name] === "true" ? "true" : "false";
			} else {
				return values[v.name] ?? v.defaultValue;
			}
		});
		try {
			this[name](...argsValue);
		} catch (error) {
			this.snackBar.open("执行命令时出错");
			console.warn(error);
		}
	}

	setCadData(data: CadData) {
		if (data.options.length < 1) {
			data.options.push(new CadOption());
		}
		if (data.conditions.length < 1) {
			data.conditions.push("");
		}
		if (data.baseLines.length < 1) {
			data.baseLines.push(new CadBaseLine());
		}
		if (data.jointPoints.length < 1) {
			data.jointPoints.push(new CadJointPoint());
		}
		data.entities.dimension.forEach((e) => e.color.set(0x00ff00));
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
	}

	afterOpen(data?: CadData[]) {
		const cad = this.cad;
		if (data) {
			cad.data.components.data = data;
			data.forEach((v) => {
				this.setCadData(v);
				addCadGongshi(v);
			});
			if (this.collection === "cad") {
				data.forEach((v) => validateLines(v));
			}
		}
		cad.reset(null, true);
		this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
		this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		this.afterOpenCad.emit();
	}

	/** Console Functions */

	man(name = "") {
		let data: MessageComponent["data"]["bookData"];
		switch (name) {
			default:
				data = [
					{
						title: "控制台",
						content: getList([
							"按下 <span style='color:red'>Ctrl + ~</span> 以显示/隐藏控制台。",
							"控制台显示时，按<span style='color:red'>~</span>可以聚焦至控制台。"
						])
					},
					{
						title: "输入命令",
						content: getList([
							`命令示例：eat --food apple --time "12:00 PM" --number 5 --alone。`,
							`当参数名字的首字母不重复时，可简写为：eat -f apple -t "12:00 PM" -n 5 -a。`,
							`参数的值类型分为字符串或布尔值，若字符串中包含空格时双（单）引号不能省略，布尔值指定参数时为真，否则为假。`,
							`不指定参数时会使用其默认值（布尔值类型为false）`,
							`若只需要指定第一个参数，可以省略参数名字：eat apple`
						])
					},
					{
						title: "查询命令",
						content: getList(["若要查看某个命令的用法，可执行命令：man xxx"])
					}
				];
		}
		openMessageDialog(this.dialog, {
			data: {
				type: "book",
				title: "帮助手册",
				bookData: data
			}
		});
	}

	async save() {
		const {cad, dataService} = this;
		let result: CadData[] = [];
		const data = cad.data.components.data;
		if (this.collection === "p_yuanshicadwenjian") {
			const {name, extra} = await this.getCadStatus();
			if (name !== "split") {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "原始CAD文件只能在选取时保存"}});
				return;
			}
			let indices: number[];
			if (typeof extra?.index === "number") {
				indices = [extra.index];
			} else {
				indices = [...Array(data.length).keys()];
			}
			for (const i of indices) {
				result = await dataService.postCadData(data[i].components.data, {collection: "cad"});
				if (result) {
					data[extra.index].components.data = result;
					this.afterOpen();
				}
			}
		} else {
			const validateResult = [];
			data.forEach((v) => {
				removeCadGongshi(v);
				if (this.collection === "cad") {
					validateResult.push(validateLines(v));
				}
			});
			cad.render();
			if (validateResult.some((v) => !v.valid)) {
				const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content: "当前打开的CAD存在错误，是否继续保存？"}});
				const yes = await ref.afterClosed().toPromise();
				if (!yes) {
					return;
				}
			}
			const postData: any = {};
			if (this.collection) {
				postData.collection = this.collection;
			}
			result = await dataService.postCadData(data, postData);
			if (result) {
				this.afterOpen(result);
			}
		}
		return result;
	}

	test(qwer: string, asdf: string) {
		this.snackBar.open(`qwer=${qwer}, asdf=${asdf}`);
	}
}
