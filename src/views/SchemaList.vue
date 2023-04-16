<template>
  <div class="hsv-schema-dropdown">
    <select v-model="selectedSchema" @change="selectSchema">
      <option value="null" disabled selected>Select a schema</option>
      <option v-for="schema in schemaList" :value="schema">{{ schema.name }}</option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export interface SchemaFile {
  name: string
  file: string
}

export default defineComponent({
  emits: ['select-schema'],
  setup(_, { emit }) {
    const schemaList = ref<SchemaFile[]>([])
    const selectedSchema = ref<SchemaFile | null>(null)

    const fetchSchemaList = async () => {
      try {
        const response = await fetch('/schemas/list.json')
        if (response.ok) {
          schemaList.value = await response.json()
        } else {
          console.error('Failed to fetch schema list')
        }
      } catch (error) {
        console.error('Error fetching schema list:', error)
      }
    }

    const selectSchema = () => {
      emit('select-schema', selectedSchema.value)
    }

    fetchSchemaList()

    return {
      schemaList,
      selectedSchema,
      selectSchema
    }
  }
})
</script>
