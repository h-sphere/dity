import { buildContainer, ContainerBuilder } from "./builder"
import { makeInjector } from "./injector"
import { asClass, asFactory, asFunction, asValue } from "./wrappers"

describe('Builder', () => {
    it('should properly resolve simple externals', async () => {
        const modA = new ContainerBuilder('').externals<{
            a: number,
            b: string,
            c: number
        }>()

        const modB = new ContainerBuilder('').externals<{
            d: string
        }>()
            .submodules({ modA })
            .resolve('modA.c', 5)
            .resolve('modA.a', 'modA.c')
            .resolve('d', asValue('hello world'))
            .resolve('modA.b', 'd')

        const container = modB.build()
        expect(await container.get('modA.c')).toEqual(5)
        expect(await container.get('modA.a')).toEqual(5)
        expect(await container.get('d')).toEqual('hello world')
        expect(await container.get('modA.b')).toEqual('hello world')
    })

    it('should allow for resolutions on many levels', async () => {
        const modA = new ContainerBuilder('').externals<{
            a: number,
            b: number,
            c: number,
            e: number,
            f: number
        }>().register({ d: 42 })

        const modB = new ContainerBuilder('')
            .submodules({ modA })
            .register({
                a: 1, b: 2, c: 3, d: 4
            })
            .externals<{
                backUp: number
            }>()
            .resolve('modA.a', 'b')
            .resolve('modA.b', 'modA.a')
            .resolve('modA.c', 'modA.b')
            .resolve('backUp', 'modA.c')
            .resolve('modA.e', 'backUp')
            .resolve('modA.f', 'modA.e')

        const container = modB.build()

        expect(await container.get('modA.f')).toEqual(2)
        expect(await container.get('modA.a')).toEqual(2)
    })

    it('should properly define submodules using buildContainer', async () => {
        const helper = buildContainer(c => c.externals<{
            a: number,
            b: string
        }>()
            .register({
                c: 987654,
                d: 'hello world'
            }))

        const main = buildContainer(c => c.submodules({
            helper: helper
        }))

        const container = main
            .resolve('helper.a', 'helper.c')
            .resolve('helper.b', 'helper.d')
            .build()

        // FIXME: references should work.
        expect(await container.get('helper.a')).toEqual(987654)
        expect(await container.get('helper.b')).toEqual('hello world')
        expect(await container.get('helper.c')).toEqual(987654)
        expect(await container.get('helper.d')).toEqual('hello world')
    })

    it('should properly define externals', async () => {

        const submodule = buildContainer(c => c.register({
            a: 5,
            b: 1000,
            c: Date.now()
        }))

        const module = buildContainer(c => c.externals<{
            ext1: string,
            ext2: number
        }>()
            .register({
                out: asClass(Ex3),
                internal: 101
            })
            .resolve('ext1', asValue('hello'))
            .resolve('ext2', 5)
            .submodules({ submodule })
        )

        const inject = makeInjector<typeof module>()


        @inject([
            'ext2',
            'internal',
            'ext2'
        ])
        class Ex3 {
            constructor(private a: number, private b: number, private c: number) {
            }
            compute() {
                return this.a + this.b + this.c
            }
        }

        const container = module.build()
        const val = await container.get('out')
        expect(val).toBeInstanceOf(Ex3)
        expect(val.compute()).toEqual(111)
    })

    it('should define function dependency', async () => {
        const module = buildContainer(c => c.
            register({
                a: 42432,
                b: 'dsadsada',
                c: asFunction(fn)
            })
           )

        const inject = makeInjector<typeof module & {}>()

        const inj = inject(['a', 'b'])

        const fn = inj((a: number, b: string) => {
            return a + ' ' + b
        }) as ((a: number, b: string) => string) // This is the best we can do for now I think

        const c = module.build()

        const res = await c.get('c')
        expect(res).toEqual('42432 dsadsada')

    })

    it('should properly handle dependency with unresolved external', async () => {
        const module = buildContainer(c => c
            .register({
                a: 1234,
                d: asClass(Run)
            })
            .externals<{
                b: number,
                c: string
            }>()
        )

        const inject = makeInjector<typeof module>()

        @inject([
            'a',
            'b',
            'c'
        ])
        class Run {
            constructor(private a: number, private b: number, private c: string) {}
            get() {
                return `${this.a} ${this.b} ${this.c}`
            }
        }

        const container = module
            .resolve('b', 999)
            .resolve('c', asValue('external input'))
            .build()
        const val = await container.get('d')
        expect(val.get()).toEqual('1234 999 external input')
    })

    it('should handle submodules with unresolved externals', async () => {
        const submodule = buildContainer(c => c.externals<{
            dbUrl: string,
            retryTimes: number,
            logger: (message: string) => void
        }>()
        .register({
            compute: asFactory(Compute)
        })
        )

        const inject = makeInjector<typeof submodule>()

        @inject([
            'dbUrl',
            'retryTimes',
            'logger'
        ])
        class Compute {
            make(url: string, retryTimes: number, logger: (message: string) => void) {
                logger(`db url: ${url}. retries: ${retryTimes}`)
                return retryTimes
            }
        }

        const module = buildContainer(c => c.submodules({
            sub: submodule
        }))

        const c = module
            .resolve('sub.dbUrl', asValue('production-url'))
            .resolve('sub.logger', jest.fn((m: string) => console.log('HELLO')))
            .resolve('sub.retryTimes', 5)
            .build()

        const compute = await c.get('sub.compute')

        const val = await c.get('sub.compute')
        expect(val).toEqual(5)
        const logger = await c.get('sub.logger')
        expect(logger).toHaveBeenCalledTimes(1)
        expect(logger).toHaveBeenCalledWith('db url: production-url. retries: 5')
    })

    it('should allow for linking dependencies together', async () => {
        const helper = buildContainer(c => c.register({
            a: 5,
            b: 'hello'
        }).externals<{ c: number }>())

        const main = buildContainer(c => c.register({
            niceNumber: 42
        }).submodules({
            helper: helper
        }))
        .resolve('helper.c', 'niceNumber')
        
        const container = main.build()

        expect(await container.get('helper.c')).toEqual(42)
    })
})