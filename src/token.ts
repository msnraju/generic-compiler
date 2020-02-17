export enum TokenType {
    TEXT = 'TEXT',
    COLON = "COLON",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    ASTERISK = "ASTERISK",
    NUMBER = "NUMBER",
    SYMBOL = "SYMBOL",
    DCOLON = "DCOLON"
}

export class Token {
    type: string;
    value: string | number;

    constructor(type: string, value: string | number) {
        this.type = type;
        this.value = value;
    }

    public toString = (): string => {
        return `Token(${this.type}, ${this.value})`;
    }
}