<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

type StructsIndex = { [name: string]: number }

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
      trype: String,
      required: true
    }
  },
  setup(props, { emit }) {
    let defaultRoot = props.rootFields[0].name
    let defaultExpand = ''
    const currentRootSelected = ref<string>(defaultRoot)
    const currentExpandSelected = ref<string>(defaultExpand)
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
      if (newRoot === '') {
        params.delete('r')
      } else {
        params.set('r', newRoot)
      }
      window.history.pushState({}, '', `${currentURL.pathname}?${params}`)
    }
    const rootClicked = (displayType: schema.DisplayType) => {
      if (currentRootSelected.value === displayType.list_display) {
        // Clicking the same root again - collapse it
        currentRootSelected.value = ''
        currentExpandSelected.value = ''
        pushState('')
        return
      }
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
      isVisible
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
      const isExpand = f.name === this.currentRootSelected
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
  <div>
    <ul class="root-fields-list">
      <li v-for="(field, index) in rootFields" :key="index">
        <div
          v-if="isVisible(field)"
          class="root-field-display"
          @click="rootClicked(fieldToDisplayType(field))"
        >
          <span :class="{ 'selected-root-field': currentRootSelected === field.name }">
            {{ field.name }} {{ annotate(field.type) }}
          </span>
          <span class="root-field-fold-state">
            {{ maybeFold(field) }}
          </span>
        </div>
        <ul class="root-fields-sub-list" v-if="currentRootSelected === field.name">
          <li v-for="(expand, expIndex) in field.expands || []" :key="expIndex">
            <div v-if="isVisible(expand)" class="root-field-display" @click="expandClicked(expand)">
              <span
                :class="{ 'selected-root-field': currentExpandSelected === expand.list_display }"
                >{{ selectorSymbol(expand) }}{{ expand.list_display }}</span
              >
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.selected-root-field {
  background-color: #e4f5ea;
  border-radius: 4px;
}

.root-field-fold-state {
  font-size: 0.6em;
  margin: 0;
  transform: translateY(2px); /* Slight downward adjustment */
  display: inline-block;
}

.root-field-display {
  display: flex;
  align-items: center;
  margin: 4px;
  padding-left: 0;
}

.root-fields-list {
  padding-left: 0;
  margin: 0;
  list-style-type: none;
}

.root-fields-sub-list {
  padding-left: 12px;
  margin: 0;
  list-style-type: none;
}

.root-fields-list li span {
  cursor: pointer;
  display: block;
  padding: 2px 4px;
  border-radius: 6px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .selected-root-field {
    background-color: #2e5742;
    color: #d9e9d9;
  }
}
</style>
