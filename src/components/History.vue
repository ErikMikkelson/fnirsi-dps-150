<script setup lang="ts">


defineProps({
  history: {
    type: Array,
    required: true,
  },
  historyTableHeaders: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['download-history', 'reset-history']);

function formatDateTime(date: Date) {
  return date.toISOString();
}

function formatNumber(n: number) {
  if (n < 10) {
    return n.toFixed(3);
  } else {
    return n.toFixed(2);
  }
}
</script>

<template>
  <v-row>
    <v-col>
      <v-btn @click="emit('download-history')" :disabled="!history.length" color="deep-orange-darken-1" prepend-icon="mdi-download-box">Download</v-btn>
    </v-col>
    <v-col style="text-align: right">
      <v-btn @click="emit('reset-history')" :disabled="!history.length" color="blue-grey-lighten-2" prepend-icon="mdi-close-box">Reset</v-btn>
    </v-col>
  </v-row>
  <v-data-table density="compact" :headers="historyTableHeaders" :items="history" :items-per-page="10">
    <template v-slot:item.time="{ item }">
      {{ formatDateTime(item.time) }}
    </template>
    <template v-slot:item.v="{ item }">
      {{ formatNumber(item.v) }}V
    </template>
    <template v-slot:item.i="{ item }">
      {{ formatNumber(item.i) }}A
    </template>
    <template v-slot:item.p="{ item }">
      {{ formatNumber(item.p) }}W
    </template>
  </v-data-table>
</template>
