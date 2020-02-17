import { IParseTreeNode } from "./grammar-modals";

export interface IASTNode {
    type: string;
    [key: string]: any;
}

export interface IASTTransformer {
    transformToken: (node: IParseTreeNode, parent: IParseTreeNode | null) => IASTNode;
    productions: IASTProductionsTransformer;
}

export interface IASTProductionsTransformer {
    [key: string]: (nodes: Array<IASTNode>, parent: IASTNode | null) => IASTNode;
}

export interface IASTVisitor {
    [key: string]: IASTNodeVisitor;
}

export interface IASTNodeVisitor {
    enter(node: IASTNode, parentNode: IASTNode | null): void;
    exit(node: IASTNode, parentNode: IASTNode | null): void;
}

