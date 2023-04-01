<template>
  <div id="app">
    <div class="split-view">
      <div class="sidebar">
        <div v-for="(field, index) in root.fields" :key="index">
          <button @click="selectTab(index)" :class="{ active: selectedTabIndex === index }">
            {{ field.name }}
          </button>
        </div>
      </div>
      <div class="content">
        {{ selectedRootField.desc }}
        <br/>
        <br/>
        Type: <code>{{ schema.typeDisplay(selectedRootField.type) }}</code>
        <br/>
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
const root: schema.Struct = Root

const selectedTabIndex = ref(0)
const selectTab = (index) => {
  selectedTabIndex.value = index;
}

const selectedRootField = computed(() => root.fields[selectedTabIndex.value])
const liftedStructs = computed(() => {
   const refs = schema.liftStructs(root.fields[selectedTabIndex.value].type);
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
</style>
