import { IGrammar } from "..";
import { RegExpression, IMatch } from '@msnraju/reg-expressions';
import { GrammarExpression } from "./grammar-expression";
import { ICompiledLexRules } from "../models/compiled-lex-rules.model";
import { ICompiledProductionRules } from "../models/compiled-production-rules.model";
import { ICodeParserResult } from "../models/code-parser-result.model";

export class CodeParser {
    private grammar: IGrammar;
    private prepared: boolean = false;
    private lexRules: ICompiledLexRules = {};
    private prodRules: ICompiledProductionRules = {};

    constructor(grammar: IGrammar) {
        this.grammar = grammar;
    }

    private prepareParser() {
        if (this.prepared)
            return;

        for (let i = 0; i < this.grammar.tokens.length; i++) {
            const rule = this.grammar.tokens[i];
            this.lexRules[rule.name] = new RegExpression(rule.expression);
        }

        this.prodRules = {};
        for (let i = 0; i < this.grammar.productions.length; i++) {
            const rule = this.grammar.productions[i];
            this.prodRules[rule.name] = new GrammarExpression(rule.expression, this.lexRules, this.prodRules);
        }
    }

    parseTree(input: string): ICodeParserResult {
        this.prepareParser();
        const start = this.prodRules[this.grammar.start];
        return start.match(input);
    }
}