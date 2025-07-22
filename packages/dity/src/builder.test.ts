import { buildContainer, ContainerBuilder } from "./builder";
import { makeInjector } from "./injector";
import { asClass, asFactory, asFunction, asValue } from "./wrappers";

describe("Builder", () => {
  it("should properly resolve simple externals", async () => {
    const modA = buildContainer((c) =>
      c
        .externals<{
          a: number;
          b: string;
          c: number;
        }>()
        .register({
          d: asFactory(Fact),
        })
        .exports("d")
    );

    @(makeInjector<typeof modA, "factory">()(["a", "b", "c"]))
    class Fact {
      make(a: number, b: string, c: number) {
        return { a, b, c };
      }
    }

    const modB = new ContainerBuilder("")
      .externals<{
        d: string;
      }>()
      .submodules({ modA })
      .resolve({
        "modA.c": 5,
        "modA.a": "modA.c",
        d: asValue("hello world"),
        "modA.b": "d",
      });

    const container = modB.build();
    expect(await container.get("modA.d")).toEqual({
      a: 5,
      b: "hello world",
      c: 5,
    });
  });

  it("should allow for resolutions on many levels", async () => {
    const modA = new ContainerBuilder("")
      .externals<{
        a: number;
        b: number;
        c: number;
        e: number;
        f: number;
      }>()
      .register({ d: 42 });

    const modB = new ContainerBuilder("")
      .submodules({ modA })
      .register({
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      })
      .exports("a", "b", "c")
      .externals<{
        backUp: number;
      }>()
      .resolve({
        "modA.a": "b",
        "modA.b": "modA.a",
        "modA.c": "modA.b",
        backUp: "modA.c",
        "modA.e": "backUp",
        "modA.f": "modA.e",
      });

    const container = modB.build();
    expect(await container.get("a")).toEqual(1);
  });

  it("should properly define submodules using buildContainer", async () => {
    const helper = buildContainer((c) =>
      c
        .externals<{
          a: number;
          b: string;
        }>()
        .register({
          c: 987654,
          d: "hello world",
        })
        .exports('c', 'd')
    );

    const main = buildContainer((c) =>
      c.submodules({
        helper: helper,
      })
    );

    const container = main
      .resolve({
        "helper.a": "helper.c",
        "helper.b": "helper.d",
      })
      .build();
  });

  it("should properly define externals", async () => {
    const submodule = buildContainer((c) =>
      c.register({
        a: 5,
        b: 1000,
        c: Date.now(),
      })
    );

    const module = buildContainer((c) =>
      c
        .externals<{
          ext1: string;
          ext2: number;
        }>()
        .register({
          out: asClass(Ex3),
          internal: 101,
        })
        .resolve({
          ext1: asValue("hello"),
          ext2: 5,
        })
        .submodules({ submodule })
        .exports('out')
    );

    const inject = makeInjector<typeof module>();

    @(inject(["ext2", "internal", "ext2"]))
    class Ex3 {
      constructor(private a: number, private b: number, private c: number) {}
      compute() {
        return this.a + this.b + this.c;
      }
    }

    const container = module.build();
    const val = await container.get("out");
    expect(val).toBeInstanceOf(Ex3);
    expect(val.compute()).toEqual(111);
  });

  // it('should define function dependency', async () => {
  //     const module = buildContainer(c => c.
  //         register({
  //             a: 42432,
  //             b: 'dsadsada',
  //             c: asFunction(fn)
  //         })
  //     )

  //     const inject = makeInjector<typeof module & {}>()

  //     const inj = inject(['a', 'b'])

  //     const fn = inj((a: number, b: string) => {
  //         return a + ' ' + b
  //     }) as ((a: number, b: string) => string) // This is the best we can do for now I think

  //     const c = module.build()

  //     const res = await c.get('c')
  //     expect(res).toEqual('42432 dsadsada')

  // })

  it("should properly handle dependency with unresolved external", async () => {
    const module = buildContainer((c) =>
      c
        .register({
          a: 1234,
          d: asClass(Run),
        })
        .externals<{
          b: number;
          c: string;
        }>()
    );

    const inject = makeInjector<typeof module>();

    @inject(["a", "b", "c"])
    class Run {
      constructor(private a: number, private b: number, private c: string) {}
      get() {
        return `${this.a} ${this.b} ${this.c}`;
      }
    }

    const container = module
      .resolve({
        b: 999,
        c: asValue("external input"),
      })
      .build();
    const val = await container.get("d");
    expect(val.get()).toEqual("1234 999 external input");
  });

  it("should handle submodules with unresolved externals", async () => {
    const submodule = buildContainer((c) =>
      c
        .externals<{
          dbUrl: string;
          retryTimes: number;
          logger: (message: string) => void;
        }>()
        .register({
          compute: asFactory(Compute),
        })
        .exports('compute')
    );

    const inject = makeInjector<typeof submodule>();

    @inject(["dbUrl", "retryTimes", "logger"])
    class Compute {
      make(url: string, retryTimes: number, logger: (message: string) => void) {
        logger(`db url: ${url}. retries: ${retryTimes}`);
        return retryTimes;
      }
    }

    const module = buildContainer((c) =>
      c.submodules({
        sub: submodule,
      })
    );

    const c = module
      .resolve({
        "sub.dbUrl": asValue("production-url"),
        "sub.logger": jest.fn((m: string) => {}),
        "sub.retryTimes": 5,
      })
      .build();

    const val = await c.get("sub.compute");
    expect(val).toEqual(5);
    const logger = await c.get("sub.logger");
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith("db url: production-url. retries: 5");
  });

  it("should allow for linking dependencies together", async () => {
    const helper = buildContainer((c) =>
      c
        .register({
          a: 5,
          b: "hello",
        })
        .externals<{ c: number }>()
    );

    const main = buildContainer((c) =>
      c
        .register({
          niceNumber: 42,
        })
        .submodules({
          helper: helper,
        })
    ).resolve({
      "helper.c": "niceNumber",
    });

    const container = main.build();

    expect(await container.get("helper.c")).toEqual(42);
  });

  it("should properly provide object to resolve", async () => {
    const main = buildContainer((c) =>
      c
        .register({
          stringVal: "dsada",
          numVal: 34234324,
        })
        .externals<{ a: number; b: string }>()
        .resolve({
          a: "numVal",
        })
        .resolve({
          b: "stringVal",
        })
    );

    const container = main.build();
    expect(await container.get("a")).toEqual(34234324);
    expect(await container.get("b")).toEqual("dsada");
  });

  it("should fail when providing wrong keys", async () => {
    const second = buildContainer((c) =>
      c.externals<{ a: number; b: number }>()
    );
    const main = buildContainer((c) =>
      c
        .externals<{ a: number; b: number }>()
        .resolve({
          a: 5,
        })
        .submodules({ second })
        .resolve({
          "second.a": 3243,
        })
    );

    const c = main.build({
      b: 342,
      "second.b": 42,
    });
  });

  it("should run async factory once", async () => {
    const fn = jest.fn();

    const module = buildContainer((c) =>
      c.register({
        f: asFactory(Factory),
        f2: asFactory(Factory2),
        f3: asFactory(Factory3),
      })
    );

    @(makeInjector<typeof module, "factory">()([]))
    class Factory {
      async make() {
        fn();
        return Promise.resolve(2);
      }
    }

    @(makeInjector<typeof module, "factory">()(["f"]))
    class Factory2 {
      async make(f: number) {
        return Promise.resolve(f * 5);
      }
    }
    @(makeInjector<typeof module, "factory">()(["f", "f2"]))
    class Factory3 {
      async make(a: number, b: number) {
        return Promise.resolve(a * b);
      }
    }

    const container = module.build();
    const f3 = await container.get("f3");
    expect(f3).toEqual(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should properly restrict children with proper exports", async () => {
    const modA = buildContainer((c) =>
      c
        .register({
          a: 5,
          b: 324324,
        })
        .externals<{ c: number }>()
        .exports("a")
    );

    const modB = buildContainer((c) =>
      c
        .register({
          c: 432432,
          b: 4325432562,
        })
        .exports("c", "b")
    );

    const main = buildContainer((c) => c.submodules({ modA, modB })).resolve({
      "modA.c": 423432,
    });
  });
});

type XAB = ("a" | "b") & never;
