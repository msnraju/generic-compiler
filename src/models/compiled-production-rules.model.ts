import { GrammarExpression } from "../parser/grammar-expression";

export interface ICompiledProductionRules {
    [key: string]: GrammarExpression;
}
