import {XOR} from "@src/app/utils";

/* eslint-disable @typescript-eslint/indent */
export type Desc =
    | string
    | {
          content: string;
          sub?: Desc[];
          next?: Desc;
      };
/* eslint-enable @typescript-eslint/indent */

interface ArgBase {
    name: string;
    value?: string;
    desc: Desc;
}

interface ArgString extends ArgBase {
    defaultValue: string;
}

interface ArgBoolean extends ArgBase {
    isBoolean?: boolean;
}

export type Arg = XOR<ArgString, ArgBoolean>;

export type ValuedArg = Required<Omit<ArgBase, "desc">>;

export interface Command {
    name: string;
    desc: Desc | Desc[];
    args: Arg[];
}

export interface ValuedCommand {
    name: string;
    args: ValuedArg[];
}
