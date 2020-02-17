# Generic Compiler
Generic Compiler takes Grammar and Code as input and converts into target language. 

## Sequence of steps :
- Tokenize
- Parse Tree
- Abstract Syntax Tree
- Transform AST
- Code Generation


## Installation

```sh
npm install @msnraju/generic-compiler

```

## APIs (only important classes and functions)
### Lexer
```
next() : IToken

returns:
IToken

If value of type equals 'EOF' meaning reacted to the end and no more tokens.
```

### GrammarParser
```
parseTree(grammar, code): IParseTree 
This function takes grammar and code as arguments and generates Parse Tree.

arguments:
grammar: IGrammar,
code: string

returns: 
IParseTree
```

### ASTTransformer
```
traverse(ast, visitor): void

arguments:
ast: IASTNode
visitor: IASTVisitor

This is helpful to make corrections in AST
```

### CodeGenerator
```
write(writer: ICodeWriter): string;

arguments:
writer: ICodeWriter 
```

## Example

```javascript
const grammar: IGrammar = {
    start: 'PROGRAM',
    tokens: [
        { name: 'ID', expression: '[a-zA-Z]+' },
        { name: 'INTEGER', expression: '[0-9]+' },
        { name: 'PLUS', expression: '[+]' },
        { name: 'MINUS', expression: '[-]' },
        { name: 'MUL', expression: '[*]' },
        { name: 'DIV', expression: '[/]' },
        { name: 'LPAREN', expression: '\\(' },
        { name: 'RPAREN', expression: '\\)' },
        { name: 'SEMICOLON', expression: ';' },
        { name: 'COMMA', expression: ',' },
        { name: 'DOT', expression: '\\.' },
        { name: 'ASSIGNMENT', expression: ':=' },
        { name: GrammarRuleName.SKIP, expression: '[ \\t\\n]' },
        { name: GrammarRuleName.ERROR, expression: '.' }
    ],
    productions: [
        { name: 'VARIABLE', expression: 'ID' },
        { name: 'FACTOR', expression: `PLUS FACTOR | MINUS FACTOR | INTEGER | LPAREN EXPR RPAREN | MEMBER_EXPRESSION | VARIABLE` },
        { name: 'TERM', expression: 'FACTOR ((MUL | DIV) FACTOR)*' },
        { name: 'EXPR', expression: 'CALL_EXPRESSION | TERM ((PLUS | MINUS) TERM)*' },
        { name: 'PROGRAM', expression: 'STATEMENT (SEMICOLON STATEMENT)* SEMICOLON' },
        { name: 'STATEMENT', expression: 'ASSIGNMENT_EXPR | EXPR' },
        { name: 'ASSIGNMENT_EXPR', expression: '(MEMBER_EXPRESSION | VARIABLE) ASSIGNMENT EXPR' },
        { name: 'CALL_EXPRESSION', expression: 'MEMBER_EXPRESSION LPAREN (EXPR (COMMA EXPR)*)? RPAREN' },
        { name: 'MEMBER_EXPRESSION', expression: 'VARIABLE (DOT VARIABLE)+' },
    ]
};

const transformer: IASTTransformer = {
    transformToken(node) {
        switch (node.type) {
            case 'ASSIGNMENT':
            case 'PLUS':
            case 'MINUS':
            case 'DIV':
            case 'MUL':
            case 'LPAREN':
            case 'RPAREN':
            case 'COMMA':
            case 'DOT':
                return { type: node.type, value: node.value };
            case 'SEMICOLON':
                return { type: GrammarRuleName.SKIP };
            case 'INTEGER':
                return { type: "NumberLiteral", value: Number(node.value) };
            case 'ID':
                return { type: "Identifier", name: node.value };
            default:
                return { type: '' };
        }
    },

    productions: {
        PROGRAM: (nodes) => { return { type: "Program", body: nodes } },
        VARIABLE: (nodes) => {
            const [variable, shouldBeEmpty] = nodes;
            if (variable && !shouldBeEmpty)
                return variable;

            throw new Error('Error in converting VARIABLE to ASTNode');
        },
        TERM: (nodes) => {
            const [left, middle, right] = nodes;
            if (left && middle && right && (middle.type == 'MUL' || middle.type == 'DIV'))
                return { type: "BinaryExpression", operator: middle.value, left: left, right: right };
            else if (left && !middle && !right)
                return left;

            throw new Error('Error in converting TERM to ASTNode');
        },
        FACTOR: (nodes) => {
            const [left, middle, right] = nodes;

            if (left && middle && right && left.value == '(' && right.value == ')')
                return middle;
            else if (left && middle && !right && (left.type == 'PLUS' || left.type == 'MINUS'))
                return { type: "UnaryExpression", operator: left.value, expression: middle };
            else if (left && !middle && !right)
                return left;

            throw new Error('Error in converting FACTOR to ASTNode');
        },
        ASSIGNMENT_EXPR: (nodes) => {
            const [left, middle, right] = nodes;

            if (left && middle && right && middle.type == 'ASSIGNMENT')
                return { type: "AssignmentExpression", operator: middle.value, left: left, right: right };

            throw new Error('Error in converting ASSIGNMENT_EXPR to ASTNode');
        },
        EXPR: (nodes) => {
            const [left, middle, right] = nodes;
            if (left && !middle && !right)
                return left;
            else if (left && middle && right && middle.type == 'PLUS' || middle.type == 'MINUS')
                return { type: "BinaryExpression", operator: middle.value, left: left, right: right };

            throw new Error('Error in converting EXPR to ASTNode');
        },
        STATEMENT: (nodes) => {
            const [expr] = nodes;
            if (expr)
                return { type: "ExpressionStatement", expression: expr };

            throw new Error('Error in converting STATEMENT to ASTNode');
        },

        MEMBER_EXPRESSION: (nodes) => {
            const [object, dot, property] = nodes;
            if (dot.type == 'DOT')
                return { type: "MemberExpression", object: object, property: property }
            throw new Error('Error in converting MEMBER_EXPRESSION to ASTNode');
        },

        CALL_EXPRESSION: (nodes) => {
            const [callee, lparen] = nodes;
            if (lparen.type == 'LPAREN') {
                const args: Array<IASTNode> = [];
                for (let i = 2; i < nodes.length - 1; i++) {
                    args.push(nodes[i]);
                    if (nodes[i + 1].type == 'COMMA')
                        i++;
                }

                if (nodes[nodes.length - 1].type != 'RPAREN')
                    throw new Error('Error in converting CALL_EXPRESSION to ASTNode');

                return { type: "CallExpression", callee: callee, arguments: args };
            }

            throw new Error('Error in converting CALL_EXPRESSION to ASTNode');
        }
    }
};

const visitor: IASTVisitor = {
    Identifier: {
        enter: () => { },
        exit: (node: IASTNode, parentNode: any) => {
            if (parentNode.type == 'ExpressionStatement' && node.type == 'Identifier') {
                const newNode = {
                    type: 'CallExpression',
                    callee: { ...node },
                    arguments: []
                };
                parentNode.expression = newNode;
            }
        }
    }
};

const writer: ICodeWriter = {
    Program: (node, writer) => {
        return node.body.map((node2: IASTNode) => writer.write(node2)).join(';\n');
    },

    ExpressionStatement: (node, writer) => {
        return writer.write(node.expression);
    },

    AssignmentExpression: (node, writer) => {
        return `${writer.write(node.left)} = ${writer.write(node.right)}`
    },

    Identifier: (node) => {
        return node.name;
    },

    MemberExpression: (node, writer) => {
        return `${writer.write(node.object)}.${writer.write(node.property)}`;
    },

    CallExpression: (node, writer) => {
        return `${writer.write(node.callee)}(${
            node.arguments.map((node2: IASTNode) => writer.write(node2)).join(',')
            })`;
    },

    BinaryExpression: (node, writer) => {
        return `${writer.write(node.left)} ${node.operator} ${writer.write(node.right)}`;
    },

    NumberLiteral: (node) => {
        return node.value;
    }
}


const code = `
    x;
    b :=  customer.age + 1;
    customer.age := a + 40;
    a.print();
`;

const parseTree = GrammarParser.parseTree(grammar, code);
const ast = ASTTransformer.transform(parseTree, transformer);
ASTTraverser.traverse(ast, visitor);
const codeWriter = new CodeGenerator(writer);
const newCode = codeWriter.write(ast);

console.log(newCode);

```

### Generated Output

```sh
x();
b = customer.age + 1;
customer.age = a + 40;
a.print()
```