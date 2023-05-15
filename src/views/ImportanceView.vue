<template>
  <div class="top-banner">
    <div class="importance-label">Importance level:</div>
    <div
      v-for="(level, index) in importanceLevels"
      :key="index"
      :class="{ selected: isSameLevel(selected, level) }"
      class="importance-level"
      @click="selectImportance(level)"
    >
      {{ level }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'ImportanceView',
  props: {
    selectedInUri: {
      type: String,
      required: true
    }
  },
  setup(props, { emit }) {
    const importanceLevels = ['ALL', 'Low', 'Medium', 'High']
    const selected = ref<string>(props.selectedInUri)

    function selectImportance(level: string) {
      if (isSameLevel(selected.value, level)) return
      selected.value = level
      emit('importanceLevelChanged', level)
    }
    function isSameLevel(selected: string, level: string) {
      return selected.toLowerCase() === level.toLowerCase()
    }
    watch(
      () => props.selectedInUri,
      (newSelected) => {
        if (newSelected) {
          selected.value = newSelected
        }
      }
    )

    return {
      importanceLevels,
      selected,
      selectImportance,
      isSameLevel
    }
  }
})
</script>

<style scoped>
.top-banner {
  display: flex;
  justify-content: space-around;
  justify-content: flex-start;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.8em;
}

.importance-label {
  padding: 4px;
}
.importance-level {
  padding: 4px;
  margin-left: 5px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
}

.selected {
  background-color: #e4f5ea;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .top-banner {
    background-color: #333;
  }

  .importance-level {
    border: 1px solid #666;
    color: #fff;
  }

  .importance-level:hover {
    background-color: #444;
  }

  .selected {
    background-color: #555;
  }
}
</style>
