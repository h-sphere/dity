import { DityGraph } from "dity-graph"

export const sidebar = (el: HTMLDivElement, graph: () => DityGraph | null)=> {
    const list = document.createElement('ul')
    list.classList.add('menu')
    const options = [
        {
            onIcon: 'graph_6',
            offIcon: 'graph_3',
            name: 'Layout',
            value: false,
            fn: (v: boolean) => {
                graph()?.setLayout(v ? 'circle' : 'forces')
            }
        },
        {
            onIcon: 'donut_small',
            offIcon: 'graph_7',
            name: 'Modules',
            value: false,
            fn: (v: boolean) => {
                graph()?.showModules(v)
            }
        }
    ]

    options.forEach(o => {
        const el = document.createElement('li')
        const button = document.createElement('button')
        el.appendChild(button)
        const span = document.createElement('span')
        span.classList.add('material-symbols-outlined')
        span.textContent = o.value ? o.onIcon : o.offIcon
        button.appendChild(span)

        button.addEventListener('click', e => {
            e.preventDefault()
            o.value = !o.value
            span.textContent = o.value ? o.onIcon : o.offIcon
            if (o.fn) {
                o.fn(o.value)
            }
        })

        list.appendChild(el)
    })

    el.appendChild(list)
}