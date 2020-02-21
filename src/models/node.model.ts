import { NodeType } from "../enums/node-type.enum";
import { IQuantifier } from "./quantifier.model";

export interface INode {
    type: NodeType;
    nodes?: Array<INode>;
    quantifier?: IQuantifier;
    tokenType?: string;
    alternate?: INode;
    [key: string]: any;
}
