import RegularExpression from "./regular-expression";
import { GrammarRuleName } from "./grammar-modals";

export interface IToken {
    value: any;
    TokenType: string;
}

export interface ILexeme {
    value: any;
}

export interface ILexRule {
    name: string;
    expression: string;
}

export default class Lexer {
    private input: string;
    private current: number;
    private rules: Array<ILexRule>;

    constructor(rules: Array<ILexRule>, input: string) {
        this.rules = rules;
        this.input = input;
        this.current = 0;
    }

    next(): IToken {
        while (this.current < this.input.length) {
            let found = false;

            for (var i = 0; i < this.rules.length; i++) {
                const rule = this.rules[i];

                const match = RegularExpression.matchFromIndex(rule.expression, this.input, this.current);
                if (match.length > 0) {
                    found = true;

                    const value = match[0].text;
                    this.current += value.length;
                    if (rule.name == GrammarRuleName.SKIP)
                        break;
                    else if (rule.name == GrammarRuleName.ERROR)
                        throw new Error(`Unexpected token ${value}`);
                    else
                        return { value: value, TokenType: rule.name };
                }
            }

            if (found == false)
                throw new Error('Unexpected token');
        }

        return { value: '', TokenType: 'EOF' };
    }
}