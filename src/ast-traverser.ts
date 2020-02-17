import { IASTNode, IASTVisitor } from "./ast-models";

export class ASTTraverser {
    static traverse(ast : IASTNode, visitor: IASTVisitor) {
        return this.traverseNode(ast, null, visitor);
    }

    private static traverseNode(node: IASTNode, parent: IASTNode | null, visitor: IASTVisitor) {
        if (!visitor)
            return;

        let method = visitor[node.type];
        if (method && method.enter) method.enter(node, parent);
        switch (node.type) {
            case 'Program':
                this.traverseNodes(node.body, node, visitor);
                break;
            case 'Identifier':
            case 'NumberLiteral':
                break;
            case 'BinaryExpression':
                this.traverseNode(node.left, node, visitor);
                this.traverseNode(node.right, node, visitor);
                break;
            case 'UnaryExpression':
                this.traverseNode(node.expression, node, visitor);
                break;
            case 'ExpressionStatement':
                this.traverseNode(node.expression, node, visitor);
                break;
            case 'AssignmentExpression':
                this.traverseNode(node.left, node, visitor);
                this.traverseNode(node.right, node, visitor);
                break;
        }

        if (method && method.exit) method.exit(node, parent);
    }

    private static traverseNodes(nodes: Array<IASTNode>, parent: IASTNode | null, visitor: IASTVisitor) {
        if (!visitor)
            return;
            
        for (let i = 0; i < nodes.length; i++) {
            this.traverseNode(nodes[i], parent, visitor);
        }
    }
}