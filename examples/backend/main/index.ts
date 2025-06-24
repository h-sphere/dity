import { asFactory, buildContainer } from "../../../src";
import { helpersModule } from "../helpers";
import { InitFactory } from "./init";

export const mainModule = buildContainer(c => c
    .register({
    init: asFactory(InitFactory),
}).submodules({
    helpers: helpersModule
}))
export type MAIN_DEPS = typeof mainModule