import { ACCURACY } from ".";
import { DITYWrap } from "../../src/di";
import { extern } from "../main/mainInjector";
import { classInjector, helperInjector } from "./injector";

console.log('EXTERN', extern('helpers.num'))


@classInjector([
    'accuracy',
    extern('helpers.num'),
    'num'
])
class NowFactory {
    constructor(private readonly acc: ACCURACY, second: number, third: number) {
    }

    now() {
        return this.acc + ' 123'
    }
}


type GetDeps<C> = C extends DITYWrap<any, infer D> ? D : never

type DPP = GetDeps<NowFactory>

export {NowFactory}