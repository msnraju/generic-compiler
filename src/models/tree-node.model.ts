export interface ITreeNode {
    type: string;
    nodes?: Array<ITreeNode>;
    value?: string;
    [key: string]: any;
}
