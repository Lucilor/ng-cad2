const getChanpinBeishu = (产品分类: string) => {
    let beishu = 1;
    if (["单门", "子母门", "子母对开", "大小折", "大小连开", "子母连开", "子母连体", "子母折叠", "大小折叠"].includes(产品分类)) {
        beishu = 1;
    } else if (["双开", "对开门", "两扇对开"].includes(产品分类)) {
        beishu = 2;
    } else if (["四扇平分", "四扇对开", "四扇立柱", "四扇固定", "四扇折叠"].includes(产品分类)) {
        beishu = 4;
    } else if (["四扇子母", "四扇大小开", "四扇大小折"].includes(产品分类)) {
        beishu = 2;
    } else if (["六扇平分"].includes(产品分类)) {
        beishu = 6;
    } else {
        throw new Error(`产品分类: ${产品分类}, 还没有处理倍数, 请先修改程序！`);
    }

    return beishu;
};

const isMenzhongmenCAD = (分类2: string) => {
    if (!分类2) {
        return false;
    }
    if (分类2.includes("门中门")) {
        return true;
    }

    return false;
};

export const getCADBeishu = (产品分类: string, 栋数: string, CAD分类: string, CAD分类2: string, 门中门扇数: string) => {
    let beishu = 1;
    const 产品倍数 = 产品分类 ? getChanpinBeishu(产品分类) : 1;
    const 门中门倍数 = 门中门扇数 ? 门中门扇数 : 1;
    if (isMenzhongmenCAD(CAD分类2)) {
        beishu = Number(门中门倍数);
    } else if (CAD分类 === "算料" && !CAD分类2.includes("多扇程序不乘倍数")) {
        beishu = 产品倍数;
    }
    if (isNaN(beishu) || beishu <= 0) {
        beishu = 1;
    }
    let dongshu = Number(栋数);
    if (isNaN(dongshu) || dongshu <= 0) {
        dongshu = 1;
    }
    return beishu * dongshu;
};
