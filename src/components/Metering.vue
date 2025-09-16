<script setup lang="ts">


defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['start-metering', 'stop-metering']);

function formatNumber(n: number) {
  if (n < 10) {
    return n.toFixed(3);
  } else {
    return n.toFixed(2);
  }
}
</script>

<template>
  <v-btn @click="emit('start-metering')" color="green" v-if="device.meteringClosed">Start</v-btn>
  <v-btn @click="emit('stop-metering')" color="red" v-else>Stop</v-btn>
  <v-table density="compact" style="max-width: 30em">
    <tbody>
      <tr>
        <td>Output Capacity</td>
        <td>
          <span v-if="device.outputCapacity < 1">
            {{ formatNumber(device.outputCapacity * 1000) }}mAh
          </span>
          <span v-else>
            {{ formatNumber(device.outputCapacity) }}Ah
          </span>
        </td>
      </tr>
      <tr>
        <td>Output Energy</td>
        <td>
          <span v-if="device.outputEnergy < 1">
            {{ formatNumber(device.outputEnergy * 1000) }}mWh
          </span>
          <span v-else>
            {{ formatNumber(device.outputEnergy) }}Wh
          </span>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
