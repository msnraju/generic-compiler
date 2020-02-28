import { IToken, Lexer, ILexRule, RuleName } from "@msnraju/lexer";
import { TokenType } from "../enums/token-type.enum";
import { NodeType } from "../enums/node-type.enum";
import { IQuantifier } from "../models/quantifier.model";
import { INumberRef } from "../models/number-ref.model";
import { INode } from "../models/node.model";
import { Labels } from "../constants/labels";

interface IParseContext {
    tokens: Array<IToken>;
    parent: INode;
    index: INumberRef; // parent should get the updated index.
}

const rules: Array<ILexRule> = [
    { name: TokenType.VALUE, expression: /[a-zA-Z_]*/ },
    { name: TokenType.PIPE, expression: /\|/ },
    { name: TokenType.PLUS, expression: /[+]/ },
    { name: TokenType.QUESTION, expression: /[?]/ },
    { name: TokenType.STAR, expression: /[*]/ },
    { name: TokenType.LEFT_PAREN, expression: /\(/ },
    { name: TokenType.RIGHT_PAREN, expression: /\)/ },
    { name: TokenType.LEFT_BRACE, expression: /\{/ },
    { name: TokenType.RIGHT_BRACE, expression: /\}/ },
    { name: TokenType.LEFT_BRACKET, expression: /\[/ },
    { name: TokenType.RIGHT_BRACKET, expression: /\]/ },
    { name: TokenType.COMMA, expression: /,/ },
    { name: RuleName.SKIP, expression: /[ \t\n]/ },
    { name: RuleName.ERROR, expression: /./ }
];

export class ExpressionParser {
    static parse(expression: string): INode {
        const tokens = Lexer.tokens(rules, expression);
        const root: INode = { type: NodeType.ROOT, nodes: [] };

        const context: IParseContext = {
            tokens: tokens,
            parent: root,
            index: { value: 0 }
        };

        this.walk(context);
        return root;
    }

    private static walk(context: IParseContext) {
        const { tokens, index } = context;
        const nodes: Array<INode> = [];

        while (index.value < tokens.length) {
            let token = tokens[index.value];

            if ((context.parent.type == NodeType.RANGE && token.type == TokenType.RIGHT_BRACE) ||
                (context.parent.type == NodeType.GROUP && token.type == TokenType.RIGHT_PAREN) ||
                (context.parent.type == NodeType.ALTERNATE_SET && token.type == TokenType.RIGHT_PAREN) ||
                (context.parent.type == NodeType.CHARACTER_SET && token.type == TokenType.RIGHT_BRACKET))
                break; // return to parent

            if (token.type == TokenType.LEFT_PAREN) {
                token = tokens[++index.value];
                const newNode: INode = { type: NodeType.GROUP, nodes: [] };
                this.walk({ ...context, parent: newNode });

                nodes.push(newNode);
                token = tokens[index.value];
                if (!token || token.type != TokenType.RIGHT_PAREN)
                    throw new Error(Labels.InvalidExpression);

                token = tokens[++index.value];
                this.setQuantifier(context, newNode);
                this.setAlternate(context, context.parent);
                continue;
            }

            if (token.type == TokenType.LEFT_BRACKET) {
                token = tokens[++index.value];
                const newNode: INode = { type: NodeType.CHARACTER_SET, nodes: [] };
                this.walk({ ...context, parent: newNode });
                nodes.push(newNode);

                token = tokens[index.value];
                if (token.type != TokenType.RIGHT_BRACKET)
                    throw new Error(Labels.InvalidExpression);

                token = tokens[++index.value];
                this.setQuantifier(context, newNode);
                this.setAlternate(context, context.parent);
                continue;
            }

            const tokenNode: INode = this.tokenToNode(token);
            nodes.push(tokenNode);
            index.value++;

            if (context.parent.type != NodeType.CHARACTER_SET) {
                this.setQuantifier(context, tokenNode);
                this.setAlternate(context, context.parent);
            }
        }

        context.parent.nodes = nodes;
    }

    private static setAlternate(context: IParseContext, node: INode) {
        const { tokens, index } = context;
        if (index.value >= tokens.length)
            return;

        const token = tokens[index.value];
        if (token.type == TokenType.PIPE) {
            index.value++;

            const newNode: INode = { type: NodeType.ALTERNATE_SET, nodes: [] };
            this.walk({ ...context, parent: newNode });
            node.alternate = newNode;
        }
    }

    private static setQuantifier(context: IParseContext, node: INode) {
        const { tokens, index } = context;
        if (index.value >= tokens.length)
            return;

        let token = tokens[index.value];
        switch (token.type) {
            case TokenType.STAR:
                index.value++;
                node.quantifier = { min: 0, max: null };
                break;
            case TokenType.PLUS:
                index.value++;
                node.quantifier = { min: 1, max: null };
                break;
            case TokenType.QUESTION:
                index.value++;
                node.quantifier = { min: 0, max: 1 };
                break;
            case TokenType.LEFT_BRACE:
                node.quantifier = this.getRangeQuantifier(context);
                break;
            default:
                node.quantifier = { min: 1, max: 1 };
                break;
        }
    }

    private static getRangeQuantifier(context: IParseContext): IQuantifier {
        const { tokens, index } = context;

        const startIndex = index.value;
        let token = tokens[index.value];
        if (token.type != TokenType.LEFT_BRACE)
            throw new Error(Labels.InvalidExpression);

        token = tokens[++index.value];
        const newNode: INode = { type: NodeType.RANGE, nodes: [] };
        this.walk({ ...context, parent: newNode });
        token = tokens[index.value];
        if (token.type != TokenType.RIGHT_BRACE)
            throw new Error(Labels.InvalidExpression);

        index.value++;

        let min: number;
        let max: number;
        const nodes: Array<INode> = newNode.nodes as Array<INode> || [];

        if (nodes.length == 3) {
            const [first, second, third] = nodes;

            if (second && second.tokenType != TokenType.COMMA)
                throw new Error(Labels.InvalidExpression);

            min = first ? Number(first.value) : 0;
            max = third ? Number(third.value) : 0;
            if (min > max)
                throw new Error(Labels.InvalidExpression);
        }
        else if (nodes.length == 1) {
            const [first] = nodes;

            min = first ? Number(first.value) : 0;
            max = min;
        } else {
            min = 1;
            max = 1;
            index.value = startIndex;
        }

        return { min, max };
    }

    private static tokenToNode(token: IToken): INode {
        return { type: NodeType.VALUE, tokenType: token.type, value: token.value };
    }
}