import { buildContainer } from "./builder"
import { makeInjector } from "./injector"
import { inspect } from "./inspector"
import { asFactory } from "./wrappers"

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
})