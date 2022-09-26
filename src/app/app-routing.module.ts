import {NgModule} from "@angular/core";
import {Routes, RouterModule, Route} from "@angular/router";
import {JiaoweiComponent} from "@views/jiaowei/jiaowei.component";
import {ProjectGuard} from "@guards/project.guard";
import {PathResolveService} from "@services/path-resolve.service";
import {BackupComponent} from "@views/backup/backup.component";
import {ChangelogAdminComponent} from "@views/changelog-admin/changelog-admin.component";
import {DingdanbiaoqianComponent} from "@views/dingdanbiaoqian/dingdanbiaoqian.component";
import {ExportComponent} from "@views/export/export.component";
import {ImportComponent} from "@views/import/import.component";
import {IndexComponent} from "@views/index/index.component";
import {KailiaokongweipeizhiComponent} from "@views/kailiaokongweipeizhi/kailiaokongweipeizhi.component";
import {PageNotFoundComponent} from "@views/page-not-found/page-not-found.component";
import {PiliangjianbanComponent} from "@views/piliangjianban/piliangjianban.component";
import {PrintA4A015PreviewComponent} from "@views/print-a4-a015-preview/print-a4-a015-preview.component";
import {PrintCadComponent} from "@views/print/print-cad.component";
import {ReplaceTextComponent} from "@views/replace-text/replace-text.component";
import {SelectBancaiComponent} from "@views/select-bancai/select-bancai.component";
import {SelectCadsComponent} from "@views/select-cads/select-cads.component";
import {KailiaocanshuComponent} from "@views/kailiaocanshu/kailiaocanshu.component";
import {CleanComponent} from "@views/clean/clean.component";

export const routesInfo: (Route & {path: string})[] = [
    {path: "index", component: IndexComponent},
    {path: "print-cad", component: PrintCadComponent, title: "打印CAD"},
    {path: "printA4A015Preview", component: PrintA4A015PreviewComponent, title: "订单配件标签"},
    {path: "import", component: ImportComponent, title: "导入CAD"},
    {path: "export", component: ExportComponent, title: "导出CAD"},
    {path: "backup", component: BackupComponent, title: "备份CAD"},
    {path: "select-bancai", component: SelectBancaiComponent, title: "激光开料排版"},
    {path: "changelog-admin", component: ChangelogAdminComponent, title: "编辑更新日志"},
    {path: "kailiaokongweipeizhi", component: KailiaokongweipeizhiComponent, title: "开料孔位配置"},
    {path: "replace-text", component: ReplaceTextComponent, title: "文本替换"},
    {path: "piliangjianban", component: PiliangjianbanComponent, title: "批量剪板"},
    {path: "dingdanbiaoqian", component: DingdanbiaoqianComponent, title: "订单标签"},
    {path: "select-cads", component: SelectCadsComponent, title: "选择CAD"},
    {path: "jiaowei", component: JiaoweiComponent, title: "铰位"},
    {path: "kailiaocanshu", component: KailiaocanshuComponent, title: "开料参数"},
    {path: "clean", component: CleanComponent, title: "清理任务"}
];

const routes: Routes = [
    {path: "", children: [{path: "", pathMatch: "full", redirectTo: routesInfo[0].path}, ...routesInfo], canActivate: [ProjectGuard]},
    {path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
