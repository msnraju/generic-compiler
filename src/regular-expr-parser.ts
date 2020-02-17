// This should use lexer

export enum RegularExprNodeType {
    ROOT = 'ROOT',
    GROUP = 'GROUP',
    CHARACTER_SET = 'CHARACTER_SET',
    CHARACTER = 'CHARACTER',
    ALTERNATION = 'ALTERNATION',
    DOT = 'DOT',
    WORD_BOUNDARY = 'WORD_BOUNDARY',
    WHITESPACE = 'WHITESPACE',
    NOT_WHITESPACE = 'NOT_WHITESPACE',
    WORD = 'WORD',
    NOT_WORD = 'NOT_WORD',
    DIGIT = 'DIGIT',
    NOT_DIGIT = 'NOT_DIGIT',
    RANGE = 'RANGE'
}

export interface IRegularExprQuantifier {
    min: number | null;
    max: number | null;
}

export interface IRegularExprNode {
    type: RegularExprNodeType;
    nodes?: Array<IRegularExprNode>;
    value?: string;
    valueTo?: string;
    quantifier?: IRegularExprQuantifier;
    negated?: boolean;

    group?: number;
}

export class RegularExprParser {
    static parse(expression: string): IRegularExprNode {
        return {
            type: RegularExprNodeType.ROOT,
            nodes: this.parseInternal(expression, { value: 0 }, { value: 0 }, RegularExprNodeType.ROOT),
            group: 0
        };
    }

    private static quantifier(expression: string, start: { value: number }, node: IRegularExprNode) {
        let char = expression[start.value];
        if (/[*?+]/.test(char)) {
            start.value++;
            switch (char) {
                case '*':
                    node.quantifier = { min: 0, max: null };
                    break;
                case '?':
                    node.quantifier = { min: 0, max: 1 };
                    break;
                case '+':
                    node.quantifier = { min: 1, max: null };
                    break;
            }
        } else if (/[{]/.test(char)) {
            let valid = true;
            const start2 = { ...start };

            char = expression[++start2.value];
            let values: number[] = [];
            while (start2.value < expression.length && char != '}') {
                if (/\d*/.test(char)) {
                    values.push(Number(char));
                    char = expression[++start2.value];
                } else {
                    valid = false;
                    break;
                }

                if (char == ',')
                    char = expression[++start2.value];
            }

            if (char != '}' || values.length == 0 || values.length > 2) {
                valid = false;
            }

            if (valid) {
                start.value = start2.value + 1;
                if (values.length == 1)
                    node.quantifier = { min: values[0], max: values[0] };
                else
                    node.quantifier = { min: values[0] < values[1] ? values[0] : values[1], max: values[0] > values[1] ? values[0] : values[1] };
            }
        }
    }

    private static parseInternal(
        expression: string,
        start: { value: number },
        group: { value: number },
        parentType: RegularExprNodeType): Array<IRegularExprNode> {
        const elements: Array<IRegularExprNode> = [];
        while (start.value < expression.length) {
            let char = expression[start.value];
            let element: IRegularExprNode | null = null;

            if (/[)\]]/.test(char)) {
                return elements;
            }

            let negated = parentType == RegularExprNodeType.CHARACTER_SET && expression[start.value] == '^' ?
                true : false;
            if (negated) char = expression[++start.value];

            if (parentType != RegularExprNodeType.CHARACTER_SET) {
                if (/\(/.test(char)) {
                    start.value++;
                    group.value++;
                    const groupNumber = group.value;
                    const elements2 = this.parseInternal(expression, start, group, RegularExprNodeType.GROUP);
                    element = { type: RegularExprNodeType.GROUP, nodes: elements2, group: groupNumber };
                    if (expression[start.value] != ')')
                        throw new Error('Invalid expression');
                    start.value++;
                    this.quantifier(expression, start, element);
                } else if (/\[/.test(char)) {
                    start.value++;
                    const elements2 = this.parseInternal(expression, start, group, RegularExprNodeType.CHARACTER_SET);
                    if (expression[start.value] != ']')
                        throw new Error('Invalid expression');
                    start.value++;

                    element = { type: RegularExprNodeType.CHARACTER_SET, nodes: elements2 };

                    this.quantifier(expression, start, element);
                } else if (char == '.') {
                    element = { type: RegularExprNodeType.DOT, value: char };
                    start.value++;
                    this.quantifier(expression, start, element);
                } else if (char == '|') {
                    element = { type: RegularExprNodeType.ALTERNATION, value: char };
                    start.value++;
                }
            } else {
                const rangeChar = expression.length > start.value + 1 ? expression[start.value + 1] : '';
                const nextChar = expression.length > start.value + 2 ? expression[start.value + 2] : '';
                if (rangeChar == '-') {
                    element = { type: RegularExprNodeType.RANGE, value: char, valueTo: nextChar };
                    start.value += 3;
                }
            }

            if (element == null) {
                if (char == '\\') {
                    const nextChar = expression.length > start.value + 1 ? expression[start.value + 1] : '';
                    // Escaped characters
                    if (/[tnvfr0]/i.test(nextChar)) {
                        switch (nextChar.toLowerCase()) {
                            case 't':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\t' };
                                break;
                            case 'n':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\n' };
                                break;
                            case 'v':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\v' };
                                break;
                            case 'f':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\f' };
                                break;
                            case 'r':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\r' };
                                break;
                            case '0':
                                element = { type: RegularExprNodeType.CHARACTER, value: '\0' };
                                break;
                            default:
                                throw new Error('Invalid character');
                        }
                        // Anchors    
                    } else if (/[bB]/.test(nextChar)) {
                        switch (nextChar) {
                            case 'b':
                                element = { type: RegularExprNodeType.WORD_BOUNDARY, value: 'b' };
                                break;
                            default:
                                throw new Error('Invalid character');
                        }
                    } else if (/[sSdDwW]/.test(nextChar)) {
                        switch (nextChar) {
                            case 's':
                                element = { type: RegularExprNodeType.WHITESPACE, value: 's' };
                                break;
                            case 'S':
                                element = { type: RegularExprNodeType.NOT_WHITESPACE, value: 'S' };
                                break;
                            case 'w':
                                element = { type: RegularExprNodeType.WORD, value: 'w' };
                                break;
                            case 'W':
                                element = { type: RegularExprNodeType.NOT_WORD, value: 'W' };
                                break;
                            case 'd':
                                element = { type: RegularExprNodeType.DIGIT, value: 'd' };
                                break;
                            case 'D':
                                element = { type: RegularExprNodeType.NOT_DIGIT, value: 'D' };
                                break;
                            default:
                                throw new Error('Invalid character');
                        }
                    } else {
                        element = { type: RegularExprNodeType.CHARACTER, value: nextChar };
                    }

                    start.value += 2;
                    this.quantifier(expression, start, element);
                } else {
                    element = { type: RegularExprNodeType.CHARACTER, value: char };
                    start.value++;
                    this.quantifier(expression, start, element);
                }

            }

            if (negated)
                element.negated = true;
                
            elements.push(element);
        }

        return elements;
    }
}