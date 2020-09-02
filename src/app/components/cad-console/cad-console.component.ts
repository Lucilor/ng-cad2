import {Component, OnInit, ViewChild, ElementRef, Input, Injector, Output, EventEmitter, OnDestroy} from "@angular/core";
import {differenceWith} from "lodash";
import {timeout, removeCadGongshi, Collection, addCadGongshi, Command, getDPI, session} from "@src/app/app.common";
import {MatSnackBar} from "@angular/material/snack-bar";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {openMessageDialog, MessageComponent} from "../message/message.component";
import {validateLines} from "@src/app/cad-viewer/cad-data/cad-lines";
import {MenuComponent} from "../menu/menu.component";
import {CurrCadsAction, CadStatusAction, LoadingAction} from "@src/app/store/actions";
import {MathUtils} from "three";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {getCadStatus, getCommand, getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {highlight} from "highlight.js";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {createPdf} from "pdfmake/build/pdfmake";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {Angle, Arc, Line, Point} from "@app/utils";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";
import {animate, style, transition, trigger} from "@angular/animations";
import {ActivatedRoute} from "@angular/router";
import {CadCircle} from "@src/app/cad-viewer/cad-data/cad-entity/cad-circle";

const getList = (content: string[]) => {
	return `<ul>${content.map((v) => `<li>${v}</li>`).join("")}</ul>`;
};

export const commands: Command[] = [
	{name: "assemble", desc: "进入/退出装配状态", args: []},
	{name: "fillet", desc: "根据两条直线生成圆角", args: [{name: "radius", defaultValue: "0", desc: "圆角半径"}]},
	{
		name: "flip",
		desc: "翻转CAD",
		args: [
			{name: "horizontal", isBoolean: true, desc: "是否水平翻转"},
			{name: "vertical", isBoolean: true, desc: "是否垂直翻转"}
		]
	},
	{
		name: "man",
		desc: "查看控制台帮助手册",
		args: [
			{name: "name", defaultValue: "", desc: "要查询的命令"},
			{name: "list", isBoolean: true, desc: "查看所有可用命令"}
		]
	},
	{
		name: "open",
		desc: "打开一个或多个CAD",
		args: [
			{
				name: "collection",
				defaultValue: "2",
				desc: "CAD集合名字<br>" + getList(["1: p_yuanshicadwenjian", "2: cad", "3: CADmuban", "4: qiliaozuhe", "5: qieliaocad"])
			}
		]
	},
	{name: "print", desc: "打印当前CAD", args: []},
	{name: "rotate", desc: "旋转CAD", args: [{name: "degrees", defaultValue: "0", desc: "旋转角度（角度制）"}]},
	{name: "save", desc: "保存当前所有CAD。", args: []},
	{name: "split", desc: "进入/退出选取状态", args: []},
	{
		name: "test",
		desc: "测试",
		args: [
			{name: "qwer", defaultValue: "aaa", desc: "..."},
			{name: "asdf", isBoolean: true, desc: "???"}
		]
	}
];

export const cmdNames = commands.map((v) => v.name);

const spaceReplacer = MathUtils.generateUUID();

@Component({
	selector: "app-cad-console",
	templateUrl: "./cad-console.component.html",
	styleUrls: ["./cad-console.component.scss"],
	animations: [
		trigger("console", [
			transition(":enter", [
				style({transform: "translateY(20px)", opacity: 0}),
				animate("0.3s", style({transform: "translateY(0)", opacity: 1}))
			]),
			transition(":leave", [style({filter: "blur(0)"}), animate("0.3s", style({filter: "blur(20px)"}))])
		])
	]
})
export class CadConsoleComponent extends MenuComponent implements OnInit, OnDestroy {
	content = {correct: "", wrong: "", hint: "", args: ""};
	currCmd: Command = {name: "", args: [], desc: ""};
	history: string[] = [];
	historyOffset = -1;
	historySize = 100;
	collection: Collection;
	ids: string[];
	openLock = false;
	lastUrl: string;
	visible = false;
	@ViewChild("consoleOuter", {read: ElementRef}) consoleOuter: ElementRef<HTMLDivElement>;
	@ViewChild("consoleInner", {read: ElementRef}) consoleInner: ElementRef<HTMLDivElement>;
	@ViewChild("contentEl", {read: ElementRef}) contentEl: ElementRef<HTMLDivElement>;
	@Input() cad: CadViewer;
	@Output() afterOpenCad = new EventEmitter<void>();

	get contentLength() {
		const el = this.contentEl.nativeElement;
		return el.offsetWidth + getSelection().focusOffset + "px";
	}

	constructor(injector: Injector, private snackBar: MatSnackBar, private route: ActivatedRoute) {
		super(injector);
	}

	async ngOnInit() {
		super.ngOnInit();
		this.getObservable(getCommand).subscribe((command) => {
			if (command) {
				this.execute(command);
			}
		});
		window.addEventListener("keydown", this.onKeyDownWin.bind(this));
		this.route.queryParams.subscribe((queryParams) => {
			if (typeof queryParams.collection === "string") {
				this.collection = queryParams.collection as Collection;
			}
		});

		const {ids, collection, dataService} = this;
		let cachedData: any = null;
		let params: any = null;
		let vid: string = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			params = JSON.parse(sessionStorage.getItem("params"));
			vid = sessionStorage.getItem("vid");
		} catch (error) {
			console.warn(error);
		}
		if (cachedData && vid) {
			this.collection = params.collection ?? "cad";
			const {showLineLength} = params;
			this.cad.config.showLineLength = showLineLength;
			this.afterOpen([new CadData(cachedData)]);
		} else if (location.search) {
			const data = await dataService.getCadData();
			if (typeof dataService.queryParams.collection === "string") {
				this.collection = dataService.queryParams.collection as Collection;
			}
			this.afterOpen(data);
		} else if (ids.length) {
			const data = await dataService.getCadData({ids, collection});
			this.afterOpen(data);
		}
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		window.removeEventListener("keydown", this.onKeyDownWin.bind(this));
	}

	onKeyDownWin({ctrlKey, key}: KeyboardEvent) {
		if (ctrlKey) {
			if (key === "`") {
				this.visible = !this.visible;
			}
		} else {
			const el = this.contentEl?.nativeElement;
			const activeEl = document.activeElement;
			if (key.match(/[a-z]/) && el && el !== activeEl && !(activeEl instanceof HTMLInputElement)) {
				el.focus();
				const selection = getSelection();
				selection.setPosition(selection.focusNode, el.textContent.length);
			}
		}
	}

	onKeyDown(event: KeyboardEvent) {
		const currCmdName = this.content;
		const el = this.contentEl.nativeElement;
		const key = event.key;
		if (key === "Enter") {
			event.preventDefault();
			this.beforeExecute();
		} else if (key === "Tab") {
			event.preventDefault();
			if (!currCmdName.correct) {
				el.innerHTML = currCmdName.wrong + currCmdName.hint + "&nbsp;";
				const selection = getSelection();
				selection.setPosition(selection.focusNode, el.textContent.length);
				this.update();
			}
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
				let directFirst = false;
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
					directFirst = true;
				}
				if (arg) {
					if (directFirst) {
						arg.value = arr[i];
					} else if (arg.isBoolean) {
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

	// * Support Functions Start

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

	getBashStyle(str: string) {
		return `<code class="bash hljs">${highlight("bash", str).value}</code>`;
	}

	async transform(trans: CadTransformation, rotateDimension = false) {
		const {cad} = this;
		const seleted = cad.selectedEntities;
		if (seleted.length) {
			const {x, y} = cad.getBounds(seleted);
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else {
			const t = (data: CadData) => {
				const {x, y} = data.getBounds();
				trans.anchor.set(x, y);
				data.transform(trans);
				if (rotateDimension) {
					data.getAllEntities().dimension.forEach((d) => {
						if (d.axis === "x") {
							d.axis = "y";
						} else {
							d.axis = "x";
						}
					});
				}
				removeCadGongshi(data);
				addCadGongshi(data);
			};
			const currCads = await this.getObservableOnce(getCurrCads);
			const currCadsData = getCurrCadsData(this.cad.data, currCads);
			if (currCadsData.length) {
				currCadsData.forEach((data) => t(data));
			} else {
				this.cad.data.components.data.forEach((data) => t(data));
			}
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	async takeOneMajorCad(desc: string) {
		const currCadsData = await this.getCurrCadsData();
		const ids = currCadsData.map((v) => v.id);
		const selected: {names: string[]; indices: number[]} = {names: [], indices: []};
		this.cad.data.components.data.forEach((v, i) => {
			if (ids.includes(v.id)) {
				selected.names.push(v.name);
				selected.indices.push(i);
			}
		});
		if (selected.indices.length < 1) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "请先选择一个主CAD"}});
			return null;
		} else if (selected.indices.length > 1) {
			const ref = openMessageDialog(this.dialog, {
				data: {
					type: "confirm",
					content: `你选择了多个主CAD。进入${desc}将自动选择<span style="color:red">${selected.names[0]}</span>，是否继续？`
				}
			});
			const yes = await ref.afterClosed().toPromise();
			if (!yes) {
				return;
			}
		}
		return selected.indices[0];
	}

	// * Support Functions end

	// * Console Functions start

	async assemble() {
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name === "assemble") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			const index = await this.takeOneMajorCad("装配");
			if (index !== null) {
				this.store.dispatch<CadStatusAction>({type: "set cad status", name: "assemble", index});
			}
		}
	}

	async fillet(radiusArg: string) {
		let radius = Number(radiusArg) || 0;
		const lines = this.cad.selectedEntities.line;
		if (lines.length !== 2) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "请先选择且只选择两条线段"}});
			return;
		}
		const {start: start1, end: end1} = lines[0];
		const {start: start2, end: end2} = lines[1];
		const p1 = new Point(start1.x, start1.y);
		const p2 = new Point(end1.x, end1.y);
		const p3 = new Point(start2.x, start2.y);
		const p4 = new Point(end2.x, end2.y);
		const l1 = new Line(p1.clone(), p2.clone());
		const l2 = new Line(p3.clone(), p4.clone());
		let point = l1.intersects(l2, true);
		let center: Point;
		let startAngle: number;
		let endAngle: number;
		let clockwise: boolean;
		if (!point) {
			radius = l1.distanceTo(l2) / 2;
			if (radius <= 0) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "两直线平行且距离为0"}});
				return;
			}
			let l3: Line;
			let l4: Line;
			let reverse: number;
			if (l1.theta.equals(l2.theta)) {
				l3 = l1.clone().rotate(Math.PI / 2, l1.start);
				l4 = l1.clone().rotate(Math.PI / 2, l1.end);
				l3.end.copy(l3.intersects(l2, true));
				l4.reverse().end.copy(l4.intersects(l2, true));
				reverse = 1;
			} else {
				l3 = l1.clone().rotate(Math.PI / 2, l1.end);
				l4 = l1.clone().rotate(Math.PI / 2, l1.start);
				l3.reverse().end.copy(l3.intersects(l2, true));
				l4.end.copy(l4.intersects(l2, true));
				reverse = -1;
			}
			const d1 = l3.end.distanceTo(l2.start);
			const d2 = l4.end.distanceTo(l2.end);
			if (d1 < d2) {
				center = l3.middle;
				point = l3.end;
				lines[1].start.set(point.x, point.y);
				clockwise = l1.crossProduct(l3) * reverse > 0;
			} else {
				center = l4.middle;
				point = l4.end;
				lines[1].end.set(point.x, point.y);
				clockwise = l1.crossProduct(l4) * reverse < 0;
			}
			endAngle = new Line(center, point).theta.deg;
			startAngle = endAngle - 180;
		} else {
			if (radius === undefined) {
				const ref = openMessageDialog(this.dialog, {
					data: {type: "prompt", content: "请输入圆角半径", promptData: {type: "number", value: "10"}}
				});
				radius = Number(await ref.afterClosed().toPromise());
				if (!(radius > 0)) {
					openMessageDialog(this.dialog, {data: {type: "alert", content: "请输入大于零的数字"}});
					return;
				}
			}
			l1.start.set(point);
			l2.start.set(point);
			if (p1.distanceTo(point) > p2.distanceTo(point)) {
				l1.end.set(p1);
			}
			if (p3.distanceTo(point) > p4.distanceTo(point)) {
				l2.end.set(p3);
			}
			const theta1 = l1.theta.rad;
			const theta2 = l2.theta.rad;
			const theta3 = Math.abs(theta2 - theta1) / 2;
			let theta4 = (theta1 + theta2) / 2;
			if (theta3 > Math.PI / 2) {
				theta4 -= Math.PI;
			}
			clockwise = l1.crossProduct(l2) > 0;
			const d1 = Math.abs(radius / Math.tan(theta3));
			const d2 = Math.abs(radius / Math.sin(theta4));
			const startPoint = new Point(Math.cos(theta1), Math.sin(theta1)).multiply(d1).add(point);
			const endPoint = new Point(Math.cos(theta2), Math.sin(theta2)).multiply(d1).add(point);
			if (!l1.containsPoint(startPoint) || !l2.containsPoint(endPoint)) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "半径过大"}});
				return;
			}
			center = new Point(Math.cos(theta4), Math.sin(theta4)).multiply(d2).add(point);
			if (p1.distanceTo(point) < p2.distanceTo(point)) {
				lines[0].start.set(startPoint.x, startPoint.y);
			} else {
				lines[0].end.set(startPoint.x, startPoint.y);
			}
			if (p3.distanceTo(point) < p4.distanceTo(point)) {
				lines[1].start.set(endPoint.x, endPoint.y);
			} else {
				lines[1].end.set(endPoint.x, endPoint.y);
			}
			startAngle = new Line(center, startPoint).theta.deg;
			endAngle = new Line(center, endPoint).theta.deg;
		}
		if (radius > 0) {
			const cadArc = new CadArc({center: center.toArray(), radius, color: lines[0].color});
			cadArc.start_angle = startAngle;
			cadArc.end_angle = endAngle;
			cadArc.clockwise = clockwise;
			const data = (await this.getCurrCadsData())[0];
			data.entities.add(cadArc);
		}
		if (this.cad.config.validateLines) {
			validateLines(this.cad.data);
		}
		this.cad.unselectAll();
	}

	flip(horizontal: string, vertival: string) {
		this.transform(new CadTransformation({flip: {vertical: vertival === "true", horizontal: horizontal === "true"}}));
	}

	man(name: string, list: string) {
		let data: MessageComponent["data"]["bookData"];
		if (list === "true") {
			const cmdList = {};
			cmdNames.forEach((v) => {
				if (cmdList[v[0]]) {
					cmdList[v[0]].push(v);
				} else {
					cmdList[v[0]] = [v];
				}
			});
			const cmdListArr = [];
			for (const key in cmdList) {
				cmdListArr.push(`<span style="color:orchid">${key}</span><br>${cmdList[key].join(", ")}`);
			}
			data = [{title: "命令列表", content: getList(cmdListArr)}];
		} else if (name) {
			for (const cmd of commands) {
				if (name === cmd.name) {
					const argsDesc = cmd.args.map((v) => `[${v.name}=${v.isBoolean ? "false" : v.defaultValue}]: ${v.desc}`);
					if (argsDesc.length) {
						data = [{title: name, content: `${cmd.desc}<br>${getList(argsDesc)}`}];
					} else {
						data = [{title: name, content: cmd.desc}];
					}
					break;
				}
			}
			if (!data) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: `找不到命令: <span style="color:red">${name}</span>`}});
				return;
			}
		}
		if (!data) {
			data = [
				{
					title: "控制台",
					content: getList([
						"按下 <span style='color:deeppink'>Ctrl + ~</span> 以显示/隐藏控制台。",
						"控制台显示时，按下任意字母可以聚焦至控制台。",
						"输入命令时，按 <span style='color:deeppink'>Tab</span> 可以自动补全命令。"
					])
				},
				{
					title: "输入命令",
					content: getList([
						`命令示例：${this.getBashStyle(`eat --food apple --time "12:00 PM" --number 5 --alone`)}`,
						`当参数名字的首字母不重复时，可简写为：${this.getBashStyle(`eat -f apple -t "12:00 PM" -n 5 -a`)}`,
						`参数的值类型分为字符串或布尔值，若字符串中包含空格时双（单）引号不能省略，布尔值指定参数时为真，否则为假。`,
						`不指定参数时会使用其默认值（布尔值类型为false）`,
						`若只需要指定第一个参数，可以省略参数名字：${this.getBashStyle(`eat apple`)}`
					])
				},
				{
					title: "查询命令",
					content: getList([
						`若要查看所有可用命令，可执行命令：${this.getBashStyle(`man -l`)}`,
						`若要查看某个命令的用法，可执行命令：${this.getBashStyle(`man xxx`)}`
					])
				}
			];
		}
		openMessageDialog(this.dialog, {
			data: {
				type: "book",
				title: "帮助手册",
				bookData: data
			},
			width: "80vw"
		});
	}

	open(collectionArg: string) {
		if (this.openLock) {
			return;
		}
		let collection: Collection;
		switch (collectionArg) {
			case "1":
				collection = "p_yuanshicadwenjian";
				break;
			case "2":
				collection = "cad";
				break;
			case "3":
				collection = "CADmuban";
				break;
			case "4":
				collection = "qiliaozuhe";
				break;
			case "5":
				collection = "qieliaocad";
				break;
			default:
				collection = "cad";
				break;
		}
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const checkedItems = this.cad.data.components.data;
		const ref = openCadListDialog(this.dialog, {data: {collection, selectMode, checkedItems}});
		this.openLock = true;
		ref.afterClosed().subscribe((data: CadData[]) => {
			if (data) {
				this.collection = collection;
				this.afterOpen(data);
			}
			this.openLock = false;
		});
	}

	/**
	 * A4: (210 × 297)mm²
	 *    =(8.26 × 11.69)in² (1in = 25.4mm)
	 * 	  =(794 × 1123)px² (96dpi)
	 */
	async print() {
		this.store.dispatch<LoadingAction>({type: "add loading", name: "printCad"});
		await timeout(100);
		const data = this.cad.data.clone();
		removeCadGongshi(data);
		let [dpiX, dpiY] = getDPI();
		if (!(dpiX > 0) || !(dpiY > 0)) {
			console.warn("Unable to get screen dpi.Assuming dpi = 96.");
			dpiX = dpiY = 96;
		}
		const width = (210 / 25.4) * dpiX * 0.75;
		const height = (297 / 25.4) * dpiY * 0.75;
		const scaleX = 300 / dpiX / 0.75;
		const scaleY = 300 / dpiY / 0.75;
		const scale = Math.sqrt(scaleX * scaleY);
		data.getAllEntities().forEach((e) => {
			if (e.linewidth >= 0.3) {
				e.linewidth *= 3;
			}
			e.color.set(0);
			if (e instanceof CadDimension) {
				e.selected = true;
			}
		});
		const cad = new CadViewer(data, {
			...this.cad.config,
			width: width * scaleX,
			height: height * scaleY,
			backgroundColor: 0xffffff,
			padding: 18 * scale,
			showStats: false,
			showLineLength: 0,
			showGongshi: 0
		});
		document.body.appendChild(cad.dom);
		cad.render();
		const src = cad.exportImage().src;
		cad.destroy();
		const pdf = createPdf({content: {image: src, width, height}, pageSize: "A4", pageMargins: 0});
		pdf.getBlob((blob) => {
			this.store.dispatch<LoadingAction>({type: "remove loading", name: "printCad"});
			const url = URL.createObjectURL(blob);
			open(url);
			URL.revokeObjectURL(this.lastUrl);
			this.lastUrl = url;
		});
	}

	rotate(degreesArg: string) {
		const degrees = Number(degreesArg);
		const rotateDimension = Math.round(degrees / 90) % 2 !== 0;
		const radians = MathUtils.degToRad(degrees);
		this.transform(new CadTransformation({rotate: {angle: radians}}), rotateDimension);
	}

	async save() {
		const {cad, dataService} = this;
		let result: CadData[] = [];
		const data = cad.data.components.data;
		if (this.collection === "p_yuanshicadwenjian") {
			const {name, extra} = await this.getObservableOnce(getCadStatus);
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
				this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
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

	async split() {
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name === "split") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			const index = await this.takeOneMajorCad("选取");
			if (index !== null) {
				const collection = this.collection;
				this.store.dispatch<CadStatusAction>({type: "set cad status", name: "split", index, extra: {collection, index}});
			}
		}
	}

	test(qwer: string, asdf: string) {
		this.snackBar.open(`qwer=${qwer}, asdf=${asdf}`);
	}

	// * Console Functions end

	saveStatus() {
		const data = {
			collection: this.collection,
			ids: this.cad.data.components.data.map((v) => v.id)
		};
		session.save("console", data);
	}

	loadStatus() {
		const data = session.load("console");
		this.collection = data?.collection;
		this.ids = data?.ids || [];
	}
}
