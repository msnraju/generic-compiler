import { IParseTreeNode } from "./grammar-modals";
import { IASTNode, IASTTransformer } from "./ast-models";
import { RuleName } from "@msnraju/lexer";

export class ASTTransformer {
    static transform(parseTree: IParseTreeNode, transformer: IASTTransformer) {
        const ast = this.walk(parseTree, transformer);
        return ast;
    }

    private static walk(parseTree: IParseTreeNode, transformer: IASTTransformer): IASTNode {
        const astNodes: Array<IASTNode> = [];

        for (let i = 0; parseTree.nodes && i < parseTree.nodes.length; i++) {
            const node = parseTree.nodes[i];
            let astNode = transformer.transformToken(node, parseTree);
            if (astNode.type == '') {
                astNode = this.walk(node, transformer);
            }

            if (astNode.type !== RuleName.SKIP)
                astNodes.push(astNode);
        }

        if (transformer.productions[parseTree.type])
            return transformer.productions[parseTree.type](astNodes, parseTree)

        throw new Error(`Type ${parseTree.type} not handled.`);
    }
}