import {ObjectOf} from "@lucilor/utils";

export type Formulas = ObjectOf<string | number>;

export interface ExpressionInfo {
  exp: string;
  vars: string[];
}

export type ExpressionDepsValue<T> = ObjectOf<T | string[]>;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ExpressionDeps extends ExpressionDepsValue<ExpressionDeps> {}

export interface FormulaInfo {
  vars: string[];
  depth: number;
  deps: ExpressionDeps;
  exp: string;
}
