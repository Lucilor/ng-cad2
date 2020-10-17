import {Component, Injector, OnInit} from "@angular/core";
import {setApp} from "@src/app/app.common";
import {splitCad} from "@src/app/cad-viewer/cad-data/split-join";
import {MenuComponent} from "../menu/menu.component";
import {openMessageDialog} from "../message/message.component";

@Component({
	selector: "app-import",
	templateUrl: "./import.component.html",
	styleUrls: ["./import.component.scss"]
})
export class ImportComponent extends MenuComponent implements OnInit {
	loaderId = "importLoader";
	msg = "";
	force = false;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		setApp(this);
		document.title = "导入CAD";
	}

	async importDxf(event: InputEvent) {
		if (this.force) {
			const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content: "重复数据将会被覆盖, 是否继续?"}});
			const yes = await ref.afterClosed().toPromise();
			if (!yes) {
				return;
			}
		}
		const el = event.target as HTMLInputElement;
		if (el.files?.length) {
			this.startLoader();
			this.loaderText = "正在读取文件";
			this.dataService.silent = true;
			const data = await this.dataService.uploadDxf(el.files[0]);
			const cads = splitCad(data);
			this.loaderText = `正在导入dxf数据(0/${cads.length})`;
			const skipped = [];
			const total = cads.length;
			const now = new Date().getTime();
			for (let i = 0; i < total; i++) {
				let result = await this.dataService.setCadData("cad", cads[i], this.force, now);
				let text = `正在导入dxf数据(${i + 1}/${total})`;
				if (!result) {
					skipped.push(cads[i].name);
					text += `\n ${skipped.join(", ")} 被跳过`;
				}
				this.loaderText = text;
			}
			this.stopLoader();
			this.msg = `导入结束, ${total - skipped.length}个成功(共${total}个)`;
		}
		el.value = "";
	}
}
