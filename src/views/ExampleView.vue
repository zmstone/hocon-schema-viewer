<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue'
import type { PropType } from 'vue'
import type * as schema from '../schema'

export default defineComponent({
  name: 'ExampleView',
  props: {
    currentStruct: {
      type: Object as PropType<schema.Struct>,
      required: true
    },
    structResolver: {
      type: Function,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    valuePath: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const generatedExample = ref<string>('')
    const processedExample = ref<string>('')
    const isLoading = ref(false)
    const activeTab = ref('example') // 'example' or 'schema'
    const error = ref<string>('')
    const apiKey = ref(localStorage.getItem('openai_api_key') || '')
    const supportedModels = [
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
      { value: 'o4-mini', label: 'o4-mini' },
      { value: 'o3', label: 'o3' }
    ]
    const storedModel = localStorage.getItem('openai_model') || ''
    const defaultModel = supportedModels.some((m) => m.value === storedModel)
      ? storedModel
      : 'gpt-5.2-codex'
    const selectedModel = ref(defaultModel)
    const showKeyStored = ref(false)
    const additionalPrompts = ref('')
    const models = supportedModels
    const exampleSource = ref<'ai' | 'pre-generated' | null>(null)
    const valuePath = ref(props.valuePath)
    const systemPrompt = ref('')
    const showRegenerateControls = ref(false)

    const PROMPT_URL = 'https://gist.githubusercontent.com/zmstone/44747c1adc7f86ca1968f4bf4f16307b/raw/emqx-config-example-generation-prompt.txt'

    // Reset state when struct changes
    watch(
      () => props.currentStruct,
      () => {
        activeTab.value = 'example'
        generatedExample.value = ''
        error.value = ''
        exampleSource.value = null
        // Auto-generate example when struct changes
        generateExample(false)
      },
      { immediate: true }
    )

    // Store API key when it changes
    watch(apiKey, (newKey) => {
      if (newKey) {
        localStorage.setItem('openai_api_key', newKey)
        showKeyStored.value = true
        setTimeout(() => {
          showKeyStored.value = false
        }, 3000) // Hide notification after 3 seconds
      }
    })

    watch(selectedModel, (newModel) => {
      localStorage.setItem('openai_model', newModel)
    })

    // Watch for changes to valuePath prop
    watch(() => props.valuePath, (newPath) => {
      valuePath.value = newPath
    })

    const findStruct = (name: string): schema.Struct | null => {
      try {
        return props.structResolver(name)
      } catch (e) {
        error.value = `Could not find struct: ${name}`
        return null
      }
    }

    // Process example text to convert generate comments into links
    function hasSubstructContent(lines: string[], index: number): boolean {
      if (index + 1 >= lines.length) return false
      // Check next few lines for content
      for (let i = index + 1; i < lines.length; i++) {
        const line = lines[i]
        // Stop at next substruct or closing brace/bracket
        if (line.includes('#substruct(') || line.trim() === '}' || line.trim() === ']') {
          break
        }
        // Consider any non-empty line as content
        if (line.trim() !== '') {
          return true
        }
      }
      return false
    }

    // if the substruct example has wrapping lines, such as path.to.config {, }
    // remove the wrapping lines so they can be embedded in the parent struct example
    function processExampleText(text: string) {
      if (!text) return ''
      const lines = text.split('\n')
      return text
        .split('\n')
        .map((line, index) => {
          const match = line.match(/^(\s*)#substruct\((.+)\)$/)
          if (match) {
            const [fullMatch, indentation, refName] = match
            const hasContent = hasSubstructContent(lines, index)
            const regenerateControl = showRegenerateControls.value
              ? ` <a href="javascript:void(0)" class="regenerate-substruct" data-ref="${refName}" title="Regenerate substruct">↺</a>`
              : ''
            const clearControl =
              showRegenerateControls.value && hasContent
                ? ` <a href="javascript:void(0)" class="clear-substruct" data-ref="${refName}" title="Clear substruct">✖</a>`
                : ''
            return `<span class="substruct-line">${indentation}<span class="substruct-content"><a href="javascript:void(0)" class="generate-link" data-ref="${refName}" data-indent="${indentation}">#substruct(${refName})</a>${regenerateControl}${clearControl}</span></span>`
          }
          return line
        })
        .join('\n')
    }

    // Watch for changes in generatedExample and process it
    watch(generatedExample, (newValue) => {
      processedExample.value = processExampleText(newValue)
    })
    watch(showRegenerateControls, () => {
      processedExample.value = processExampleText(generatedExample.value)
    })

    // Handle generate link clicks
    async function handleGenerateClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.classList.contains('generate-link')) return

      const refName = target.getAttribute('data-ref')
      const indentation = target.getAttribute('data-indent') || ''
      if (!refName) return

      const struct = findStruct(refName)
      if (!struct) return

      // Insert loading placeholder
      const lines = generatedExample.value.split('\n')
      const linkIndex = lines.findIndex((line) => line.includes(`#substruct(${refName})`))
      if (linkIndex >= 0) {
        // Find and remove any existing substruct content
        const currentIndent = (lines[linkIndex].match(/^\s*/) || [''])[0].length
        let nextStructIndex = linkIndex + 1

        while (nextStructIndex < lines.length) {
          const line = lines[nextStructIndex]
          const lineIndent = (line.match(/^\s*/) || [''])[0].length

          if (
            lineIndent <= currentIndent &&
            (line.includes('#substruct(') || line.trim() === '}' || line.trim() === ']')
          ) {
            break
          }
          nextStructIndex++
        }

        // Remove all lines between current substruct and block end
        lines.splice(linkIndex + 1, nextStructIndex - linkIndex - 1)
        // Add loading placeholder
        lines.splice(linkIndex + 1, 0, indentation + '  Generating...\n' + indentation)
        generatedExample.value = lines.join('\n')
      }

      let subExample: string
      try {
        // Try loading local example first
        const fileName = refName.replace(/:/g, '-') + '.hocon'
        const path = props.version
          ? `examples/${props.version}/${fileName}`
          : `examples/${fileName}`

        const response = await fetch(path)
        if (response.ok) {
          subExample = stripWrappingLines(await response.text())
        } else {
          // Fall back to AI generation if local example not found
          const messages = [{ role: 'system', content: systemPrompt.value }]

          messages.push({ role: 'user', content: generateUserPrompt(struct, valuePath.value) })

          if (additionalPrompts.value.trim()) {
            messages.push({ role: 'user', content: 'Additional instructions:\n' + additionalPrompts.value })
          }

          const rawExample = await callOpenAI(apiKey.value, selectedModel.value, messages)
          subExample = stripWrappingLines(rawExample)
        }

        const indentedExample = subExample
          .split('\n')
          .map((line: string) => indentation + line)
          .join('\n')

        // Replace loading placeholder with actual example
        const updatedLines = generatedExample.value.split('\n')
        const loadingIndex = updatedLines.findIndex((line) =>
          line.includes(`#substruct(${refName})`)
        )
        if (loadingIndex >= 0) {
          updatedLines.splice(loadingIndex + 1, 2, indentedExample)
          generatedExample.value = updatedLines.join('\n')
        }
      } catch (err) {
        console.error('Error generating sub-example:', err)
        // Remove loading placeholder on error
        const errorLines = generatedExample.value.split('\n')
        const errorIndex = errorLines.findIndex((line) => line.includes(`#substruct(${refName})`))
        if (errorIndex >= 0) {
          errorLines.splice(errorIndex + 1, 1)
          generatedExample.value = errorLines.join('\n')
        }
      }
    }

    // Handle clear substruct button clicks
    function handleClearSubstruct(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.classList.contains('clear-substruct')) return

      const refName = target.getAttribute('data-ref')
      if (!refName) return

      const lines = generatedExample.value.split('\n')
      const linkIndex = lines.findIndex((line) => line.includes(`#substruct(${refName})`))
      if (linkIndex >= 0) {
        const currentIndent = (lines[linkIndex].match(/^\s*/) || [''])[0].length
        let nextStructIndex = linkIndex + 1

        while (nextStructIndex < lines.length) {
          const line = lines[nextStructIndex]
          const lineIndent = (line.match(/^\s*/) || [''])[0].length

          if (line.includes('#substruct(') && lineIndent === currentIndent) {
            break
          }
          if (lineIndent < currentIndent) {
            break
          }
          nextStructIndex++
        }

        // Remove all lines between current substruct and block end
        lines.splice(linkIndex + 1, nextStructIndex - linkIndex - 1)
        generatedExample.value = lines.join('\n')
      }
    }

    async function callOpenAI(apiKey: string, model: string, messages: any[]) {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
      const extractError = (data: any, fallback: string) => {
        return data?.error?.message || data?.message || fallback
      }
      const extractResponseText = (data: any): string => {
        const parts: string[] = []

        if (typeof data?.output_text === 'string' && data.output_text.trim() !== '') {
          return data.output_text
        }
        if (Array.isArray(data?.output_text)) {
          const joined = data.output_text.filter((s: any) => typeof s === 'string').join('\n').trim()
          if (joined) return joined
        }

        if (Array.isArray(data?.output)) {
          for (const out of data.output) {
            if (Array.isArray(out?.content)) {
              for (const block of out.content) {
                if (typeof block?.text === 'string' && block.text.trim() !== '') {
                  parts.push(block.text)
                } else if (typeof block?.output_text === 'string' && block.output_text.trim() !== '') {
                  parts.push(block.output_text)
                } else if (typeof block?.value === 'string' && block.value.trim() !== '') {
                  parts.push(block.value)
                }
              }
            }
          }
        }

        const merged = parts.join('\n').trim()
        if (merged) return merged
        return ''
      }

      // Prefer Responses API for GPT-5 family.
      if (model.startsWith('gpt-5')) {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            input: messages
          })
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(extractError(data, `API error: ${response.statusText}`))
        }
        const extracted = extractResponseText(data)
        if (extracted !== '') {
          return extracted
        }
        throw new Error('No text content returned by Responses API.')
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: model.startsWith('o') ? undefined : 0.7
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(extractError(data, `API error: ${response.statusText}`))
      }
      return data.choices[0].message.content
    }

    function stripWrappingLines(text: string): string {
      const lines = text.trim().split('\n')

      // Remove first line if it contains a path
      if (lines[0].includes('=') || lines[0].includes('{')) {
        lines.shift()
      }

      // Remove opening brace if present
      if (lines[0].trim() === '{') {
        lines.shift()
      }

      // Remove closing brace if present
      if (lines[lines.length - 1].trim() === '}') {
        lines.pop()
      }

      // Find base indentation level (from first non-empty line)
      const firstNonEmptyLine = lines.find((line) => line.trim())
      const baseIndent = firstNonEmptyLine ? (firstNonEmptyLine.match(/^\s*/)?.[0].length || 0) : 0

      // Remove one level of indentation from each line
      const deindentedLines = lines.map((line) => {
        if (line.trim() === '') return ''
        return line.slice(baseIndent)
      })

      return deindentedLines.join('\n').trim()
    }

    async function generateExample(forceAI: boolean = false) {
      // Check if paths array is empty
      if (props.currentStruct.paths.length === 0) {
        generatedExample.value = 'Click one one of the struct types to generate an example.'
        activeTab.value = 'example'
        isLoading.value = false
        return
      }

      isLoading.value = true
      error.value = ''

      // Try loading local example first unless forceAIGeneration is true
      if (!forceAI) {
        try {
          const fileName = props.currentStruct.full_name.replace(/:/g, '-') + '.hocon'
          const path = props.version
            ? `examples/${props.version}/${fileName}`
            : `examples/${fileName}`

          const response = await fetch(path)
          if (response.ok) {
            generatedExample.value = await response.text()
            activeTab.value = 'example'
            exampleSource.value = 'pre-generated'
            isLoading.value = false
            return
          }
        } catch (err) {
          console.log('No local example found, falling back to AI generation')
        }
      }
      // Fall back to AI generation if local example not found
      if (!apiKey.value) {
        error.value = 'OpenAI API key is required to generate examples. Please enter your API key above.'
        isLoading.value = false
        return
      }
      try {
        if (!systemPrompt.value) {
          error.value = 'System prompt not loaded yet. Please try again.'
          isLoading.value = false
          return
        }
        const messages = [{ role: 'system', content: systemPrompt.value }]

        if (additionalPrompts.value.trim()) {
          messages.push({ role: 'user', content: additionalPrompts.value })
        }

        messages.push({ role: 'user', content: generateUserPrompt(props.currentStruct, valuePath.value) })

        generatedExample.value = await callOpenAI(apiKey.value, selectedModel.value, messages)
        exampleSource.value = 'ai'
        activeTab.value = 'example'
      } catch (error: any) {
        generatedExample.value = `Error generating example: ${error?.message || 'unknown error'}`
        activeTab.value = 'example'
      } finally {
        isLoading.value = false
      }
    }

    async function handleRegenerateSubstruct(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.classList.contains('regenerate-substruct')) return

      const refName = target.getAttribute('data-ref')
      const indentation = target.closest('.substruct-line')?.querySelector('.generate-link')?.getAttribute('data-indent') || ''
      if (!refName) return

      const struct = findStruct(refName)
      if (!struct) return

      // Force AI generation
      if (!systemPrompt.value) {
        error.value = 'System prompt not loaded yet. Please try again.'
        return
      }
      const messages = [{ role: 'system', content: systemPrompt.value }]

      if (additionalPrompts.value.trim()) {
        messages.push({ role: 'user', content: additionalPrompts.value })
      }

      messages.push({ role: 'user', content: generateUserPrompt(struct, valuePath.value) })

      const rawExample = await callOpenAI(apiKey.value, selectedModel.value, messages)
      const subExample = stripWrappingLines(rawExample)

      const indentedExample = subExample
        .split('\n')
        .map((line: string) => indentation + line)
        .join('\n')

      // Replace existing content
      const lines = generatedExample.value.split('\n')
      const linkIndex = lines.findIndex((line) => line.includes(`#substruct(${refName})`))
      if (linkIndex >= 0) {
        const currentIndent = (lines[linkIndex].match(/^\s*/) || [''])[0].length
        let nextStructIndex = linkIndex + 1

        while (nextStructIndex < lines.length) {
          const line = lines[nextStructIndex]
          const lineIndent = (line.match(/^\s*/) || [''])[0].length

          if (line.includes('#substruct(') && lineIndent === currentIndent) {
            break
          }
          if (lineIndent < currentIndent) {
            break
          }
          nextStructIndex++
        }

        lines.splice(linkIndex + 1, nextStructIndex - linkIndex - 1, indentedExample)
        generatedExample.value = lines.join('\n')
      }
    }

    onMounted(async () => {
      try {
        const response = await fetch(PROMPT_URL)
        if (!response.ok) throw new Error('Failed to fetch prompt')
        systemPrompt.value = await response.text()
      } catch (error) {
        console.error('Error fetching prompt:', error)
      }
    })

    function generateUserPrompt(schema: any, valuePath: string): string {
      return `Please generate a valid kHOCON example for this schema:\n${JSON.stringify(
        schema,
        null,
        2
      )}\n\nValue path hint: ${valuePath}`
    }

    return {
      generatedExample,
      processedExample,
      isLoading,
      generateExample,
      activeTab,
      error,
      apiKey,
      selectedModel,
      models,
      showKeyStored,
      additionalPrompts,
      findStruct,
      handleGenerateClick,
      handleClearSubstruct,
      exampleSource,
      valuePath,
      handleRegenerateSubstruct,
      systemPrompt,
      showRegenerateControls
    }
  }
})
</script>

<template>
  <div class="example-view">
    <div class="content">
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'example' }"
          @click="activeTab = 'example'"
        >
          Example
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'schema' }"
          @click="activeTab = 'schema'"
        >
          Schema
        </button>
      </div>
      <div v-if="activeTab === 'schema'" class="schema-content">
        <pre><code>{{ JSON.stringify(currentStruct, null, 2) }}</code></pre>
      </div>
      <div v-else class="example-content">
        <div class="example-main">
          <div class="struct-info" v-if="valuePath">
            <div class="struct-status">
              <span v-if="exampleSource" class="example-source" :class="exampleSource">
                {{ exampleSource === 'pre-generated' ? 'pregenerated' : 'regenerated' }}
              </span>
              <button
                @click="showRegenerateControls = !showRegenerateControls"
                type="button"
                class="regen-toggle"
                :title="showRegenerateControls ? 'Hide regeneration controls' : 'Show regeneration controls'"
              >
                {{ showRegenerateControls ? 'Hide' : 'Refresh' }}
              </button>
            </div>
          </div>
          <div class="controls-footer top-controls" v-if="showRegenerateControls">
            <div class="more-prompts">
              <textarea
                v-model="additionalPrompts"
                class="prompts-input"
                placeholder="Add additional instructions. For example, skip low importance fields."
                rows="4"
              ></textarea>
            </div>
            <div class="api-controls">
              <div class="input-group">
                <label class="input-label">OpenAI API Key:</label>
                <input
                  v-model="apiKey"
                  type="password"
                  class="api-key-input"
                  placeholder="sk-..."
                />
                <span v-if="showKeyStored" class="key-stored">API key stored!</span>
              </div>
              <div class="input-group">
                <label class="input-label">Model:</label>
                <select v-model="selectedModel" class="model-select">
                  <option v-for="model in models" :key="model.value" :value="model.value">
                    {{ model.label }}
                  </option>
                </select>
              </div>
              <button @click="generateExample(true)" :disabled="isLoading" class="generate-button">
                {{ isLoading ? 'Generating...' : '↺' }}
              </button>
            </div>
          </div>
          <div
            class="example-code"
            @click="
              (e) => {
                handleGenerateClick(e)
                handleClearSubstruct(e)
                handleRegenerateSubstruct(e)
              }
            "
          >
            <pre><code v-html="processedExample"></code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.example-view {
  padding: 0;
  background: #f8f8f8;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.example-content {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  height: calc(100% - 37px);
}

.example-main {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.controls-footer {
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.top-controls {
  margin-top: 0;
  margin-bottom: 10px;
}

.api-controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
}

.generate-button {
  padding: 4px 12px;
  border-radius: 4px;
  background: #e4f5ea;
  border: 1px solid #2e5742;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
  min-width: 120px;
}

.generate-button:hover:not(:disabled) {
  background: #d0ebda;
}

.generate-button:active:not(:disabled) {
  transform: translateY(1px);
}

.generate-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: #f5f5f5;
  border-color: #ccc;
}

.loading {
  padding: 16px;
  text-align: center;
  color: #666;
}

pre {
  margin: 0;
  overflow-x: auto;
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #eee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.error {
  padding: 12px;
  margin-bottom: 12px;
  background: #fee;
  border: 1px solid #faa;
  border-radius: 4px;
  color: #c00;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 0.8em;
  color: #666;
}

.model-select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9em;
  background: white;
}

.key-stored {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  padding: 4px 8px;
  background: #e4f5ea;
  border-radius: 4px;
  font-size: 0.8em;
  color: #2e5742;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tabs {
  position: sticky;
  top: 0;
  background: inherit;
  padding: 0 16px;
  margin: 0;
  z-index: 1;
  border-bottom: 1px solid #eee;
}

.tab-button {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: var(--text-sm);
  cursor: pointer;
  color: #666;
  position: relative;
  margin-right: 16px;
  transition: all 0.2s ease;
}

.tab-button.active {
  color: #2e5742;
  font-weight: 500;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #2e5742;
}

.more-prompts {
  margin-bottom: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.prompts-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-family: monospace;
  font-size: 0.9em;
  resize: vertical;
  transition: border-color 0.2s ease;
  flex-grow: 1;
}

.prompts-input:focus {
  outline: none;
  border-color: #2e5742;
  box-shadow: 0 0 0 2px rgba(46, 87, 66, 0.1);
}

.generate-link {
  color: #2e5742;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  font-weight: 500;
  background: rgba(0, 102, 204, 0.1);
}

.generate-link:hover {
  background: rgba(0, 102, 204, 0.2);
}

@media (prefers-color-scheme: dark) {
  .example-view {
    background: #2a2a2a;
  }

  h3 {
    color: #eee;
  }

  pre {
    background: #1a1a1a;
    border-color: #333;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .generate-button {
    background: #2e5742;
    color: #fff;
  }

  .loading {
    color: #aaa;
  }

  .error {
    background: #422;
    border-color: #633;
    color: #faa;
  }

  .api-key-input {
    background: #1a1a1a;
    border-color: #444;
    color: #fff;
  }

  .key-stored {
    background: #2e5742;
    color: #e4f5ea;
  }

  .input-label {
    color: #aaa;
  }

  .model-select {
    background: #1a1a1a;
    border-color: #444;
    color: #fff;
  }

  .tabs {
    border-bottom-color: #444;
  }

  .tab-button {
    color: #999;
  }

  .tab-button.active {
    color: #e4f5ea;
  }

  .tab-button.active::after {
    background: #e4f5ea;
  }

  .more-prompts {
    background: #333;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .prompts-input:focus {
    border-color: #e4f5ea;
    box-shadow: 0 0 0 2px rgba(228, 245, 234, 0.1);
  }

  .generate-link {
    color: #e4f5ea;
  }

  .generate-link:hover {
    text-decoration: underline;
    background: rgba(228, 245, 234, 0.05);
  }

  .controls-footer {
    border-top-color: #444;
  }
}

@media (max-width: 768px) {
  .controls {
    gap: 8px;
  }

  .api-key-input {
    width: 200px;
  }
}

.example-code {
  position: relative;
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
}

.example-code pre {
  position: relative;
  z-index: 1;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* Override pre/code styles for links */
.example-code :deep(.generate-link) {
  color: #0066cc;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  font-weight: 500;
  background: rgba(0, 102, 204, 0.1);
}

.example-code :deep(.generate-link:hover) {
  background: rgba(0, 102, 204, 0.2);
}

@media (prefers-color-scheme: dark) {
  .example-code :deep(.generate-link) {
    color: #66b3ff;
    background: rgba(102, 179, 255, 0.1);
  }

  .example-code :deep(.generate-link:hover) {
    background: rgba(102, 179, 255, 0.2);
  }
}

.example-code :deep(.sub-example) {
  white-space: pre;
  font-family: monospace;
}

.substruct-line {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.substruct-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clear-substruct {
  color: #666;
  font-size: var(--text-base);
  line-height: 1;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
  text-decoration: none !important;
  opacity: 0;
}

.substruct-line:hover .regenerate-substruct,
.substruct-line:hover .clear-substruct {
  opacity: 1;
}

.regenerate-substruct {
  color: #666;
  font-size: var(--text-base);
  line-height: 1;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
  text-decoration: none !important;
}

.regenerate-substruct:hover {
  background: rgba(46, 87, 66, 0.05);
  color: #2e5742;
  text-decoration: none !important;
}

@media (prefers-color-scheme: dark) {
  .regenerate-substruct {
    color: #999;
  }

  .regenerate-substruct:hover {
    background: rgba(228, 245, 234, 0.05);
    color: #e4f5ea;
    text-decoration: none !important;
  }
}

.struct-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 0 8px;
}

.struct-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.regen-toggle {
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: #fff;
  color: var(--text-dim);
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
}

.regen-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.struct-path {
  color: #666;
  font-style: italic;
  font-size: var(--text-xs);
}

.example-source {
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 3px;
}

.example-source.pre-generated {
  background: #e4f5ea;
  color: #2e5742;
}

.example-source.ai {
  background: #e4f5ea;
  color: #2e5742;
}

@media (prefers-color-scheme: dark) {
  .struct-path {
    color: #999;
  }

  .example-source.pre-generated,
  .example-source.ai {
    background: #2e5742;
    color: #e4f5ea;
  }
}

.schema-content {
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 16px;
}

.schema-content pre {
  height: 100%;
  margin: 0;
}
</style>
