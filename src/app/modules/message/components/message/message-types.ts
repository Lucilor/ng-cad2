export interface BaseMessageData {
    title?: string;
    content?: any;
}

export interface PlainMessageData extends BaseMessageData {
    type: "alert" | "confirm";
}

export interface PromptData {
    type?: string;
    hint?: string;
    value?: string;
    placeholder?: string;
}

export interface PromptMessageData extends BaseMessageData {
    type: "prompt";
    promptData?: PromptData;
}

export interface BookPageData {
    title?: string;
    content: string;
}

export type BookData = BookPageData[];

export interface BookMessageData extends BaseMessageData {
    type: "book";
    bookData: BookData;
}

export type MessageData = PlainMessageData | PromptMessageData | BookMessageData;
