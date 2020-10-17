import {AfterViewInit, Component, Injector} from "@angular/core";
import {DomSanitizer} from "@angular/platform-browser";
import {getCadPreview, setApp} from "@src/app/app.common";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MenuComponent} from "../menu/menu.component";
import {openMessageDialog} from "../message/message.component";

@Component({
	selector: "app-backup",
	templateUrl: "./backup.component.html",
	styleUrls: ["./backup.component.scss"]
})
export class BackupComponent extends MenuComponent implements AfterViewInit {
	data: {id: number; title: string; cads: {data: CadData; img: string; checked: boolean}[]}[];
	loaderId = "backupLoader";

	constructor(injector: Injector, private sanitizer: DomSanitizer) {
		super(injector);
	}

	async ngAfterViewInit() {
		setApp(this);
		document.title = "恢复备份";
		this.data = (await this.dataService.getBackupCads())
			.sort((a, b) => b.time - a.time)
			.map((v) => {
				const result: BackupComponent["data"][0] = {id: v.time, title: new Date(v.time).toLocaleString(), cads: []};
				v.cads
					.sort((a, b) => (a.name > b.name ? 1 : -1))
					.forEach(async (data) => {
						const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data, 200, 100)) as string;
						result.cads.push({img, data, checked: false});
					});
				return result;
			});
	}

	async restore(i: number) {
		const cads = this.data[i].cads.map((v) => v.data);
		const total = cads.length;
		this.loaderText = `正在恢复备份(0/${total})`;
		this.startLoader();
		for (let i = 0; i < total; i++) {
			await this.dataService.setCadData("cad", cads[i], true);
			this.loaderText = `正在恢复备份(${i + 1}/${total})`;
		}
		this.stopLoader();
	}

	async remove(i: number) {
		const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content: "删除后无法恢复, 是否继续?"}});
		const yes = await ref.afterClosed().toPromise();
		if (yes) {
			this.loaderText = "正在删除备份";
			this.startLoader();
			const result = await this.dataService.removeBackup(this.data[i].id);
			this.stopLoader();
			if (result) {
				this.data.splice(i, 1);
			}
		}
	}
}
