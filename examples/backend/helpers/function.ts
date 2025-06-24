import { HELPER_DEPS } from ".";
import { makeInjector } from "../../../src";
import { functionInjector } from "./injector";

@(makeInjector<HELPER_DEPS>()([
    'accuracy',
    'num'
]))
export class Sum {
    make(a: number, b: number) {
        return a + b
    }
}
