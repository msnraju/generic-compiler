import { RegularExprParser, IRegularExprNode, RegularExprNodeType } from "./regular-expr-parser";

export interface IRegExpContext {
    pos: number;
    text: string;
}

export interface IRegExpMatch {
    group: number,
    text: string
}

export default class RegularExpression {
    static match(expr: string, text: string): Array<IRegExpMatch> {
        const exprTree = RegularExprParser.parse(expr);
        let matches: Array<IRegExpMatch> = [];
        const result = this.matchInternal(exprTree, text, 0, matches);
        if (result.result) {
            matches.push({ group: 0, text: text.substr(0, result.length) });
            matches = matches.sort((l, r) => l.group - r.group);

            return matches;
        }

        return [];
    }

    static matchFromIndex(expr: string, text: string, index: number): Array<IRegExpMatch> {
        const exprTree = RegularExprParser.parse(expr);
        let matches: Array<IRegExpMatch> = [];
        const result = this.matchInternal(exprTree, text, index, matches);
        if (result.result) {
            matches.push({ group: 0, text: text.substr(index, result.length) });
            matches = matches.sort((l, r) => l.group - r.group);

            return matches;
        }

        return [];
    }

    private static matchInternal(parentNode: IRegularExprNode, text: string, pos: number, matches: Array<IRegExpMatch>): { length: number, result: boolean } {
        let nodeIndex = 0;
        let length = 0;

        function negate(negate: boolean, condition: boolean) {
            if (negate === true)
                return !condition;
            return condition;
        }

        while (parentNode.nodes && nodeIndex < parentNode.nodes.length) {
            const node = parentNode.nodes[nodeIndex];
            const max = node.quantifier ? node.quantifier.max || text.length : 1;
            const min = node.quantifier ? node.quantifier.min || 0 : 1;
            let quantity = 0;
            const negated = node.negated === true;

            switch (node.type) {
                case RegularExprNodeType.GROUP: {
                    const groupStartPos = pos + length;
                    let result = this.matchInternal(node, text, pos + length, matches);
                    while (result.result) {
                        length += result.length;
                        quantity++;

                        if (quantity < max)
                            result = this.matchInternal(node, text, pos + length, matches);
                        else
                            break;
                    }

                    if (node.group && quantity > 0)
                        matches.push({ group: node.group, text: text.substr(groupStartPos, pos + length - groupStartPos) });
                    break;
                } case RegularExprNodeType.CHARACTER_SET: {
                    let result = this.matchInternal(node, text, pos + length, matches);
                    while (result.result && quantity < max) {
                        length += result.length;
                        quantity++;

                        if (quantity < max)
                            result = this.matchInternal(node, text, pos + length, matches);
                        else
                            break;
                    }
                    break;
                } case RegularExprNodeType.CHARACTER: {
                    while (negate(negated, text[pos + length] == node.value) && quantity < max) {
                        length++;
                        quantity++;
                    }

                    break;
                }
                case RegularExprNodeType.RANGE: {
                    const from = node.value || '';
                    const to = node.valueTo || '';
                    while (negate(negated, text[pos + length] >= from && text[pos + length] <= to) && quantity < max) {
                        length++;
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.ALTERNATION: {
                    return { length: length, result: true };
                } case RegularExprNodeType.DOT: {
                    while (negate(negated, (text[pos + length] != '\n' && text[pos + length] != '\r')) && quantity < max) {
                        length++;
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.WORD: {
                    let char = text[pos + length];
                    while (negate(negated, ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z'))) && quantity < max) {
                        length++;
                        char = text[pos + length];
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.DIGIT: {
                    let char = text[pos + length];
                    while (negate(negated, char >= '0' && char <= '9') && quantity < max) {
                        length++;
                        char = text[pos + length];
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.NOT_DIGIT: {
                    let char = text[pos + length];
                    while (negate(negated, char < '0' || char > '9') && quantity < max) {
                        length++;
                        char = text[pos + length];
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.WHITESPACE: {
                    let char = text[pos + length];
                    while (negate(negated, char == ' ') && quantity < max) {
                        length++;
                        char = text[pos + length];
                        quantity++;
                    }
                    break;
                } case RegularExprNodeType.NOT_WHITESPACE: {
                    let char = text[pos + length];
                    while (negate(negated, char != ' ') && quantity < max) {
                        length++;
                        char = text[pos + length];
                        quantity++;
                    }
                    break;
                } default:
                    throw new Error(`Node type: ${node.type}`);
            }

            if (quantity < min && parentNode.type != RegularExprNodeType.CHARACTER_SET) {
                let x = nodeIndex;
                for (; x < parentNode.nodes.length; x++) {
                    if (parentNode.nodes[x].type == RegularExprNodeType.ALTERNATION)
                        break;
                }

                // move to alternate
                if (parentNode.nodes[x] && parentNode.nodes[x].type == RegularExprNodeType.ALTERNATION) {
                    nodeIndex = x + 1;
                    length = 0;
                    continue;
                }

                return { length: 0, result: false };
            } else if (quantity >= min && parentNode.type == RegularExprNodeType.CHARACTER_SET) {
                return { length: length, result: true };
            }


            nodeIndex++;
        }

        return { length: length, result: length > 0 };
    }
}