import {Component, Inject, OnInit} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {CadCollection} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {AppStatusService} from "@services/app-status.service";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-draw-cad",
  templateUrl: "./draw-cad.component.html",
  styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements OnInit {
  items: {data: CadData; img: SafeUrl}[] = [];

  constructor(
    public dialogRef: MatDialogRef<DrawCadComponent, DrawCadOutput>,
    @Inject(MAT_DIALOG_DATA) public data: DrawCadInput,
    private sanitizer: DomSanitizer,
    private status: AppStatusService
  ) {}

  async ngOnInit() {
    const cads = this.data?.cads || [];
    this.items = [];
    for (const cad of cads) {
      const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview("cad", cad));
      this.items.push({data: cad, img});
    }
  }

  logCad(data: CadData) {
    console.log(data);
  }

  openCad(data: CadData) {
    this.status.openCadInNewTab(data.id, this.data.collection);
  }

  close() {
    this.dialogRef.close();
  }
}

export interface DrawCadInput {
  collection: CadCollection;
  cads: CadData[];
}

export type DrawCadOutput = void;

export const openDrawCadDialog = getOpenDialogFunc<DrawCadComponent, DrawCadInput, DrawCadOutput>(DrawCadComponent, {
  width: "100vw",
  height: "100vh"
});
