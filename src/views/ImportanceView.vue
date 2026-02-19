<template>
  <div class="top-banner">
    <div class="importance-label">Importance</div>
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
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  border-radius: 999px;
  border: 1px solid var(--line-subtle);
  background: var(--panel-secondary);
  padding: 0.2rem;
}

.importance-label {
  padding: 0.25rem 0.55rem;
  color: var(--text-dim);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.importance-level {
  padding: 0.3rem 0.7rem;
  margin-left: 0;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 0.8rem;
  color: var(--text-dim);
  transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease;
}

.importance-level:hover {
  border-color: var(--line-strong);
  color: var(--accent);
  background: #fff;
}

.selected {
  background: rgba(94, 78, 255, 0.1);
  border-color: rgba(94, 78, 255, 0.3);
  color: var(--accent);
}
</style>
