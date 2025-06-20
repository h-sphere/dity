import { containerBuilder } from "./builder"
import { constructorMethod, Container } from "./container"
import { makeInjector } from "./injector"
import { makeExtern } from "./utils"
import { asClass } from "./wrappers"

describe('Container', () => {
    it('should properly resolve container constants', async () => {
        const container = Container[constructorMethod]('main', {
            a: 5,
            b: 10
        }, {})

        expect(await container.get('a')).toEqual(5)
        expect(await container.get('b')).toEqual(10)
    })

    it('should properly resolve class injections', async () => {
        const mod = containerBuilder('main', c => c.register({
            a: 5,
            b: 10,
            c: asClass(SumClass)
        }))

        const injector = makeInjector<typeof mod>('main')

        @injector([
            'a',
            'b',
        ])
        class SumClass {
            constructor(public a: number, public b: number) { }
            compute() { return this.a + this.b }
        }

        const container = mod()
        const c = await container.get('c')
        expect(c).toBeInstanceOf(SumClass)
        expect(c.a).toEqual(5)
        expect(c.b).toEqual(10)
        expect(c.compute()).toEqual(15)
    })

    it('should properly resolve submodules', async () => {
        const helperMod = containerBuilder('helpers', c => c.register({
            date: () => 66436,
            env: 'production'
        }))

        const mainMod = containerBuilder('main', c => c.registerSubmodule({ helper: helperMod }).register({ a: 5, b: 7, init: asClass(Init) }))

        const inject = makeInjector<typeof mainMod>('main');
        
        @inject([
            'helper.date',
            'helper.env'
        ])
        class Init {
            constructor(private date: () => number, private env: string) {

            }

            init() {
                return this.env + ' ' + this.date()
            }
        }

        const container = mainMod()

        const date = await container.get('helper.date')
        const env = await container.get('helper.env')
        expect(date()).toEqual(66436)
        expect(env).toEqual('production')
        const init = await container.get('init')
        expect(init.init()).toEqual('production 66436')
    })

    it('should resolve parent types', async () => {
        const helperModule = containerBuilder('helper', (c => c.register({
            helperA: 5,
            helperB: 10,
            helperC: asClass(HelperC)
        })))

        const helperInjector = makeInjector<typeof helperModule>('helper')

        const timerModule = containerBuilder('timer', (c => c.register({
            timerA: 100,
            timerB: 2000
        })))

        const timerInjector = makeInjector<typeof timerModule>('timer')
    
        const coreExtern = makeExtern<typeof mainModule>('core')

        const mainModule = containerBuilder('core', (c => c.registerSubmodule({
            helper: helperModule,
            timer: timerModule
        })))

        const mainInjector = makeInjector<typeof mainModule>('core')

        @helperInjector([
            coreExtern('timer.timerA'),
            coreExtern('timer.timerB')
        ])
        class HelperC {
            constructor(public timerA: number, public timerB: number) {

            }

            run() {
                return this.timerA + this.timerB
            }
        }

        const container = mainModule()
        const helperC = await container.get('helper.helperC')
        expect(helperC.timerA).toEqual(100)
        expect(helperC.timerB).toEqual(2000)
        expect(helperC.run()).toEqual(2100)

    })

    it('should resolve multiple nested modules', async () => {
        const e = containerBuilder('e', c => c.register({ abc: 'abc result' }))
        const f = containerBuilder('f', c => c.register({ def: 443234}).registerSubmodule({ e }))

        const a = containerBuilder('a', (c => c.register({ k1: 5, k2: 10, k3: 11, extras: asClass(AExtras) })))
        const b = containerBuilder('b', (c => c.register({ k1: 10, k2: 15, k3: 100 }).registerSubmodule({ a })))
        const c = containerBuilder('c', c => c.registerSubmodule({ b }).registerSubmodule({ f }))
        const d = containerBuilder('d', con => con.register({ abc: 'hello' }).registerSubmodule({ c }))

        const aInject = makeInjector<typeof a>('a')
        const cExtern = makeExtern<typeof c>('c')


        @aInject([
            'k1',
            cExtern('f.e.abc')
        ])
        class AExtras {
            constructor(public k: number, public b: string) { }
        }

        const container = d()
        const k3 = await container.get('c.b.a.k3')
        expect(k3).toEqual(11)

        const abc = await container.get('c.f.e.abc')
        expect(abc).toEqual('abc result')

        const withFarExtern = await container.get('c.b.a.extras')
        expect(withFarExtern.b).toEqual('abc result')
        expect(withFarExtern.k).toEqual(5)
    })
})