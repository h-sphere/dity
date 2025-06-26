import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'

export default defineConfig({
  title: "dity",
  description: "Dependency Injection. Typed.",
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/introduction' },
      { text: 'Explorer', link: 'https://dity.dev/explorer/' }
    ],
    logo: '/dity.svg',
    siteTitle: '',
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
      { icon: 'github', link: 'https://github.com/h-sphere/dity' }
    ]
  },
  markdown: {
    codeTransformers: [
      transformerTwoslash() as any
    ]
  }
})
