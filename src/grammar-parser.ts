import { GrammarExprParser } from "./grammar-expr-parser";
import Lexer, { IToken, ILexRule } from "./lexer";
import { IGrammarExprNode, GrammarExprNodeType, IGrammar, IParseTreeNode, GrammarRuleName } from "./grammar-modals";

interface IGetNodeResult {
    detail?: {
        node: IParseTreeNode;
        tokensMatched: number;
    },

    result: boolean;
}

interface IGetNodeContext {
    grammar: IGrammar;
    tokens: Array<IToken>;
    prodExprNodes: Array<IProductionExpr>;
}

interface IProductionExpr {
    name: string;
    exprTree: IGrammarExprNode;
}

export default class GrammarParser {
    static parseTree(grammar: IGrammar, code: string): IParseTreeNode {
        const tokens: Array<IToken> = this.getTokens(grammar.tokens, code);
        const prodExprNodes = this.prepareGrammar(grammar);

        const exprNode = prodExprNodes.find((item) => item.name == grammar.start)?.exprTree;
        if (exprNode == null)
            throw new Error(`Internal Error, Start production '${grammar.start}' not found.`);

        const result = this.getNode({ grammar, tokens, prodExprNodes }, grammar.start, exprNode, 0, 0);
        if (result.result && result.detail) {
            return result.detail.node;
        }

        throw new Error('Failed to generate parse tree.');
    }

    private static prepareGrammar(grammar: IGrammar): Array<IProductionExpr> {
        const prodExprs: Array<IProductionExpr> = [];
        for (let i = 0; i < grammar.productions.length; i++) {
            const production = grammar.productions[i];

            if (grammar.tokens.find((rule) => rule.name == production.name))
                throw new Error(`Production names should be unique across productions and token types, '${production.name}' is declared as Token Type.`);

            const exprTree = GrammarExprParser.parseTree(grammar, production.expression);
            prodExprs.push({
                name: production.name,
                exprTree: exprTree
            });
        }

        return prodExprs;
    }

    private static getTokens(rules: Array<ILexRule>, code: string): Array<IToken> {
        const tokens: Array<IToken> = [];

        const lexer = new Lexer(rules, code);
        let token = lexer.next();
        while (token.TokenType != 'EOF') {
            tokens.push(token);
            token = lexer.next();
        }

        return tokens;
    }

    private static getNode(context: IGetNodeContext, nodeType: string, parentNode: IGrammarExprNode, pos: number, level: number): IGetNodeResult {
        let tokensMatched = 0;
        let childNodes: Array<IParseTreeNode> = [];

        function spaces(count: number) {
            let spaces = '';
            for (let i = 0; i < count; i++)
                spaces += '\t';
            return spaces;
        }

        for (let nodeIndex = 0; parentNode.nodes && nodeIndex < parentNode.nodes.length; nodeIndex++) {
            const node = parentNode.nodes[nodeIndex];
            // console.log(`${spaces(level)}${node.value}    -    ${node.type}`);

            const max = node.quantifier ? node.quantifier.max || context.tokens.length : 1;
            const min = node.quantifier ? node.quantifier.min || 0 : 1;
            let quantity = 0;

            switch (node.type) {
                case GrammarExprNodeType.GROUP: {
                    let nodes: Array<IParseTreeNode> = [];
                    let result = this.getNode(context, node.type, node, pos + tokensMatched, level + 1);

                    while (result.result && result.detail) {
                        tokensMatched += result.detail.tokensMatched || 0;
                        quantity++;
                        if (result.detail.node.nodes)
                            nodes.push(...result.detail.node.nodes);

                        if (quantity < max)
                            result = this.getNode(context, node.type, node, pos + tokensMatched, level + 1);
                        else
                            break;
                    }

                    if (quantity >= min)
                        childNodes.push(...nodes);

                    break;
                } case GrammarExprNodeType.NON_TERMINAL: {
                    let nodes: Array<IParseTreeNode> = [];

                    const exprNode = context.prodExprNodes.find((item) => item.name == node.value)?.exprTree;
                    if (exprNode == null)
                        throw new Error(`Expression not evaluated for the production '${node.value}'.`);

                    let result = this.getNode(context, node.value || '', exprNode, pos + tokensMatched, level + 1);
                    while (result.result && result.detail) {
                        tokensMatched += result.detail.tokensMatched || 0;
                        quantity++;

                        nodes.push(result.detail.node);

                        if (quantity < max)
                            result = this.getNode(context, node.value || '', exprNode, pos + tokensMatched, level + 1);
                        else
                            break;
                    }

                    if (quantity >= min)
                        childNodes.push(...nodes);
                    break;
                } case GrammarExprNodeType.TOKEN: {
                    let nodes: Array<IParseTreeNode> = [];
                    let token = context.tokens[pos + tokensMatched];

                    while (token && token.TokenType == node.value && quantity < max) {
                        tokensMatched++;
                        quantity++;

                        nodes.push({ type: node.value, value: token.value });
                        token = context.tokens[pos + tokensMatched];
                    }

                    if (quantity >= min)
                        childNodes.push(...nodes);
                    break;
                } case GrammarExprNodeType.ALTERNATION: {
                    break;
                } default:
                    throw new Error(`Unexpected grammar expression type: ${node.type}`);
            }

            if (tokensMatched > 0 && node.type == GrammarExprNodeType.ALTERNATION)
                break;

            if (quantity < min) {
                let x = nodeIndex;
                for (; x < parentNode.nodes.length; x++) {
                    if (parentNode.nodes[x].type == GrammarExprNodeType.ALTERNATION)
                        break;
                }

                // move to alternate
                if (parentNode.nodes[x] && parentNode.nodes[x].type == GrammarExprNodeType.ALTERNATION) {
                    nodeIndex = x;
                    tokensMatched = 0;
                    continue;
                }

                return { result: false };
            }
        }

        return {
            result: true,
            detail: {
                tokensMatched: tokensMatched,
                node: { type: nodeType, nodes: childNodes }
            }
        };
    }
}