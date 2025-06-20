import { NowFactory } from "../helpers/now"
import { mainInjector } from "./mainInjector"

export class InitFactory {
    make(@mainInjector('helpers.now') now: NowFactory) {
        return () => {
            return 'Starting app at ' + now.now()
        }
    }
}