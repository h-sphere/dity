import { asClass, asFactory, asFunction, containerBuilder } from "../../src/di";
import { fn } from "./function";
import { MODULE_NAME } from "./injector";
import { NowFactory } from "./now";

export type ACCURACY = 'full' | 'reduced'

export const helpersModule = containerBuilder(c => c.named(MODULE_NAME)
    .register({
        now: asClass(NowFactory),
        num: 1234 as number,
        accuracy: 'full' as ACCURACY
}))
export type HELPER_DEPS = typeof helpersModule