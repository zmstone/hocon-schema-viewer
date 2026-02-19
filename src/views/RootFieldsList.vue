<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

export default defineComponent({
  name: 'RootFieldsList',
  props: {
    rootFields: {
      type: Array as PropType<schema.Field[]>,
      required: true
    },
    currentDisplay: {
      type: Object as PropType<schema.DisplayType>,
      required: true
    },
    importanceLevel: {
      type: String,
      required: true
    }
  },
  setup(props, { emit }) {
    let defaultRoot = props.rootFields[0].name
    let defaultExpand = ''
    const currentRootSelected = ref<string>(defaultRoot)
    const currentExpandSelected = ref<string>(defaultExpand)
    const searchTerm = ref<string>('')
    function updateSelected(display: schema.DisplayType | undefined) {
      if (display) {
        if (display.tpath && display.tpath !== '') {
          currentRootSelected.value = display.tpath
          currentExpandSelected.value = display.list_display
        } else {
          currentRootSelected.value = display.list_display
          currentExpandSelected.value = ''
        }
      }
    }
    updateSelected(props.currentDisplay)
    const pushState = (newRoot: string) => {
      // Get the current URL
      const currentURL = new URL(window.location.href)
      // Update the 'r' parameter while preserving other parameters
      const params = currentURL.searchParams
      params.set('r', newRoot)
      window.history.pushState({}, '', `${currentURL.pathname}?${params}`)
    }
    const rootClicked = (displayType: schema.DisplayType) => {
      pushState(displayType.list_display)
      emit('selected', displayType)
    }
    const expandClicked = (displayType: schema.DisplayType) => {
      let sep = schema.fieldSelectorSymbol
      if (displayType.is_union_member) {
        sep = schema.unionMemberSelectorSymbol
      }
      pushState(`${currentRootSelected.value}${sep}${displayType.list_display}`)
      emit('selected', displayType)
    }

    const isVisible = (item: schema.HasImportance): boolean => {
      return schema.isVisible(item, props.importanceLevel as string)
    }
    const filteredRootFields = computed(() => {
      const term = searchTerm.value.trim().toLowerCase()
      if (term === '') {
        return props.rootFields
      }
      return props.rootFields.filter((field) => {
        if (field.name.toLowerCase().includes(term)) {
          return true
        }
        return (field.aliases || []).some((alias) => alias.toLowerCase().includes(term))
      })
    })
    watch(
      () => props.currentDisplay,
      (newDisplay) => {
        if (newDisplay) {
          updateSelected(newDisplay)
        }
      }
    )

    return {
      currentRootSelected,
      currentExpandSelected,
      rootClicked,
      expandClicked,
      isVisible,
      searchTerm,
      filteredRootFields
    }
  },
  methods: {
    annotate(type: schema.FieldType): string {
      if (type.kind === 'array') {
        return '[...]'
      }
      if (type.kind === 'map') {
        return schema.shortTypeDisplay(type)
      }
      return ''
    },
    fieldToDisplayType(f: schema.Field): schema.DisplayType {
      return schema.fieldToDisplayType('', f)
    },
    maybeFold(f: schema.Field): string {
      const isExpand = f.name === this.currentExpandSelected
      const expands = f.expands
      if (!expands || expands.length === 0) {
        return ''
      }
      const expandChar = '\u25B6' // Right-pointing triangle (▶)
      const collapseChar = '\u25BC' // Down-pointing triangle (▼)
      if (isExpand) {
        return collapseChar
      }
      return expandChar
    },
    selectorSymbol(exp: schema.DisplayType): string {
      if (exp.is_union_member) {
        return schema.unionMemberSelectorSymbol
      } else {
        return schema.fieldSelectorSymbol
      }
    }
  }
})
</script>

<template>
  <div class="root-browser">
    <div class="search-box">
      <input
        v-model="searchTerm"
        type="text"
        autocomplete="off"
        placeholder="Filter fields..."
        aria-label="Filter root fields"
      />
    </div>
    <ul class="root-fields-list">
      <li v-for="(field, index) in filteredRootFields" :key="index" class="root-field-entry">
        <div
          v-if="isVisible(field)"
          class="root-field-display clickable"
          :class="{ selected: currentRootSelected === field.name }"
          @click="rootClicked(fieldToDisplayType(field))"
        >
          <span class="field-name">{{ field.name }} {{ annotate(field.type) }}</span>
          <span class="root-field-fold-state">{{ maybeFold(field) }}</span>
        </div>
        <ul class="root-fields-sub-list" v-if="currentRootSelected === field.name && isVisible(field)">
          <li v-for="(expand, expIndex) in field.expands || []" :key="expIndex">
            <div
              v-if="isVisible(expand)"
              class="root-field-display clickable sub-level"
              :class="{ selected: currentExpandSelected === expand.list_display }"
              @click="expandClicked(expand)"
            >
              <span class="field-name">{{ selectorSymbol(expand) }}{{ expand.list_display }}</span>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.root-browser {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.search-box {
  padding: 0 0.5rem;
}

.search-box input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--line-subtle);
  background: var(--panel-primary);
  color: var(--text-strong);
  padding: 0.52rem 0.62rem;
  font-size: 0.85rem;
}

.search-box input:focus-visible {
  outline: 2px solid rgba(94, 78, 255, 0.35);
  outline-offset: 1px;
}

.root-field-fold-state {
  color: var(--text-soft);
  font-size: 0.8rem;
}

.root-field-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0.2rem 0;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid transparent;
}

.clickable {
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
}

.clickable:hover {
  border-color: var(--line-strong);
  background: #fff;
  transform: translateX(2px);
}

.selected {
  background: rgba(94, 78, 255, 0.08);
  border-color: rgba(94, 78, 255, 0.25);
  color: var(--accent);
}

.root-fields-list {
  padding: 0;
  margin: 0;
  list-style-type: none;
}

.root-fields-sub-list {
  padding-left: 0.4rem;
  margin: 0.2rem 0 0.4rem;
  list-style-type: none;
  border-left: 1px dashed var(--line-subtle);
}

.sub-level {
  margin-left: 0.4rem;
  font-size: 0.9rem;
}

.field-name {
  overflow-wrap: anywhere;
}
</style>
