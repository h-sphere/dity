import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "dity",
  description: "Dependency Injection. Typed.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/introduction' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Installation', link: '/installation' },
          { text: 'Defining the first module', link: '/defining-module' },
          { text: 'Submodules', link: '/submodules' },
          { text: 'Externals resolution', link: '/externals' }
        ]
      },
      {
        text: 'Extensions',
        items: [
          { text: 'Graph', link: '/extensions/graph' },
          { text: 'Explorer', link: '/extensions/explorer' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  },
  markdown: {
    codeTransformers: [
      transformerTwoslash() as any
    ]
  }
})
