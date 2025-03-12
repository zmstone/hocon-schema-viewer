<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type * as schema from '../schema'
import { systemPrompt, generateUserPrompt } from '../prompts/example-generator'

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
    }
  },
  setup(props) {
    const generatedExample = ref<string>('')
    const processedExample = ref<string>('')
    const isLoading = ref(false)
    const activeTab = ref('example') // 'example' or 'schema'
    const error = ref<string>('')
    const apiKey = ref(localStorage.getItem('openai_api_key') || '')
    const selectedModel = ref(localStorage.getItem('openai_model') || 'gpt-4o')
    const showKeyStored = ref(false)
    const showMorePrompts = ref(false)
    const additionalPrompts = ref('')
    const models = [{ value: 'gpt-4o', label: 'GPT-4' }]
    const exampleSource = ref<'ai' | 'pre-generated'>('ai')

    // Reset state when struct changes
    watch(
      () => props.currentStruct,
      () => {
        activeTab.value = 'example'
        generatedExample.value = ''
        error.value = ''
        exampleSource.value = 'ai'
        // Auto-generate example when struct changes
        generateExample(false)
      }
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
            return `<span class="substruct-line">${indentation}<a href="javascript:void(0)" class="generate-link" data-ref="${refName}" data-indent="${indentation}">#substruct(${refName})</a>${
              hasContent
                ? `<a href="javascript:void(0)" class="clear-substruct" data-ref="${refName}" title="Clear substruct">✖</a>`
                : ''
            }</span>`
          }
          return line
        })
        .join('\n')
    }

    // Watch for changes in generatedExample and process it
    watch(generatedExample, (newValue) => {
      processedExample.value = processExampleText(newValue)
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
          const rawExample = await callOpenAI(apiKey.value, selectedModel.value, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: generateUserPrompt(struct) }
          ])
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: model === 'gpt-4o' ? 0.7 : undefined
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.statusText}`)
      const data = await response.json()
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
      const baseIndent = firstNonEmptyLine ? firstNonEmptyLine.match(/^\s*/)[0].length : 0

      // Remove one level of indentation from each line
      const deindentedLines = lines.map((line) => {
        if (line.trim() === '') return ''
        return line.slice(baseIndent)
      })

      return deindentedLines.join('\n').trim()
    }

    async function generateExample(forceAI: boolean = false) {
      if (!apiKey.value) {
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
      try {
        const messages = [{ role: 'system', content: systemPrompt }]

        if (additionalPrompts.value.trim()) {
          messages.push({ role: 'user', content: additionalPrompts.value })
        }

        messages.push({ role: 'user', content: generateUserPrompt(props.currentStruct) })

        generatedExample.value = await callOpenAI(apiKey.value, selectedModel.value, messages)
        exampleSource.value = 'ai'
        activeTab.value = 'example'
      } catch (error) {
        generatedExample.value = 'Error generating example'
        activeTab.value = 'example'
      } finally {
        isLoading.value = false
      }
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
      showMorePrompts,
      additionalPrompts,
      findStruct,
      handleGenerateClick,
      handleClearSubstruct,
      exampleSource
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
      <div v-if="activeTab === 'schema'">
        <pre><code>{{ JSON.stringify(currentStruct, null, 2) }}</code></pre>
      </div>
      <div v-else class="example-content">
        <div class="controls">
          <div class="controls-inputs">
            <div class="input-group">
              <label class="input-label">Model:</label>
              <select v-model="selectedModel" class="model-select">
                <option v-for="model in models" :key="model.value" :value="model.value">
                  {{ model.label }}
                </option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">OpenAI API Key:</label>
              <div class="api-controls">
                <input
                  type="password"
                  v-model="apiKey"
                  placeholder="Enter key"
                  class="api-key-input"
                />
                <div v-if="showKeyStored" class="key-stored">API key stored in browser</div>
              </div>
            </div>
          </div>
          <div class="controls-row">
            <button @click="generateExample(true)" :disabled="isLoading" class="generate-button">
              {{ isLoading ? 'Generating...' : 'Try Again' }}
            </button>
            <button @click="showMorePrompts = !showMorePrompts" class="more-prompts-button">
              {{ showMorePrompts ? 'Hide Prompts' : 'More Prompts' }}
            </button>
          </div>
          <div class="struct-name">
            <code>{{ currentStruct.full_name }}</code>
            <span class="example-source" :class="exampleSource">
              {{ exampleSource === 'pre-generated' ? 'Pre-generated' : 'AI-generated' }}
            </span>
          </div>
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
        <div v-else-if="isLoading" class="loading">Generating example...</div>
        <div v-if="showMorePrompts" class="more-prompts">
          <label class="input-label">Additional Prompts:</label>
          <textarea
            v-model="additionalPrompts"
            class="prompts-input"
            placeholder="Add additional instructions. For example, skip low importance fields."
            rows="4"
          ></textarea>
        </div>
        <div
          v-if="!isLoading"
          class="example-code"
          @click="
            (e) => {
              handleGenerateClick(e)
              handleClearSubstruct(e)
            }
          "
        >
          <pre><code v-html="processedExample"></code></pre>
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
  overflow-y: auto;
  min-height: 0; /* Important for Firefox */
}

.example-content {
  padding: 0 16px 16px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding-top: 16px;
}

.controls-inputs {
  display: flex;
  gap: 12px;
  align-items: center;
}

.controls-row {
  display: flex;
  gap: 12px;
  align-items: center;
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

.api-controls {
  display: flex;
  gap: 8px;
  position: relative;
}

.api-key-input {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9em;
  width: 260px;
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

.more-prompts-button {
  padding: 4px 12px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 0.9em;
}

.more-prompts {
  margin: 12px 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.prompts-input {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-family: monospace;
  font-size: 0.9em;
  resize: vertical;
  transition: border-color 0.2s ease;
  min-height: 80px;
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

  .more-prompts-button {
    background: #333;
    border-color: #444;
    color: #fff;
  }

  .more-prompts {
    background: #333;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .prompts-input {
    background: #1a1a1a;
    border-color: #444;
    color: #fff;
  }

  .tab-button:hover:not(.active) {
    background: rgba(228, 245, 234, 0.05);
  }

  .generate-button:hover:not(:disabled) {
    background: #234434;
  }

  .generate-button:disabled {
    background: #2a2a2a;
    border-color: #444;
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
}

.example-code pre {
  position: relative;
  z-index: 1;
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

.clear-substruct {
  opacity: 0;
  margin-left: 4px;
  color: #666;
  font-size: var(--text-sm);
  line-height: 1;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.substruct-line:hover .clear-substruct {
  opacity: 1;
}

.clear-substruct:hover {
  background: rgba(46, 87, 66, 0.05);
  color: #2e5742;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  .clear-substruct {
    color: #999;
  }

  .clear-substruct:hover {
    background: rgba(228, 245, 234, 0.05);
    color: #e4f5ea;
  }
}

.struct-name {
  font-size: var(--text-sm);
  color: #666;
}

.struct-label {
  margin-right: 8px;
  color: #999;
}

@media (prefers-color-scheme: dark) {
  .struct-name {
    color: #aaa;
  }
  .struct-label {
    color: #777;
  }
}

.example-source {
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
}

.example-source.pre-generated {
  background: #e4f5ea;
  color: #2e5742;
}

.example-source.ai {
  background: #f0f0f0;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .example-source.pre-generated {
    background: #2e5742;
    color: #e4f5ea;
  }

  .example-source.ai {
    background: #333;
    color: #999;
  }
}
</style>
