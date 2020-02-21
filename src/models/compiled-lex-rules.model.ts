import { RegExpression } from "@msnraju/reg-expressions/lib";

export interface ICompiledLexRules {
    [key: string]: RegExpression;
}
