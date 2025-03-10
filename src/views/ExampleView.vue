<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'
import { systemPrompt, generateUserPrompt, generateSubExamplePrompt } from '../prompts/example-generator'

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
    }
  },
  setup(props) {
    const generatedExample = ref<string>('')
    const processedExample = ref<string>('')
    const isLoading = ref(false)
    const activeTab = ref('schema')  // 'schema' or 'example'
    const error = ref<string>('')
    const apiKey = ref(localStorage.getItem('openai_api_key') || '')
    const selectedModel = ref(localStorage.getItem('openai_model') || 'gpt-4o')
    const showKeyStored = ref(false)
    const showMorePrompts = ref(false)
    const additionalPrompts = ref('')
    const models = [
      { value: 'gpt-4o', label: 'GPT-4' }
    ]

    // Reset state when struct changes
    watch(() => props.currentStruct, () => {
      activeTab.value = 'schema'
      generatedExample.value = ''
      error.value = ''
    })

    // Store API key when it changes
    watch(apiKey, (newKey) => {
      if (newKey) {
        localStorage.setItem('openai_api_key', newKey)
        showKeyStored.value = true
        setTimeout(() => {
          showKeyStored.value = false
        }, 3000)  // Hide notification after 3 seconds
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
    function processExampleText(text: string) {
      if (!text) return ''
      return text.split('\n').map(line => {
        // ignore indentations
        const match = line.match(/^(\s*)# generate:(.+)$/)
        if (match) {
          const [fullMatch, indentation, refName] = match  // Destructure to get the correct parts
          return `<a href="javascript:void(0)" class="generate-link" data-ref="${refName}">${match[0]}</a>`
        }
        return line
      }).join('\n')
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
      if (!refName) return

      const struct = findStruct(refName)
      if (!struct) {
        return
      }

      // Get the original line with indentation
      const originalLine = target.textContent || ''
      const indentation = originalLine.match(/^\s*/)?.[0] || ''

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.value}`
          },
          body: JSON.stringify({
            model: selectedModel.value,
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: generateSubExamplePrompt(struct)
            }],
            temperature: selectedModel.value === 'gpt-4o' ? 0.7 : undefined
          })
        })

        if (!response.ok) throw new Error(`API error: ${response.statusText}`)
        
        const data = await response.json()
        const subExample = data.choices[0].message.content
        
        // Add indentation to each line of the sub-example
        const indentedExample = subExample
          .split('\n')
          .map(line => indentation + line)
          .join('\n')

        // Insert the sub-example after the generate line
        const lines = generatedExample.value.split('\n')
        const linkIndex = lines.findIndex(line => line.includes(`# generate:${refName}`))
        if (linkIndex >= 0) {
          lines.splice(linkIndex + 1, 0, indentedExample)
          generatedExample.value = lines.join('\n')
        }

      } catch (err) {
        console.error('Error generating sub-example:', err)
      }
    }

    async function generateExample() {
      if (!apiKey.value) {
        return
      }
      isLoading.value = true
      error.value = ''
      try {
        const requestBody: any = {
          model: selectedModel.value,
          messages: [{
            role: 'system',
            content: systemPrompt
          }, {
            role: 'user',
            content: additionalPrompts.value
          }, {
            role: 'user',
            content: generateUserPrompt(props.currentStruct)
          }]
        }

        // Remove empty messages
        requestBody.messages = requestBody.messages.filter((m: { content: string }) => m.content.trim())

        // Only add temperature for GPT-4 model
        if (selectedModel.value === 'gpt-4o') {
          requestBody.temperature = 0.7
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.value}`
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const data = await response.json()
        generatedExample.value = data.choices[0].message.content
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
      handleGenerateClick
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
          :class="{ active: activeTab === 'schema' }"
          @click="activeTab = 'schema'"
        >
          Schema
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'example' }"
          @click="activeTab = 'example'"
        >
          Example
        </button>
      </div>
      <div v-if="activeTab === 'schema'">
        <pre><code>{{ JSON.stringify(currentStruct, null, 2) }}</code></pre>
      </div>
      <div v-else class="example-content">
        <div class="controls">
          <button 
            @click="generateExample" 
            :disabled="isLoading"
            class="generate-button"
          >
            {{ isLoading ? 'Generating...' : 'Generate Example by AI' }}
          </button>
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
              <button 
                @click="showMorePrompts = !showMorePrompts"
                class="more-prompts-button"
              >
                {{ showMorePrompts ? 'Hide Prompts' : 'More Prompts' }}
              </button>
              <div v-if="showKeyStored" class="key-stored">
                API key stored in browser
              </div>
            </div>
          </div>
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
        <div v-else-if="isLoading" class="loading">
          Generating example...
        </div>
        <div v-if="showMorePrompts" class="more-prompts">
          <label class="input-label">Additional Prompts:</label>
          <textarea
            v-model="additionalPrompts"
            class="prompts-input"
            placeholder="Add additional instructions for example generation..."
            rows="4"
          ></textarea>
        </div>
        <div v-if="!isLoading" class="example-code" @click="handleGenerateClick">
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
  min-height: 0;  /* Important for Firefox */
}

.example-content {
  padding: 0 16px 16px;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding-top: 16px;
  flex-wrap: wrap;
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  font-size: 1.1em;
  cursor: pointer;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-right: 16px;
  transition: all 0.2s ease;
}

.tab-button:hover:not(.active) {
  color: #2e5742;
  background: rgba(46, 87, 66, 0.05);
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
}

.generate-link:hover {
  text-decoration: underline;
  background: rgba(46, 87, 66, 0.05);
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
    border-bottom-color: #e4f5ea;
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
  
  .tab-button {
    padding: 8px 12px;
    font-size: 1em;
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
  color: #2e5742;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.example-code :deep(.generate-link:hover) {
  text-decoration: underline;
  background: rgba(46, 87, 66, 0.05);
}

@media (prefers-color-scheme: dark) {
  .example-code :deep(.generate-link) {
    color: #e4f5ea;
  }

  .example-code :deep(.generate-link:hover) {
    background: rgba(228, 245, 234, 0.05);
  }
}
</style>
