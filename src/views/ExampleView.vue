<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

export default defineComponent({
  name: 'ExampleView',
  props: {
    currentStruct: {
      type: Object as PropType<schema.Struct>,
      required: true
    }
  }
})
</script>

<template>
  <div class="example-view">
    <pre><code>{{ JSON.stringify(currentStruct, null, 2) }}</code></pre>
  </div>
</template>

<style scoped>
.example-view {
  padding: 16px;
  background: #f8f8f8;
  border-radius: 4px;
}

pre {
  margin: 0;
  overflow-x: auto;
}

@media (prefers-color-scheme: dark) {
  .example-view {
    background: #2a2a2a;
  }
}
</style>
