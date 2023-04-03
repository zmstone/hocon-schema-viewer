<template>
  <ul class="nav-list">
    <li v-for="(schema, index) in schemaList" :key="index">
      <span @click="selectSchema(schema)" :class="{ 'active-tab': selectedSchema === schema }">{{
        schema.name
      }}</span>
    </li>
  </ul>
  <hr class="divider" />
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

    const selectSchema = (schema) => {
      selectedSchema.value = schema
      emit('select-schema', schema)
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
.nav-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: contents;
}

.nav-list li {
  padding: 2px 0;
}

.sub-buttons li {
  padding: 2px 0;
}

.nav-list li span {
  display: inline-block;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.nav-list li span:hover {
  background-color: #eee;
}

.active-tab {
  color: #fff;
  background-color: #5a8dd6;
}

.divider {
  border: 1px solid #e5e5e5;
  margin: 1rem 0rem 1rem 0rem;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .nav-list li span:hover {
    background-color: #3a3a3a;
  }
}
</style>
