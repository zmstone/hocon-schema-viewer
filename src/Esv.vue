<template>
  <div id="app">
    <struct-view :struct="root" />
  </div>
</template>

<script setup lang="ts">

import { defineComponent } from 'vue';
import StructView from './views/StructView.vue';
import AllStructs from './data/data';
import * as schema from './interfaces/schema';

const root: schema.Struct = AllStructs[0];
console.log(root);

</script>

<style>
</style>
