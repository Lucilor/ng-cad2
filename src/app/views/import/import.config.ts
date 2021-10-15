import {CadData, CadZhankai} from "@cad-viewer";
import {ObjectOf} from "@utils";

export const fields: ObjectOf<keyof CadData> = {
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
    算料特殊要求: "算料特殊要求"
};

export const zhankaiFields: ObjectOf<keyof CadZhankai> = {
    展开高: "zhankaigao",
    展开宽: "zhankaikuan",
    数量: "shuliang"
};
