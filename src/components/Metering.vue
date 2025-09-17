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
  <div v-if="device">
    <v-btn @click="emit('start-metering')" color="green" v-if="device.meteringClosed">Start</v-btn>
    <v-btn @click="emit('stop-metering')" color="red" v-else>Stop</v-btn>
    <v-table density="compact" style="max-width: 30em">
      <tbody>
        <tr>
          <td>Output Capacity</td>
          <td>
            <span v-if="(device.outputCapacity || 0) < 1">
              {{ formatNumber((device.outputCapacity || 0) * 1000) }}mAh
            </span>
            <span v-else>
              {{ formatNumber(device.outputCapacity || 0) }}Ah
            </span>
          </td>
        </tr>
        <tr>
          <td>Output Energy</td>
          <td>
            <span v-if="(device.outputEnergy || 0) < 1">
              {{ formatNumber((device.outputEnergy || 0) * 1000) }}mWh
            </span>
            <span v-else>
              {{ formatNumber(device.outputEnergy || 0) }}Wh
            </span>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div v-else>
    <p>Loading device information...</p>
  </div>
</template>
