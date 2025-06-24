import { asClass, asFactory, buildContainer } from "../../../src";
import { Sum } from "./function";
import { NowFactory } from "./now";

export type ACCURACY = 'full' | 'reduced'

export const helpersModule = buildContainer(c => c
    .register({
        now: asClass(NowFactory),
        num: 1234 as number,
        accuracy: 'full' as ACCURACY,
        fn: asFactory(Sum)
}))
export type HELPER_DEPS = typeof helpersModule