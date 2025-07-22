import { buildContainer } from "./builder"
import { makeInjector } from "./injector"
import { inspect } from "./inspector"
import { asFactory, asValue } from "./wrappers"

describe('Inspector', () => {
    it('should return shape of the module', () => {

        const sub = buildContainer(c => c.register({
            combined: asFactory(Combined)
        }).externals<{ a: number, b: number }>())

        @(makeInjector<typeof sub>()([
            'a',
            'b'
        ]))
        class Combined {
            make(a: number, b: number) { }
        }

        const module = buildContainer(c => c.register({
            a: 5,
            b: 'hello'
        }).externals<{ c: string }>().submodules({ sub }))
            .resolve({
                'c': 'b',
                'sub.a': 'a',
                'sub.b': 'sub.a'
            })

        const inspector = inspect(module.build())
        const res = inspector.getDependencies()
        expect(res).toEqual([
            {
                key: 'a',
                module: 'toplevel',
                type: 'value'
            },
            {
                key: 'b',
                module: 'toplevel',
                type: 'value'
            },
            {
                key: 'c',
                type: 'reference',
                module: 'toplevel',
                moduleKey: undefined,
                ref: 'b',

            },
            {
                // THIS IS PROBABLY WRONG AND SHOULD BE PROPERLY PREFIXED.
                "deps": [
                    {
                        "ref": "a",
                    },
                    {
                        "ref": "b",
                    },
                ],
                "key": "sub.combined",
                "module": "Module sub",
                "type": "configuration",
            },
            {
                "key": "sub.a",
                "module": "Module sub",
                "moduleKey": expect.any(Symbol),
                "ref": "a",
                "type": "reference",
            },
            {
                "key": "sub.b",
                "module": "Module sub",
                "moduleKey": expect.any(Symbol),
                "ref": "sub.a",
                "type": "reference",
            },
        ])
    })

    it.skip('should have 2 submodules refering each other', async () => {
        const modA = buildContainer(c => c.externals<{modAA: string, modAB: string }>())
        const modB = buildContainer(c => c.externals<{modBA: string, modBB: string }>())
        const mod = buildContainer(c => c.submodules({ modA, modB }).register({ a: 'hello' }))
            .resolve({
                'modA.modAA': 'modB.modBA',
                'modA.modAB': 'modB.modBB'
            })
            .resolve({
                'modB.modBA': asValue('aaa'),
                'modB.modBB': asValue('dsada')
            })
        const inspector = inspect(mod.build())
        const deps = inspector.getDependencies()
        expect(deps).toEqual({})
    })
})