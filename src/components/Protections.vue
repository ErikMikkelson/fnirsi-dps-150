<script setup lang="ts">


defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['change-ovp', 'change-ocp', 'change-opp', 'change-otp', 'change-lvp']);

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
    <v-table density="compact" style="max-width: 30em">
      <tbody>
        <tr>
          <th>Over Voltage Protection</th>
          <td @click="emit('change-ovp')" class="changeable">
            {{ formatNumber(device.overVoltageProtection || 0) }}V
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
        <tr>
          <th>Over Current Protection</th>
          <td @click="emit('change-ocp')" class="changeable">
            {{ formatNumber(device.overCurrentProtection || 0) }}A
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
        <tr>
          <th>Over Power Protection</th>
          <td @click="emit('change-opp')" class="changeable">
            {{ formatNumber(device.overPowerProtection || 0) }}W
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
        <tr>
          <th>Over Temperature Protection</th>
          <td @click="emit('change-otp')" class="changeable">
            {{ formatNumber(device.overTemperatureProtection || 0) }}℃
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
        <tr>
          <th>Low Voltage Protection</th>
          <td @click="emit('change-lvp')" class="changeable">
            {{ formatNumber(device.lowVoltageProtection || 0) }}V
            <v-btn size="x-small" color="green" variant="flat">set</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div v-else>
    <p>Loading device information...</p>
  </div>
</template>
