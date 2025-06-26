import { inspect, type ContainerBuilder } from '@hypersphere/dity'
import { uniq } from 'lodash'
import chroma from 'chroma-js'
import Graph from 'graphology'
import FA2Layout from "graphology-layout-forceatlas2/worker";
import Sigma from 'sigma'
import { NodeBorderProgram } from "@sigma/node-border";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { animateNodes } from 'sigma/utils';
import { circular } from "graphology-layout";


const circleCoords = (i: number, radius: number = 150) => {
    return {
        x: radius / 2 + radius * Math.cos(i * 2 * Math.PI),
        y: radius / 2 + radius * Math.sin(i * 2 * Math.PI)
    } as const
}

type Layout = 'circle' | 'forces'

export class DityGraph {
    graph: Graph = new Graph()
    sigma: Sigma | null = null
    constructor(
        private containerBuilder: ContainerBuilder<any, never>,
        private htmlContainer: HTMLElement
    ) {
    }

    currentLayout: Layout = 'forces'

    fa2Layout: FA2Layout | null = null
    deps: ReturnType<ReturnType<typeof inspect>['getDependencies']> | null = null

    render() {
        const container = this.containerBuilder.build({} as never)
        const deps = inspect(container).getDependencies()
        const modules = uniq(deps.map(d => d.module))
        const colorScale = chroma.scale('Spectral').colors(modules.length)


        const moduleColor = (module: string) => {
            const indx = modules.findIndex(m => m === module)
            return colorScale[indx] ?? 'red'
        }

        const moduleName = (m: string) => `MODULE___${m}`

        // Adding modules
        modules.forEach((m, i) => {
            this.graph.addNode(moduleName(m), {
                label: m,
                ...circleCoords(i),
                color: 'green',
                size: 100,
                hidden: true // FIXME: add config for this?
            })
        })


        const M = modules.length
        const N = modules.length + deps.length
        this.deps = deps
        deps.forEach((dep, i) => {
            let colors: Record<string, any> = {
                color: moduleColor(dep.module)
            }
            if (dep.type === 'reference') {
                colors = {
                    borderColor: moduleColor(dep.module),
                    color: chroma(moduleColor(dep.module)).brighten(2).desaturate(2).hex(),
                    type: 'border'
                }
            }
            this.graph.addNode(dep.key, {
                label: dep.key,
                ...circleCoords((M + i) / N),
                size: 10,
                ...colors
            })
        })

        // Edges
        deps.forEach((d) => {
            switch (d.type) {
                case 'reference':
                    this.graph.addEdge(d.key, d.ref, { size: 3, color: '#666', type: 'arrow' })
                    break
                case 'configuration':
                    d.deps.forEach(dep => {
                        this.graph.addEdge(d.key, dep.ref, { size: 3, color: '#666', type: 'arrow' })
                    })
            }
            // But also connecting to module node
            this.graph.addEdge(d.key, moduleName(d.module), {
                size: 0,
                color: 'transparent',
                opacity: 1,
                type: 'arrow',
                hidden: true,
                weight: 20
            })
        })

        // Forces

        const sensibleSettings = forceAtlas2.inferSettings(this.graph);
        this.fa2Layout = new FA2Layout(this.graph, {
            settings: {
                ...sensibleSettings,
                slowDown: 5
            },
            
        });
        this.fa2Layout.start()
        this.sigma = new Sigma(this.graph, this.htmlContainer, {
          nodeProgramClasses: {
            border: NodeBorderProgram,
          }
        })
    }

    setLayout(layout: 'circle' | 'forces') {
        if (this.currentLayout === layout) {
            return
        }

        if (layout === 'circle') {
            this.fa2Layout?.stop()
            // const circularPositions = circular(this.graph, { scale: 100 });
            const circularPositions = this.deps!.reduce((acc,d,i) => {
                return {
                    ...acc,
                    [d.key]: circleCoords(i/this.deps!.length)
                }
            }, {})
            console.log('new positions', circularPositions)
            animateNodes(this.graph, circularPositions, { duration: 200 })
        } else {
            this.fa2Layout?.start()
        }
        this.currentLayout = layout
    }

    showModules(show: boolean) {
            this.graph.nodes().forEach(node => {
            console.log('NODE', node)
            if (node.startsWith('MODULE___')) {
                this.graph.setNodeAttribute(node, 'hidden', !show)
            }
        })
    }

    destroy() {
        if (this.sigma) {
            this.sigma.kill()
            this.graph.removeAllListeners()
            while (this.htmlContainer.firstChild) {
                this.htmlContainer.removeChild(this.htmlContainer.firstChild)
            }
        }
    }
}
