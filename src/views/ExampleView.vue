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

    // Reset state when struct changes
    watch(() => props.currentStruct, () => {
      showingExample.value = false
      generatedExample.value = ''
      error.value = ''
    })

    async function generateExample() {
      isLoading.value = true
      error.value = ''
      try {
        const response = await fetch('/api/generate-example', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schema: props.currentStruct
          })
        })
        if (!response.ok) {
          throw new Error(`Failed to generate example: ${response.statusText}`)
        }
        const data = await response.json()
        generatedExample.value = JSON.stringify(data.example, null, 2)
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
      error
    }
  }
})
</script>

<template>
  <div class="example-view">
    <div class="example-header">
      <h3>{{ showingExample ? 'Example' : 'Schema' }}</h3>
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
}
</style>
