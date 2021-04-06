export interface CadStatus {
    name: string;
}

export class CadStatusNormal implements CadStatus {
    name = "普通";
}

export class CadStatusSelectBaseline implements CadStatus {
    name = "选择基准线";
    constructor(public index: number) {}
}

export class CadStatusSelectJointpoint implements CadStatus {
    name = "选择连接点";
    constructor(public index: number) {}
}

export class CadStatusAssemble implements CadStatus {
    name = "装配";
    constructor(public index: number) {}
}

export class CadStatusSplit implements CadStatus {
    name = "选取CAD";
    constructor(public index: number) {}
}

export class CadStatusDrawLine implements CadStatus {
    name = "画线";
}

export class CadStatusMoveLines implements CadStatus {
    name = "移线";
}

export class CadStatusCutLine implements CadStatus {
    name = "截线";
}

export class CadStatusEditDimension implements CadStatus {
    name = "编辑标注";
    constructor(public index: number) {}
}
