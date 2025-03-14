import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import type { PluginWithOptions } from 'markdown-it'
import type Token from 'markdown-it/lib/token'

// Helper to create heading anchors
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  // GitHub-like styling
  highlight: function (str: string, lang: string) {
    if (lang) {
      return `<div class="highlight"><pre class="highlight-pre"><code class="language-${lang}">${str}</code></pre></div>`
    }
    return `<div class="highlight"><pre class="highlight-pre"><code>${str}</code></pre></div>`
  }
})

// Define custom heading rule
const headingRule = (tokens: any[], idx: number, options: any, env: any, self: any) => {
  const token = tokens[idx]
  // The next token should be the inline token with the text
  const inlineToken = tokens[idx + 1]
  const title = inlineToken.content
  // Clear the inline token's children to avoid duplicate output.
  inlineToken.children = []
  const slug = slugify(title)
  const tag = token.tag // "h1", "h2", etc.

  return `<${tag} id="${slug}">
            <span class="heading-wrapper">
              ${title}
              <a class="heading-link" href="#${slug}">
                <svg class="octicon octicon-link" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"></path>
                </svg>
              </a>
            </span>
            <hr class="heading-hr" />`
}

// Override default heading rendering
md.renderer.rules.heading_open = headingRule

md.use(container, 'tip', {
  validate: (params: string) => params.trim().match(/^tip\s*(.*)$/i),
  render: (tokens: any[], idx: number) => {
    const m = tokens[idx].info.trim().match(/^tip\s*(.*)$/i)
    if (tokens[idx].nesting === 1) {
      return `<div class="markdown-alert markdown-alert-tip">
                <div class="markdown-alert-title">
                  <svg class="octicon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.75.75 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75ZM5.75 12a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z"></path>
                  </svg>
                  Tip
                </div>
                <div class="markdown-alert-content">${m[1] ? `<p>${m[1]}</p>` : ''}`
    }
    return '</div></div>\n'
  }
})
  .use(container, 'note', {
    validate: (params: string) => params.trim().match(/^note\s*(.*)$/i),
    render: (tokens: Token[], idx: number) => {
      const m = tokens[idx].info.trim().match(/^note\s*(.*)$/i)
      if (tokens[idx].nesting === 1 && m) {
        return `<div class="markdown-alert markdown-alert-note">
                <div class="markdown-alert-title">
                  <svg class="octicon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                  </svg>
                  Note
                </div>
                <div class="markdown-alert-content">${m[1] ? `<p>${m[1]}</p>` : ''}`
      }
      return '</div></div>\n'
    }
  })
  .use(container, 'warning', {
    validate: (params: string) => params.trim().match(/^warning\s*(.*)$/i),
    render: (tokens: Token[], idx: number) => {
      const m = tokens[idx].info.trim().match(/^warning\s*(.*)$/i)
      if (tokens[idx].nesting === 1 && m) {
        return `<div class="markdown-alert markdown-alert-warning">
                <div class="markdown-alert-title">
                  <svg class="octicon" viewBox="0 0 16 16" width="16" height="16">
                    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                  </svg>
                  Warning
                </div>
                <div class="markdown-alert-content">${m[1] ? `<p>${m[1]}</p>` : ''}`
      }
      return '</div></div>\n'
    }
  })

export const render = (content: string): string => {
  if (typeof content === 'string') {
    return md.render(content)
  }
  return ''
}
