import { INumberRef } from "../models/number-ref.model";
import { INode } from "../models/node.model";
import { NodeType } from "../enums/node-type.enum";
import { TokenType } from "../enums/token-type.enum";
import { IQuantifier } from "../models/quantifier.model";
import { Labels } from "../constants/labels";

export class Transformer {
    static transform(root: INode, group: INumberRef): INode {
        return this.transformNode(root, NodeType.ROOT, group);
    }

    private static transformNode(node: INode, parentType: NodeType, group: INumberRef): INode {
        switch (node.type) {
            case NodeType.ROOT:
                return this.transformRoot(node, group);
            case NodeType.GROUP:
                group.value++;
                return this.transformGroup(node, group);
            case NodeType.CHARACTER_SET:
                return this.transformCharacterSet(node, group);
            case NodeType.RANGE:
                return this.transformRange(node);
            case NodeType.VALUE:
                return this.transformCharacter(node, parentType, group);
            case NodeType.ALTERNATE_SET:
                return this.transformAlternateSet(node, group);
            default:
                throw new Error(Labels.NotImplemented);
        }
    }

    private static transformArray(nodes: Array<INode>, parentType: NodeType, group: INumberRef): Array<INode> {
        const astNodes: Array<INode> = [];
        for (let i = 0; i < nodes.length; i++) {
            astNodes.push(this.transformNode(nodes[i], parentType, group));
        }

        return astNodes;
    }

    private static transformRoot(node: INode, group: INumberRef): INode {
        const astNode: INode = {
            type: NodeType.ROOT,
        }

        if (node.nodes)
            astNode.nodes = this.transformArray(node.nodes, astNode.type, group);

        if (node.alternate)
            astNode.alternate = this.transformNode(node.alternate, astNode.type, group);

        return astNode;
    }

    private static transformAlternateSet(node: INode, group: INumberRef): INode {
        const astNode: INode = {
            type: NodeType.ALTERNATE_SET,
        }

        if (node.nodes)
            astNode.nodes = this.transformArray(node.nodes, astNode.type, group);

        if (node.alternate)
            astNode.alternate = this.transformNode(node.alternate, astNode.type, group);

        return astNode;
    }

    private static transformGroup(node: INode, group: INumberRef): INode {
        const astNode: INode = { type: NodeType.GROUP, group: group.value };
        this.setQuantifier(astNode, node.quantifier);

        if (node.nodes)
            astNode.nodes = this.transformArray(node.nodes, astNode.type, group);

        if (node.alternate)
            astNode.alternate = this.transformNode(node.alternate, astNode.type, group);

        return astNode;
    }

    private static transformCharacterSet(node: INode, group: INumberRef): INode {
        const astNode: INode = { type: NodeType.CHARACTER_SET };
        this.setQuantifier(astNode, node.quantifier);

        if (node.nodes) {
            const [first] = node.nodes;
            if (first && first.tokenType == TokenType.CARET) {
                astNode.negated = true;
                astNode.nodes = this.transformArray(node.nodes.splice(1), astNode.type, group);
            } else
                astNode.nodes = this.transformArray(node.nodes, astNode.type, group);
        }

        if (node.alternate)
            astNode.alternate = this.transformNode(node.alternate, astNode.type, group);

        return astNode;
    }

    private static transformRange(node: INode): INode {
        const astNode: INode = {
            type: NodeType.RANGE,
        }

        if (node.nodes && node.nodes.length == 2) {
            const [from, to] = node.nodes;
            if (from.tokenType != TokenType.VALUE || to.tokenType != TokenType.VALUE)
                throw new Error(Labels.InvalidRange);
            astNode.from = from.value;
            astNode.to = to.value;
        } else {
            throw new Error(Labels.InvalidRange);
        }

        return astNode;
    }

    private static transformCharacter(node: INode, parentType: NodeType, group: INumberRef): INode {
        const astNode: INode = { type: NodeType.VALUE, value: node.value };
        this.setQuantifier(astNode, node.quantifier);

        if (!node.tokenType || node.nodes)
            throw new Error(Labels.InvalidExpression);

        if (node.alternate)
            astNode.alternate = this.transformNode(node.alternate, astNode.type, group);

        return astNode;
    }

    private static setQuantifier(node: INode, quantifier: IQuantifier | undefined) {
        if (!quantifier || (quantifier.min == 1 && quantifier.max == 1))
            return;
        node.quantifier = quantifier;
    }

}