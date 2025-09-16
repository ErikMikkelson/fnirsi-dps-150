<script setup lang="ts">


defineProps({
  port: {
    type: Object,
    default: null,
  },
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['change-voltage', 'change-current']);

function formatNumber(n: number) {
  if (n < 10) {
    return n.toFixed(3);
  } else {
    return n.toFixed(2);
  }
}

function formatProtectionState(state: string) {
  return {
    '': 'Normal',
    'OVP': 'Over Voltage Protection',
    'OCP': 'Over Current Protection',
    'OPP': 'Over Power Protection',
    'OTP': 'Over Temperature Protection',
    'LVP': 'Low Voltage Protection',
    'REP': 'Reverse Connection Protection',
  }[state] || state;
}
</script>

<template>
  <div class="main-view" :class="{ enabled: device.outputClosed }" style="width: 300px">
    <div class="changeable voltage" @click="emit('change-voltage')">
      <span>{{ port ? formatNumber(device.outputVoltage) : '-' }}</span><span class="unit">V</span>
      <div class="set">
        vset <span>{{ formatNumber(device.setVoltage) }}</span><span class="unit">V</span>
      </div>
    </div>
    <div class="changeable current" @click="emit('change-current')">
      <span>{{ port ? formatNumber(device.outputCurrent) : '-' }}</span><span class="unit">A</span>
      <div class="set">
        cset <span>{{ formatNumber(device.setCurrent) }}</span><span class="unit">A</span>
      </div>
    </div>
    <div class="power">
      <span>{{ port ? formatNumber(device.outputPower) : '-' }}</span><span class="unit">W</span>
    </div>
    <v-chip :class="{ current: device.mode === 'CC', voltage: device.mode === 'CV' }" variant="flat" size="large">
      {{ device.mode }}
      <v-tooltip activator="parent" location="start">
        {{ device.mode === 'CC' ? 'Constant Current' : 'Constant Voltage' }}
      </v-tooltip>
    </v-chip>
    <v-chip :color="device.protectionState ? 'red' : 'green'" variant="flat" size="large">
      {{ device.protectionState || 'OK' }}
      <v-tooltip activator="parent" location="start">
        {{ formatProtectionState(device.protectionState) }}
      </v-tooltip>
    </v-chip>
  </div>
</template>
