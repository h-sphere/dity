import { mainModule } from "."
import { makeInjector } from "../../../src"
import { NowFactory } from "../helpers/now"

@(makeInjector<typeof mainModule>()([
    'helpers.now'
]))
export class InitFactory {
    make(now: NowFactory) {
        return () => {
            return 'Starting app at ' + now.now()
        }
    }
}