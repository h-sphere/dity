import './style.css'
import { buildContainer } from '../../../src/builder'
import Graph from 'graphology'
import Sigma from 'sigma'
import { NodeBorderProgram } from "@sigma/node-border";
import { uniq } from 'lodash'
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import { inspect } from '../../../src/inspector'
import chroma from 'chroma-js'

const submodule = buildContainer(c => c.register({
  a: 'hello world',
  b: 'hello hello'
}).externals<{ c: string }>())

const helper = buildContainer(c => c.register({
  a: 'xxx',
  b: 'yyy'
}).submodules({ hh: buildContainer(c => c.register({ subsub: 'dsadasdas' })) }))


const main = buildContainer(c => c.register({
  str: 'hello world',
  str2: 'hello world 2'
}).externals<{ ext1: string }>().resolve('ext1', 'str').submodules({ submodule: submodule, helper }).resolve('submodule.c', 'helper.hh.subsub'))

const container = main
  .build()

// GRAPH
const graph = new Graph();

const insp = inspect(container)

const deps = insp.getDependencies()

const typeToColor = (t: string) => {
  switch (t) {
    case 'configuration':
      return 'purple'
    case 'reference':
      return 'orange'
    case 'value':
      return 'red'
  }
}

const circleCoords = (i: number, radius: number = 150) => {
  return {
    x: radius / 2 + radius * Math.cos(i * 2 * Math.PI),
    y: radius / 2 + radius * Math.sin(i * 2 * Math.PI)
  } as const
}

const modules = uniq(deps.map(d => d.module))
const spectralScale = chroma.scale('Spectral').colors(modules.length)

const moduleColor = (module: string) => {
  const indx = modules.findIndex(m => m === module)
  return spectralScale[indx] ?? 'red'
}


modules.forEach((m, i) => {
  graph.addNode('MODULE__' + m, {
    label: 'MODULE: ' + m,
    ...circleCoords(i),
    color: 'green',
    size: 100,
    hidden: true
  })
})
const M = modules.length
const N = modules.length + deps.length

deps.forEach((d, i) => {
  let colors: Record<string, any> = {
    color: moduleColor(d.module)
  }
  if (d.type === 'reference') {
    colors = {
      borderColor: moduleColor(d.module),
      color: chroma(moduleColor(d.module)).brighten(2).desaturate(2).hex(),
      type: 'border'
    }
  }
  graph.addNode(d.key, { label: d.key, ...circleCoords((M + i) / N), size: 10, ...colors })
})

// Now we can create links
deps.forEach((d) => {
  switch (d.type) {
    case 'reference':
      graph.addEdge(d.key, d.ref, { size: 3, color: '#666', type: 'arrow' })
      break
    case 'configuration':
      d.deps.forEach(dep => {
        graph.addEdge(d.key, dep.ref, { size: 3, color: '#666', type: 'arrow' })
      })
  }
  // But also connecting to module node
  graph.addEdge(d.key, 'MODULE__' + d.module, {
    size: 0,
    color: 'transparent',
    opacity: 1,
    type: 'arrow',
    hidden: true,
    weight: 20
  })
})

const sensibleSettings = forceAtlas2.inferSettings(graph);
const fa2Layout = new FA2Layout(graph, {
  settings: sensibleSettings,
});


fa2Layout.start()


// Instantiate sigma.js and render the graph
const _sigmaInstance = new Sigma(graph, document.getElementById("container")!, {
  nodeProgramClasses: {
    border: NodeBorderProgram,
  },
});