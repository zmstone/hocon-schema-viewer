<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

export default defineComponent({
  name: 'ExampleView',
  props: {
    currentStruct: {
      type: Object as PropType<schema.Struct>,
      required: true
    }
  },
  setup(props) {
    const generatedExample = ref<string>('')
    const isLoading = ref(false)
    const showingExample = ref(false)
    const error = ref<string>('')
    const apiKey = ref(localStorage.getItem('openai_api_key') || '')
    const selectedModel = ref(localStorage.getItem('openai_model') || 'gpt-4o')
    const showKeyStored = ref(false)

    const models = [
      { value: 'gpt-4o', label: 'GPT-4' }
    ]

    // Reset state when struct changes
    watch(() => props.currentStruct, () => {
      showingExample.value = false
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
            content: 'You are a helpful assistant that generates HOCON format examples based the schema specification. ' +
            'Below are the schema rules: ' +
            '- Each schema is a JSON object. ' +
            '- The "type" field describes the type of the field. ' +
            '- The root level type is always a struct or a map. ' +
            '- Other than strut or map, the other compelex types are array and union. ' +
            '- The "description" field describes the field in human-readable format. ' +
            '- In the schema, the "path" field is a dot-separated string that describes the path to the field from the root of the schema. ' +
            '- The "default" field is the default value of the field if it is not provided. The "required" field is a boolean that describes if the field is required. ' +
            '- The "items" field is an object that describes the items of the field if it is an array. ' +
            '- When the type is a reference to another schema, generate "Add fields for <reference_name>" to the example. ' +
            'Below are the requirements for the generated example: ' +
            '- When it is a union type, you should generate an example based on my input after the schema JSON section, if no description is provided, you should generate an example based on the first union member type. ' +
            '- For map, the key is a dollar ($) sign prefixed placehocer such as $name, you should generate a sensible example key for the map such as "mywebhook1".' +
            '- When generating the example, you should recursively go deep into the schema and generate an example for each field. ' +
            '- While colon is a valid delimiter for key-value pair, you should use "=" as the delimiter in the generated example. ' +
            '- I prefer to have clean examples, so no need to include comments in the generated example.' +
            '- Do not quote the generated example in triple quotes.'
          }, {
            role: 'user',
            content: `Please generate a valid HOCON example for this schema:\n${JSON.stringify(props.currentStruct, null, 2)}`
          }]
        }

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
        showingExample.value = true
      } catch (error) {
        generatedExample.value = 'Error generating example'
        showingExample.value = true
      } finally {
        isLoading.value = false
      }
    }

    return {
      generatedExample,
      isLoading,
      generateExample,
      showingExample,
      error,
      apiKey,
      selectedModel,
      models,
      showKeyStored
    }
  }
})
</script>

<template>
  <div class="example-view">
    <div class="example-header">
      <h3>{{ showingExample ? 'Example' : 'Schema' }}</h3>
      <div class="controls">
        <button 
          @click="generateExample" 
          :disabled="isLoading"
          class="generate-button"
        >
          {{ isLoading ? 'Generating...' : 'Generate Example' }}
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
          <div class="api-input">
            <input
              type="password"
              v-model="apiKey"
              placeholder="Enter key"
              class="api-key-input"
            />
            <div v-if="showKeyStored" class="key-stored">
              API key stored in browser
            </div>
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
    <pre v-else><code>{{ showingExample ? generatedExample : JSON.stringify(currentStruct, null, 2) }}</code></pre>
  </div>
</template>

<style scoped>
.example-view {
  padding: 16px;
  background: #f8f8f8;
  border-radius: 4px;
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

h3 {
  margin: 0;
  font-size: 1.1em;
  color: #333;
}

.generate-button {
  padding: 4px 12px;
  border-radius: 4px;
  background: #e4f5ea;
  border: 1px solid #2e5742;
  cursor: pointer;
  font-size: 0.9em;
}

.generate-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
}

.error {
  padding: 12px;
  margin-bottom: 12px;
  background: #fee;
  border: 1px solid #faa;
  border-radius: 4px;
  color: #c00;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
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

.api-input {
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
}
</style>
