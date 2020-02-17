import { IASTNode } from "./ast-models";

export interface ICodeWriter {
    [key: string]: (node: IASTNode, writer: CodeGenerator) => string;
}

export default class CodeGenerator {
    private writer: ICodeWriter;
    constructor(writer: ICodeWriter) {
        this.writer = writer;
    }

    write(node: IASTNode): string {
        if (!this.writer[node.type])
            throw new Error(`Code writer not found for type '${node.type}'.`);

        return this.writer[node.type](node, this);
    }
}