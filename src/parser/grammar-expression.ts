import { ExpressionParser } from "./expression-parser";
import { Transformer } from "./transformer";

import { INumberRef } from "../models/number-ref.model";
import { INode } from "../models/node.model";
import { NodeType } from "../enums/node-type.enum";
import { Labels } from "../constants/labels";
import { ICompiledLexRules } from "../models/compiled-lex-rules.model";
import { ICompiledProductionRules } from "../models/compiled-production-rules.model";
import { RegExpression } from "@msnraju/reg-expressions";
import { ICodeParserResult } from "../models/code-parser-result.model";

interface IContext {
    index: INumberRef;
    node: INode;
    input: string;
    match: ICodeParserResult;
}

export class GrammarExpression {
    private expression: string;
    private syntaxTree: INode | undefined;
    private lexRules: ICompiledLexRules;
    private prodRules: ICompiledProductionRules;
    private ignoreExpression: RegExpression;

    constructor(expression: string, lexRules: ICompiledLexRules, prodRules: ICompiledProductionRules) {
        this.expression = expression;
        this.lexRules = lexRules;
        this.prodRules = prodRules;
        this.ignoreExpression = new RegExpression('[\\s\\r\\n]*');
    }

    getSyntaxTree(): INode {
        if (!this.syntaxTree) {
            const group: INumberRef = { value: 0 };
            this.syntaxTree = Transformer.transform(ExpressionParser.parse(this.expression), group);
        }

        return this.syntaxTree;
    }

    match(input: string, index: number = 0): ICodeParserResult {
        this.getSyntaxTree();
        const match: ICodeParserResult = { length: 0, node: { type: 'ROOT', nodes: [] } };

        const context: IContext = {
            index: { value: index },
            node: this.syntaxTree as INode,
            input: input,
            match: match
        };

        if (this.walk(context))
            return match;

        return match;
    }

    private walk(context: IContext): boolean {
        const { index, node, input } = context;
        const startIndex = index.value;
        if (index.value < input.length) {
            switch (node.type) {
                case NodeType.ROOT:
                    if (this.checkQuantifier(context, this.matchNodes)) {
                        context.match.length = index.value - startIndex;
                        return true;
                    } else
                        return false;
                case NodeType.GROUP:
                    return this.checkQuantifier(context, this.matchNodes);
                case NodeType.ALTERNATE_SET:
                    return this.checkQuantifier(context, this.matchNodes);
                case NodeType.VALUE:
                    return this.checkQuantifier(context, this.matchValue);
                case NodeType.CHARACTER_SET:
                    return this.checkQuantifier(context, this.matchCharacterSet);
                default:
                    throw new Error(Labels.NotImplemented);
            }
        }

        return false;
    }

    private checkQuantifier(context: IContext, matchFunction: (context: IContext) => boolean): boolean {
        const { index, node, input } = context;
        const startIndex = index.value;
        let matchCounter = 0;
        let min: number = 1;
        let max: number = input.length;

        if (!node.quantifier) {
            max = 1;
        } else {
            min = node.quantifier.min;
            max = node.quantifier.max || input.length;
        }

        while (matchCounter < max && matchFunction.bind(this)(context))
            matchCounter++;

        if (matchCounter == 0 && node.alternate)
            if (this.walk({ ...context, node: node.alternate }))
                return true;

        if (matchCounter >= min && matchCounter <= max)
            return true;

        index.value = startIndex;
        return false;
    }

    private matchCharacterSet(context: IContext): boolean {
        const { index, node, input } = context;
        const startIndex = index.value;

        if (!node.nodes)
            return false;

        let i = 0
        if (!node.negated) {
            for (; i < node.nodes.length; i++) {
                if (this.walk({ ...context, node: node.nodes[i] }))
                    break;
            }

            if (i != node.nodes.length)
                return true;
        } else {
            for (; i < node.nodes.length; i++) {
                if (this.walk({ ...context, node: node.nodes[i] }))
                    break;
            }

            if (startIndex == index.value) {
                index.value++;
                return true;
            }
        }

        index.value = startIndex;
        return false;
    }

    private matchValue(context: IContext): boolean {
        const { index, node, input } = context;
        const startIndex = index.value;
        this.ignoreWhiteSpaces(input, index);

        if (node.value == 'TRIGGER')
            console.log();

        if (this.lexRules[node.value]) {
            const match = this.lexRules[node.value].match(input, index.value);
            if (match.length > 0) {
                if (context.match.node.nodes)
                    context.match.node.nodes.push({ type: node.value, value: match[0], index: index.value });

                index.value += match.length;
                return true;
            }
        } else if (this.prodRules[node.value]) {
            const match = this.prodRules[node.value].match(input, index.value);
            if (match.length > 0) {
                index.value += match.length;

                if (context.match.node.nodes) {
                    match.node.type = node.value;
                    context.match.node.nodes.push(match.node);
                }

                return true;
            }
        } else {
            throw new Error(`Rule not found for ${node.value}`);
        }

        index.value = startIndex;
        return false;
    }

    private ignoreWhiteSpaces(input: string, index: INumberRef) {
        const match = this.ignoreExpression.match(input, index.value);
        if (match) index.value += match.length;
    }

    private matchNodes(context: IContext): boolean {
        const { index, node } = context;
        const startIndex = index.value;
        let i = 0;

        for (i = 0; node.nodes && i < node.nodes.length; i++) {
            if (!this.walk({ ...context, node: node.nodes[i] }))
                break;
        }

        if (node.nodes && i == node.nodes.length)
            return true;

        return false;
    }
}