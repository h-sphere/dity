import { asClass, asFactory, asFunction, Container, containerBuilder, makeInjector } from "./di"

describe.skip('DI Container', () => {
    it('should properly instantiate DI container', async () => {
        const makeContainer = () => {
            return new Container().register({
                test: asClass(Test),
                resourceA: 'hello world',
                databaseUrl: 'https://test.com' as string
            })
        }

        const inject = makeInjector<typeof makeContainer>()

        class Test {
            constructor(
                @inject('resourceA') public readonly a: string,
                @inject('databaseUrl') public readonly url: string
            ) {
            }
        }

        const container = makeContainer()
        expect(await container.get('resourceA')).toEqual('hello world')
        const t = await container.get('test')
        expect(t).toBeInstanceOf(Test)
        expect(t.a).toEqual('hello world')
    })

    it('should properly perform DI on a function', async () => {
        const makeContainer = () => new Container().register({
            a: asFactory(new Factory()),
            url: 'https://stuff.com'
        })

        const inject = makeInjector<typeof makeContainer>()
        class Factory {
            make(@inject('url') url: string) {
                return 'url: ' + url
            }
        }

        const container = makeContainer()
        const urlExample = await container.get('a')
        expect(urlExample).toEqual('url: https://stuff.com')
    })

    it('should properly resolve long chain of dependencies', async () => {
        const makeContainer = containerBuilder(c => c.register({
            database: 'http://databaseData.com',
            a: asFactory(new Factory1()),
            b: asFactory(new Factory2())
        }))
        const inject = makeContainer.injector

        class Factory1 {
            make(@inject('database') dbUrl: string) {
                return 'this is result from factoryA'
            }
        }

        class Factory2 {
            make(@inject('database') dbUrl: string, @inject('a') resultA: string) {
                return dbUrl.length + resultA.length
            }
        }

        const container = makeContainer()
        const nr = await container.get('b')
        expect(nr).toEqual(51)
    })

    it('should allow for registering modules in their namespaces', async () => {
        const timeModule = () => {
            return new Container().register({
                now: Date.now(),
                dateString: '2020-01-01' as string
            })
        }

        const secondModule = containerBuilder(c =>
            c.register({
                controllerA: 421421
            })
        )

        const makeContainer = () => {
            return new Container().registerSubmodules({
                time: timeModule,
                second: secondModule
            })
        }

        const container = makeContainer()
        const time = await container.get('time.dateString')
        expect(time).toEqual('2020-01-01')
    })

    it('should allow for referencing accross namespaces', async () => {
        const modABuild = containerBuilder(c => c.register({
            val1: asFunction(() => 'abc'),
            val2: '23213'
        }))

        const modA = modABuild()
        
        const modBBuild = containerBuilder(c => c.register({
            val2: asFunction(() => 'def'),
            num: 321,
            dependant: asClass(DependantClass)
        }))


        const coreBuild = containerBuilder(c => c.registerSubmodules({
            a: modABuild,
            b: modBBuild
        }))
        const coreInject = coreBuild.injector

        class DependantClass {
            constructor(
                @coreInject('a.val2') private valA: string,
                @modBBuild.injector('num') private num: number
            ) { }
            
            compute() {
                return this.valA + ' ' + this.num
            }
        }
        const core = coreBuild()
        const val = await core.get('b.dependant')

        expect(val).toBeInstanceOf(DependantClass)
        expect(val.compute()).toEqual('23213 321')
    })

    it('should allow to test module by providing extra parameters', async () => {
        const configModule = containerBuilder(c => c.register({
            url: 'production'
        }))

        const dbModule = containerBuilder(c => c.register({
            database: asFactory(new DatabaseFactory),
        }))

        const coreModule = containerBuilder(c => c.registerSubmodules({
            config: configModule,
            database: dbModule
        }))

        class Database {
            constructor(public url: string) { }
        }

        class DatabaseFactory {
            make(@coreModule.injector('config.url') url: string) {
                return new Database(url)
            }
        }

        const mod = coreModule()
        const db = await mod.get('database.database')
        expect(db.url).toEqual('production')

        // This should allow to instantiate module separately
        const dbContainer = dbModule()
        expect(() => dbContainer.throwIfMissingDeps()).toThrow()
        dbContainer.mock('config.url', 'debug')
        const dbWithMock = await dbContainer.get('database')

        expect(dbWithMock.url).toEqual('debug')
    })
})