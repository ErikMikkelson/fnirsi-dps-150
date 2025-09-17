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
  <div v-if="device" class="main-view" :class="{ enabled: device.outputEnabled }" style="width: 300px">
    <div class="changeable voltage" @click="emit('change-voltage')">
      <span>{{ port ? formatNumber(device.outputVoltage || 0) : '-' }}</span><span class="unit">V</span>
      <div class="set">
        vset <span>{{ formatNumber(device.setVoltage || 0) }}</span><span class="unit">V</span>
      </div>
    </div>
    <div class="changeable current" @click="emit('change-current')">
      <span>{{ port ? formatNumber(device.outputCurrent || 0) : '-' }}</span><span class="unit">A</span>
      <div class="set">
        cset <span>{{ formatNumber(device.setCurrent || 0) }}</span><span class="unit">A</span>
      </div>
    </div>
    <div class="power">
      <span>{{ port ? formatNumber(device.outputPower || 0) : '-' }}</span><span class="unit">W</span>
    </div>
    <v-chip :class="{ current: device.mode === 'CC', voltage: device.mode === 'CV' }" variant="flat" size="large">
      {{ device.mode || 'Unknown' }}
      <v-tooltip activator="parent" location="start">
        {{ device.mode === 'CC' ? 'Constant Current' : device.mode === 'CV' ? 'Constant Voltage' : 'Unknown Mode' }}
      </v-tooltip>
    </v-chip>
    <v-chip :color="device.protectionState ? 'red' : 'green'" variant="flat" size="large">
      {{ device.protectionState || 'OK' }}
      <v-tooltip activator="parent" location="start">
        {{ formatProtectionState(device.protectionState) }}
      </v-tooltip>
    </v-chip>
  </div>
  <div v-else>
    <p>Loading device information...</p>
  </div>
</template>
