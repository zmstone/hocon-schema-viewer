<script lang="ts">
import { defineComponent, ref } from 'vue'
import * as schema from '../interfaces/schema'

type StructsIndex = { [name: string]: number }

export default defineComponent({
  name: 'RootFieldsList',
  props: {
    rootFields: {
      type: Array,
      required: true
    }
  },
  setup(props, { emit }) {
    // initialize the current root name, Must be the same as displayType in MainView
    // i.e. must be the first root level field
    const currentRootSelected = ref<number>(0)
    const currentExpandSelected = ref<number>(-1)
    const rootClicked = (index: number, displayType: schema.DisplayType) => {
      currentRootSelected.value = index
      currentExpandSelected.value = -1
      emit('selected', displayType)
    }
    const expandClicked = (index: number, displayType: schema.DisplayType) => {
      currentExpandSelected.value = index
      emit('selected', displayType)
    }

    return {
      currentRootSelected,
      currentExpandSelected,
      rootClicked,
      expandClicked
    }
  },
  methods: {
    annotate(type: schema.FieldType) {
      if (type.kind === 'array') {
        return '[...]'
      }
      if (type.kind === 'map') {
        return schema.shortTypeDisplay(type)
      }
      return ''
    },
    fieldToDisplayType(f: Field) {
      return schema.fieldToDisplayType(f)
    }
  }
})
</script>

<template>
  <div>
    <ul class="root-fields-list">
      <li
        v-for="(field, index) in rootFields"
        :key="index"
        :class="{ selected: currentRootSelected === index }"
      >
        <span @click="rootClicked(index, fieldToDisplayType(field))">
          {{ field.name }}{{ annotate(field.type) }}
        </span>
        <ul class="root-fields-sub-list" v-if="currentRootSelected === index">
          <li
            v-for="(expand, expIndex) in field.expands"
            :key="expIndex"
            :class="{ selected: currentExpandSelected === expIndex }"
          >
            <span @click="expandClicked(expIndex, expand)">
              {{ expand.list_display }}
            </span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.root-fields-list {
  padding-left: 0;
  margin: 0;
  list-style-type: none;
}

.root-fields-sub-list {
  padding-left: 20px;
  margin: 0;
  list-style-type: none;
}

.root-fields-list li span {
  cursor: pointer;
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.root-fields-list li span:hover {
  background-color: var(--hover-bg-light);
}

.root-fields-list li.selected > span {
  background-color: var(--highlight-bg-light);
  font-weight: bold;
}

.root-fields-sub-list li span {
  cursor: pointer;
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.root-fields-sub-list li span:hover {
  background-color: var(--hover-bg-light);
}

.root-fields-sub-list li.selected > span {
  background-color: var(--highlight-bg-light);
  font-weight: bold;
}

@media (prefers-color-scheme: dark) {
  .root-fields-list li span:hover,
  .root-fields-sub-list li span:hover {
    background-color: var(--hover-bg-dark);
  }

  .root-fields-list li.selected > span,
  .root-fields-sub-list li.selected > span {
    background-color: var(--highlight-bg-dark);
  }
}
</style>
