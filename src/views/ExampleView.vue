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
    const apiKey = ref('')
    const showApiInput = ref(false)

    // Reset state when struct changes
    watch(() => props.currentStruct, () => {
      showingExample.value = false
      generatedExample.value = ''
      error.value = ''
    })

    async function generateExample() {
      if (!apiKey.value) {
        showApiInput.value = true
        return
      }
      isLoading.value = true
      error.value = ''
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.value}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{
              role: 'system',
              content: 'You are a helpful assistant that generates HOCON format examples based the schema specification. In the schema, the "path" field is a dot-separated string that describes the path to the field from the root of the schema. The "type" field describes the type of the field. The "description" field describes the field in human-readable format. The "default" field is the default value of the field if it is not provided. The "required" field is a boolean that describes if the field is required. The "enum" field is an array of possible values for the field if it is an enum. The "properties" field is an object that describes the properties of the field if it is an object. The "items" field is an object that describes the items of the field if it is an array. When generating the example, you should recursively go deep into the schema and generate an example for each field. When it is a union type, you should generate an example based on my following description after the schema JSON section, if no description is provided, you should generate an example based on the first union member type.'
            }, {
              role: 'user',
              content: `Please generate a valid HOCON example for this schema:\n${JSON.stringify(props.currentStruct, null, 2)}`
            }],
            temperature: 0.7
          })
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
      showApiInput
    }
  }
})
</script>

<template>
  <div class="example-view">
    <div class="example-header">
      <h3>{{ showingExample ? 'Example' : 'Schema' }}</h3>
      <div class="api-input" v-if="showApiInput">
        <input
          type="password"
          v-model="apiKey"
          placeholder="Enter OpenAI API Key"
          class="api-key-input"
        />
      </div>
      <button 
        @click="generateExample" 
        :disabled="isLoading"
        class="generate-button"
      >
        {{ isLoading ? 'Generating...' : 'Generate Example' }}
      </button>
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

.api-input {
  margin-right: 12px;
}

.api-key-input {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9em;
  width: 260px;
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
}
</style>
