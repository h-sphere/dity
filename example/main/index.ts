import { containerBuilder } from "../../src";
import { helpersModule } from "../helpers";
import { InitFactory } from "./init";
import { MODULE_NAME } from "./mainInjector";

export const mainModule = containerBuilder(MODULE_NAME, c => c
    .register({
    // init: asFactory(new InitFactory),
})//.registerSubmodules({
//    helpers: helpersModule
//}))
)
export type MAIN_DEPS = typeof mainModule