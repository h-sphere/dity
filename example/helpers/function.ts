import { asFunction } from "../../src/di";
import { functionInjector } from "./injector";

export const fn = functionInjector(
    'num',
    'num'
)((a, b) => a + b)

console.log('AS FUNCTION', asFunction(fn))