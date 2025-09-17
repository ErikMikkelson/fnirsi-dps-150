<script setup lang="ts">
import { computed } from 'vue';
import { useDeviceStore } from '../store/device';

const props = defineProps({
  device: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['change-voltage', 'change-current']);

const deviceStore = useDeviceStore();

// Check if we're in test mode or actually connected
const isConnected = computed(() => {
  return !!import.meta.env.VITE_USE_TEST_CLIENT || !!deviceStore.port;
});

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
  <div v-if="device" class="main-view" :class="{ enabled: device.outputEnabled && isConnected }" style="width: 300px">
    <div class="changeable voltage" @click="emit('change-voltage')">
      <span>{{ formatNumber(device.voltage || 0) }}</span><span class="unit">V</span>
      <div class="set">
        vset <span>{{ formatNumber(device.setVoltage || 0) }}</span><span class="unit">V</span>
      </div>
    </div>
    <div class="changeable current" @click="emit('change-current')">
      <span>{{ formatNumber(device.current || 0) }}</span><span class="unit">A</span>
      <div class="set">
        cset <span>{{ formatNumber(device.setCurrent || 0) }}</span><span class="unit">A</span>
      </div>
    </div>
    <div class="power">
      <span>{{ formatNumber(device.power || 0) }}</span><span class="unit">W</span>
    </div>
    <v-chip :class="{ current: device.cv_cc === 'CC', voltage: device.cv_cc === 'CV' }" variant="flat" size="large">
      {{ device.cv_cc || 'CV' }}
      <v-tooltip activator="parent" location="start">
        {{ device.cv_cc === 'CC' ? 'Constant Current' : device.cv_cc === 'CV' ? 'Constant Voltage' : 'Constant Voltage' }}
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
