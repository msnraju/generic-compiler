import { ILexRule } from "./lexer";

export enum GrammarRuleName {
    'SKIP' = '__SKIP__',
    'ERROR' = '__ERROR__'
}

export interface IGrammarExprQuantifier {
    min: number | null;
    max: number | null;
}

export enum GrammarExprNodeType {
    ROOT = 'ROOT',
    NON_TERMINAL = 'NON_TERMINAL',
    ALTERNATION = 'ALTERNATION',
    GROUP = 'GROUP',
    TOKEN = "TOKEN"
}

export interface IGrammarExprNode {
    type: GrammarExprNodeType;
    nodes?: Array<IGrammarExprNode>;
    value?: string;
    quantifier?: IGrammarExprQuantifier;

    group?: number;
}

declare interface IProduction {
    name: string;
    expression: string;
}

export interface IGrammar {
    start: string;
    tokens: Array<ILexRule>;
    productions: Array<IProduction>;
}

export interface IParseTreeNode {
    type: string;
    value?: string;
    nodes?: Array<IParseTreeNode>;
}
