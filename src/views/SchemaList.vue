<template>
  <div class="schema-dropdown">
    <select v-model="selectedSchema" @change="selectSchema">
      <option value="null" disabled selected>Select a schema</option>
      <option v-for="schema in schemaList" :value="schema">{{ schema.name }}</option>
    </select>
  </div>
  <hr/>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  emits: ['select-schema'],
  setup(_, { emit }) {
    const schemaList = ref([])
    const selectedSchema = ref(null)

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

<style scoped>

.schema-dropdown{
  width: 100%;
}

.select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.select select {
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1.2;
  color: #444;
  border: 2px solid #ccc;
  border-radius: 4px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.select select:hover {
  border-color: #888;
}

.select select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(90, 141, 214, 0.2);
  border-color: #5a8dd6;
}

.select::after {
  content: '\25bc';
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  font-size: 0.7em;
  line-height: 1.5;
  color: #888;
  pointer-events: none;
}

hr{
  border: 1px solid #e5e5e5;
  margin: 1rem 0rem 1rem 0rem;
}

</style>
