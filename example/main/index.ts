import { asFactory, containerBuilder } from "../../src/di";
import { helpersModule } from "../helpers";
import { InitFactory } from "./init";
import { MODULE_NAME } from "./mainInjector";

export const mainModule = containerBuilder(c => c
    .named(MODULE_NAME)
    .register({
    init: asFactory(new InitFactory),
}).registerSubmodules({
    helpers: helpersModule
}))

export type MAIN_DEPS = typeof mainModule