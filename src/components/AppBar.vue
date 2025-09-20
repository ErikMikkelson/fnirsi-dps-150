<script setup lang="ts">
const { device, port, connect, disconnect, enable, disable, formatNumber } = defineProps({
  device: { type: Object, required: true },
  port: { type: [Object, null], required: true },
  connect: { type: Function, required: true },
  disconnect: { type: Function, required: true },
  enable: { type: Function, required: true },
  disable: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
});
</script>

<template>
  <v-app-bar density="default">
    <v-app-bar-title>
      FNIRSI DPS-150
      <span class="ms-2" style="font-size: 50%">
        {{ device.model }} SN:{{ device.serialNumber }} FW:{{ device.firmwareVersion }}
      </span>
    </v-app-bar-title>

    <v-spacer></v-spacer>

    <v-chip color="blue" variant="flat" class="me-2">
      {{ formatNumber(device.temperature) }}℃
    </v-chip>
    <v-chip color="orange" variant="flat" class="me-2">
      Input: {{ formatNumber(device.inputVoltage) }}V
    </v-chip>

    <v-btn class="connect" icon variant="flat" color="red" @click="connect" v-if="!port">
      <v-icon>mdi-lan-disconnect</v-icon>
      <v-tooltip activator="parent" location="start">Connect</v-tooltip>
    </v-btn>
    <v-btn class="disconnect" icon variant="flat" color="green" @click="disconnect" v-else>
      <v-icon>mdi-lan-connect</v-icon>
      <v-tooltip activator="parent" location="start">Disconnect</v-tooltip>
    </v-btn>

    <v-btn icon variant="flat" color="green" @click="enable" v-if="!device.outputEnabled" title="Enable" :disabled="!port">
      <v-icon>mdi-power-plug</v-icon>
      <v-tooltip activator="parent" location="start">Enable</v-tooltip>
    </v-btn>

    <v-btn icon variant="flat" color="red" @click="disable" v-if="device.outputEnabled" title="Disable">
      <v-icon>mdi-power-plug-off</v-icon>
      <v-tooltip activator="parent" location="start">Disable</v-tooltip>
    </v-btn>
  </v-app-bar>
</template>

<style scoped>
.ms-2 {
  margin-left: 0.5em;
}
.me-2 {
  margin-right: 0.5em;
}
</style>
