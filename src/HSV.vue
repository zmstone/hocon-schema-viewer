<template>
  <div id="app">
    <div class="split-view">
      <div class="sidebar">
        <div v-for="(field, index) in root.fields" :key="index">
          <button @click="selectTab(index)" :class="{ active: selectedTabIndex === index }">
            {{ field.name }} {{ maybeArray(field.type) }} {{ maybeExpandable(field.type) }}
          </button>
          <ul v-show="expanded[index]" class="sub-buttons">
            <li
              v-for="(expand, expIndex) in getExpands(field.type)"
              :key="expIndex"
              @click="selectType(expand.type)"
            >
              {{ expand.label }}
            </li>
          </ul>
        </div>
      </div>
      <div class="content">
        <div class="desc">{{ displayType.desc }}</div>
        <!-- br/><div class="type_display">Type: <code>{{ displayType.type_display }}</code></div><br/> -->
        <struct-view v-for="(st, i) in liftedStructs" :key="i" :struct="st" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed } from 'vue'
import StructView from './views/StructView.vue'
import { Root, findStruct } from './data/data'
import * as schema from './interfaces/schema'
import { stringify } from 'querystring';
const root: schema.Struct = Root

const selectedTabIndex = ref(0)
const expanded = ref([]);
const selectTab = (index) => {
  selectedType.value = null;
  selectedTabIndex.value = index;
  toggleExpand(index);
}

const selectedType = ref(null);
const selectType = (type) => {
  selectedType.value = type;
};

const toggleExpand = (index) => {
  if (expanded.value[index] === undefined) {
    expanded.value[index] = false;
  }
  expanded.value[index] = !expanded.value[index];
};

const maybeArray = (type: schema.FieldType) => {
  if(type.kind === 'array') {
    return '[...]'
  }
  return ''
}

const isExpandable = (type: schema.FieldType) => {
  return getExpands(type).length > 0;
}

const maybeExpandable = (type: schema.FieldType) => {
  return isExpandable(type) ? '+' : '';
}

const getExpands = (type: schema.FieldType) => {
  if(type.kind === 'array') {
    return getExpands(type.elements);
  }
  if(type.kind === 'union') {
    const displayNames = type.members.map((m) => {
      return schema.typeDisplay(m);
    });
    const tidyDisplayNames = tidyNames(displayNames);
    return tidyDisplayNames.map((tidyName, i) => {
      return {
        label: tidyName,
        desc: type.members[i].desc,
        type: type.members[i]
      }});
  }
  return [];
}

function tidyNames(strings: string[]): string[] {
  // remove 'authn-' prefix
  return strings.map((s) => {
    return s.replace('authn-', '');
  }).map((s) => {
    // remove ':authentication' suffix
    return s.replace(':authentication', '');
});
}

const displayType = computed(() => {
  if (selectedType.value) {
    return {
      label: schema.typeDisplay(selectedType.value),
      desc: selectedType.value.desc,
      type: selectedType.value
    };
  } else {
    const field = root.fields[selectedTabIndex.value];
    return {
      desc: field.desc,
      label: schema.typeDisplay(field.type),
      type: field.type
    };
  }
});

const liftedStructs = computed(() => {
   const refs = schema.liftStructs(displayType.value.type)
   return refs.map((r: schema.StructReference) => findStruct(r.name));
});

</script>

<style>
.split-view {
  display: flex;
}

.sidebar {
  width: 250px;
  border-right: 1px solid #ccc;
  padding: 10px;
}

.content {
  flex: 1;
  padding: 10px;
}

button.active {
  background-color: #ccc;
}

.desc {
  padding: 10px;
  background-color: #f5f5f5
}

.type_display {
  padding: 10px;
  background-color: #e4f5ea
}
.sub-buttons {
  padding-left: 20px;
}
</style>
