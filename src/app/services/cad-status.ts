export interface CadStatus {
    name: string;
    index?: number;
    canExit?: boolean;
    exitWithEsc?: boolean;
    canConfirm?: boolean;
    confirmWithEnter?: boolean;
    confirmed?: boolean;
}

export class CadStatusNormal implements CadStatus {
    name = "普通";
}

export class CadStatusSelectBaseline implements CadStatus {
    name = "选择基准线";
    canExit = true;
    exitWithEsc = true;
    constructor(public index: number) {}
}

export class CadStatusSelectJointpoint implements CadStatus {
    name = "选择连接点";
    canExit = true;
    exitWithEsc = true;
    constructor(public index: number) {}
}

export class CadStatusAssemble implements CadStatus {
    name = "装配";
    canExit = true;
    constructor(public index: number) {}
}

export class CadStatusSplit implements CadStatus {
    name = "选取CAD";
    canExit = true;
    exitWithEsc = true;
    constructor(public index: number) {}
}

export class CadStatusDrawLine implements CadStatus {
    name = "画线";
    canExit = true;
    exitWithEsc = true;
}

export class CadStatusMoveLines implements CadStatus {
    name = "移线";
    canExit = true;
    exitWithEsc = true;
}

export class CadStatusCutLine implements CadStatus {
    name = "截线";
    canExit = true;
    exitWithEsc = true;
    canConfirm = true;
    confirmWithEnter = true;
}

export class CadStatusEditDimension implements CadStatus {
    name = "编辑标注";
    canExit = true;
    exitWithEsc = true;
    constructor(public index: number) {}
}

export class CadStatusIntersection implements CadStatus {
    name = "取交点";
    canExit = true;
    exitWithEsc = true;
    constructor(public index: number) {}
}
