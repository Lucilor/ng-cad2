import {CadData} from "@cad-viewer";
import {ObjectOf} from "@utils";

export const cadFields: ObjectOf<keyof CadData> = {
    名字: "name",
    分类: "type",
    分类2: "type2",
    全部刨坑: "kailiaoshibaokeng",
    变形方式: "bianxingfangshi",
    板材纹理方向: "bancaiwenlifangxiang",
    开料排版方式: "kailiaopaibanfangshi",
    默认开料板材: "morenkailiaobancai",
    算料处理: "suanliaochuli",
    显示宽度标注: "showKuandubiaozhu",
    双向折弯: "shuangxiangzhewan",
    算料特殊要求: "算料特殊要求",
    算料单显示: "suanliaodanxianshi"
};
export interface Slgs {
    名字: string;
    分类: string;
    条件: string[];
    选项: ObjectOf<string>;
    公式: ObjectOf<string>;
}

export const slgsFields = ["名字", "分类", "条件", "选项", "算料公式"];

export const skipFields = ["模板放大"];
