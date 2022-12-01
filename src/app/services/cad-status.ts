import {CadDimensionType} from "@cad-viewer";

export abstract class CadStatus {
  name = "None";
  index = -1;
  canExit = false;
  exitWithEsc = false;
  canConfirm = false;
  confirmWithEnter = false;
  confirmed = false;

  constructor(index?: number) {
    if (typeof index === "number") {
      this.index = index;
    }
  }
}

export class CadStatusNormal extends CadStatus {
  name = "普通";
}

export class CadStatusSelectBaseline extends CadStatus {
  name = "选择基准线";
  canExit = true;
  exitWithEsc = true;
}

export class CadStatusSelectJointpoint extends CadStatus {
  name = "选择连接点";
  canExit = true;
  exitWithEsc = true;
}

export class CadStatusAssemble extends CadStatus {
  name = "装配";
  canExit = true;
}

export class CadStatusSplit extends CadStatus {
  name = "选取CAD";
  canExit = true;
  exitWithEsc = true;
}

export class CadStatusDrawLine extends CadStatus {
  name = "画线";
  canExit = true;
  exitWithEsc = true;
}

export class CadStatusMoveLines extends CadStatus {
  name = "移线";
  canExit = true;
  exitWithEsc = true;
}

export class CadStatusCutLine extends CadStatus {
  name = "截线";
  canExit = true;
  exitWithEsc = true;
  canConfirm = true;
  confirmWithEnter = true;
}

export class CadStatusEditDimension extends CadStatus {
  name = "编辑标注";
  canExit = true;
  exitWithEsc = true;

  constructor(public type: CadDimensionType, index?: number) {
    super(index);
  }
}

export class CadStatusIntersection extends CadStatus {
  name = "取交点";
  canExit = true;
  exitWithEsc = true;

  constructor(public info: string, index?: number) {
    super(index);
  }
}
