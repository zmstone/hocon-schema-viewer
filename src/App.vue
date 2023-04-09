<script setup lang="ts">
import HoconSchema from './views/HoconScehma.vue'
import SchemaList from './views/SchemaList.vue'
</script>

<template>
  <div>
    <SchemaList @select-schema="handleSelectSchema" />
    <HoconSchema />
  </div>
</template>
