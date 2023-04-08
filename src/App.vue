<script setup lang="ts">
import HSV from './HSV.vue'
import SchemaList from './views/SchemaList.vue'
</script>

<template>
  <div>
    <SchemaList @select-schema="handleSelectSchema" />
    <HSV />
  </div>
</template>
