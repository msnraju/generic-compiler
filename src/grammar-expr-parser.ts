import Lexer, { ILexRule, IToken } from "./lexer";
import { GrammarExprNodeType, IGrammarExprNode, GrammarRuleName, IGrammar } from "./grammar-modals";

export interface IParseContext {
    grammar: IGrammar;
    tokens: Array<IToken>;
    index: number,
    group: number;
}

export enum TokenType {
    IDENTIFIER = 'IDENTIFIER',
    ALTERNATION = 'ALTERNATION',
    ONE_OR_MORE = 'ONE_OR_MORE',
    ZERO_OR_ONE = 'ZERO_OR_ONE',
    ZERO_OR_MORE = 'ZERO_OR_MORE',
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN'
}

export class GrammarExprParser {
    private static rules: Array<ILexRule> = [
        { name: TokenType.IDENTIFIER, expression: '[a-zA-Z_]*' },
        { name: TokenType.ALTERNATION, expression: '\\|' },
        { name: TokenType.ONE_OR_MORE, expression: '[+]' },
        { name: TokenType.ZERO_OR_ONE, expression: '[?]' },
        { name: TokenType.ZERO_OR_MORE, expression: '[*]' },
        { name: TokenType.LPAREN, expression: '\\(' },
        { name: TokenType.RPAREN, expression: '\\)' },
        { name: GrammarRuleName.SKIP, expression: '[ \\t\\n]' },
        { name: GrammarRuleName.ERROR, expression: '.' }
    ];

    static parseTree(grammar: IGrammar, expression: string): IGrammarExprNode {
        const tokens: Array<IToken> = [];

        const lexer = new Lexer(this.rules, expression)
        let token = lexer.next();
        while (token.TokenType != 'EOF') {
            tokens.push(token);
            token = lexer.next();
        }

        const exprTree = {
            type: GrammarExprNodeType.ROOT,
            nodes: this.parseInternal({ grammar: grammar, tokens, index: 0, group: 0 }),
            group: 0
        };

        return exprTree;
    }

    private static parseInternal(context: IParseContext): Array<IGrammarExprNode> {
        const nodes: Array<IGrammarExprNode> = [];
        while (context.index < context.tokens.length) {
            let token = context.tokens[context.index];
            let element: IGrammarExprNode | null = null;

            if (token.TokenType == TokenType.RPAREN) {
                return nodes;
            }

            if (token.TokenType == TokenType.LPAREN) {
                context.index++;
                context.group++;
                const groupNumber = context.group;
                const elements2 = this.parseInternal(context);
                element = { type: GrammarExprNodeType.GROUP, nodes: elements2, group: groupNumber };
                if (context.tokens[context.index].TokenType != TokenType.RPAREN)
                    throw new Error('Invalid expression');

                context.index++;
                this.quantifier(context, element);
            } else if (token.TokenType == TokenType.ALTERNATION) {
                element = { type: GrammarExprNodeType.ALTERNATION, value: token.value };
                context.index++;
            } else {
                let nodeType: GrammarExprNodeType | null = null;
                if (context.grammar.tokens.find((item) => item.name == token.value)) {
                    nodeType = GrammarExprNodeType.TOKEN;
                } else if (context.grammar.productions.find((item) => item.name == token.value)) {
                    nodeType = GrammarExprNodeType.NON_TERMINAL;
                } else {
                    throw new Error(`Invalid identifier '${token.value}' in grammar expression.`);
                }

                element = { type: nodeType, value: token.value };
                context.index++;
                this.quantifier(context, element);
            }

            nodes.push(element);
        }

        return nodes;
    }

    private static quantifier(context: IParseContext, node: IGrammarExprNode) {
        let token = context.tokens[context.index];

        if (token)
            switch (token.TokenType) {
                case TokenType.ZERO_OR_MORE:
                    node.quantifier = { min: 0, max: null };
                    context.index++;
                    break;
                case TokenType.ZERO_OR_ONE:
                    node.quantifier = { min: 0, max: 1 };
                    context.index++;
                    break;
                case TokenType.ONE_OR_MORE:
                    node.quantifier = { min: 1, max: null };
                    context.index++;
                    break;
            }
    }
}