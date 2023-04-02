import MarkdownIt from 'markdown-it'
import mdHtml5Embed from 'markdown-it-html5-embed'

const md = new MarkdownIt({
  html: true // Enable HTML tags in source
}).use(mdHtml5Embed, {
  html5embed: {
    useImageSyntax: true,
    useLinkSyntax: true
  }
})

export default md

export function render(maybestring: string): string {
  if (typeof maybestring === 'string') {
    return md.render(maybestring)
  }
  return ''
}
