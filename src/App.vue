<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { sprintf } from 'sprintf-js';
import { useDeviceStore } from './store/device';
import {
  VOLTAGE_SET,
  CURRENT_SET,
  GROUP1_VOLTAGE_SET,
  GROUP1_CURRENT_SET,
  OVP,
  OCP,
  OPP,
  OTP,
  LVP,
  BRIGHTNESS,
  VOLUME,
} from './clients/constants';
import { functionWithTimeout } from './utils';
import Graph from './components/Graph.vue';
import NumberInput from './components/NumberInput.vue';
import OutputView from './components/OutputView.vue';
import MemoryGroups from './components/MemoryGroups.vue';
import Protections from './components/Protections.vue';
import Metering from './components/Metering.vue';
import Program from './components/Program.vue';
import History from './components/History.vue';
import Settings from './components/Settings.vue';

const deviceStore = useDeviceStore();
const {
  port,
  device,
  history,
  connect,
  disconnect,
  enable,
  disable,
  startMetering,
  stopMetering,
  setFloatValue,
  setByteValue,
  executeCommands,
  abortExecuteCommands,
  resetHistory,
} = deviceStore;

const historyTableHeaders = [
  { title: 'Time', align: 'start', sortable: true, key: 'time' },
  { title: 'Voltage', key: 'v', sortable: false, align: 'end' },
  { title: 'Current', key: 'i', sortable: false, align: 'end' },
  { title: 'Power', key: 'p', sortable: false, align: 'end' },
];

const groupsInput = reactive({
  1: { setVoltage: null, setCurrent: null },
  2: { setVoltage: null, setCurrent: null },
  3: { setVoltage: null, setCurrent: null },
  4: { setVoltage: null, setCurrent: null },
  5: { setVoltage: null, setCurrent: null },
  6: { setVoltage: null, setCurrent: null },
});

const graphOptions = reactive({
  voltage: true,
  current: true,
  power: true,
  duration: 30,
});

const showNumberInput = ref(false);
const numberInput = reactive({
  result: '' as number | string,
  title: '',
  description: '',
  descriptionHtml: '',
  unit: '',
  units: [] as string[],
  input: '',
  prev: '' as number | string,
  key: undefined as number | undefined,
});

const tab = ref(null);
const connectOverlay = ref(false);
const program = ref('');
const programRunning = ref(false);
const programRemaining = ref(0);

// Computed property to determine if device is connected (including test mode)
const isConnected = computed(() => {
  return !!port || !!import.meta.env.VITE_USE_TEST_CLIENT;
});

const programExamples = reactive([
  {
    name: 'Sweep Voltage',
    code: `
      const START = 1;
      const END   = 10;
      const STEP  = 0.1;
      V(START)
      ON()
      SLEEP(1000)
      while (V() + STEP < END) {
        V(V() + STEP)
        SLEEP(100)
      }
      SLEEP(1000)
      OFF()
    `,
  },
  {
    name: 'Sweep Current',
    code: `
      const START = 0.1;
      const END   = 1;
      const STEP  = 0.01;
      I(START)
      ON()
      SLEEP(1000)
      while (I() + STEP < END) {
        I(I() + STEP)
        SLEEP(100)
      }
      SLEEP(1000)
      OFF()
    `,
  },
  {
    name: 'Sine Wave',
    code: `
      const CENTER = 10;
      const RIPPLE = 2;
      V(CENTER)
      ON()
      SLEEP(1000)
      times(1000, (i) => {
        V(Math.sin(i / 20) * RIPPLE + CENTER)
        SLEEP(50)
      })
      OFF()
    `,
  },
]);

const groups = computed(() => {
  return [1, 2, 3, 4, 5, 6].map((i) => {
    return {
      n: i,
      setVoltage: device[`group${i}setVoltage`],
      setCurrent: device[`group${i}setCurrent`],
    };
  });
});

const graph = ref<InstanceType<typeof Graph> | null>(null);

function updateGraph() {
  graph.value?.updateGraph();
}

watch(history, updateGraph, { deep: true });
watch(() => port, (newPort) => {
  // In test mode, don't show overlay if we're using test client
  if (import.meta.env.VITE_USE_TEST_CLIENT) {
    connectOverlay.value = false;
  } else {
    connectOverlay.value = !newPort;
  }
}, { immediate: true });
watch(graphOptions, updateGraph, { deep: true });

onMounted(() => {
  programExamples.forEach((example) => {
    example.code = example.code.trim().replace(/\t+/g, '');
  });
  program.value = programExamples[0].code;
  updateGraph();
});

async function onNumberInput(value: number) {
  if (value) {
    await setFloatValue(numberInput.key, value);
  }
}

function openNumberInput(config: {
  title: string;
  description?: string;
  descriptionHtml?: string;
  units: string[];
  input: number;
  unit: string;
  key?: number;
}): Promise<number | null> {
  return new Promise((resolve) => {
    numberInput.title = config.title;
    numberInput.description = config.description || '';
    numberInput.descriptionHtml = config.descriptionHtml || '';
    numberInput.units = config.units;
    numberInput.prev = config.input;
    numberInput.unit = config.unit;
    numberInput.key = config.key;

    showNumberInput.value = true;

    // Set up a one-time listener for the input result
    const cleanup = watch(
      () => showNumberInput.value,
      (isShown) => {
        if (!isShown) {
          cleanup();
          resolve(numberInput.result ? Number(numberInput.result) : null);
        }
      }
    );
  });
}

async function changeVoltage() {
  const voltage = await openNumberInput({
    title: 'Input Voltage',
    description: `Input Voltage (max ${formatNumber(device.upperLimitVoltage)}V)`,
    units: ['', '', 'mV', 'V'],
    input: device.setVoltage,
    unit: 'V',
    key: VOLTAGE_SET,
  });
}

async function changeCurrent() {
  const current = await openNumberInput({
    title: 'Input Current',
    description: `Input Current (max ${formatNumber(device.upperLimitCurrent)}A)`,
    units: ['', '', 'mA', 'A'],
    input: device.setCurrent,
    unit: 'A',
    key: CURRENT_SET,
  });
}

async function changeOVP() {
  await openNumberInput({
    title: 'Over Voltage Protection',
    description: ``,
    units: ['', '', 'mV', 'V'],
    input: device.overVoltageProtection,
    unit: 'V',
    key: OVP,
  });
}

async function changeOCP() {
  await openNumberInput({
    title: 'Over Current Protection',
    description: ``,
    units: ['', '', 'mA', 'A'],
    input: device.overCurrentProtection,
    unit: 'A',
    key: OCP,
  });
}

async function changeOPP() {
  await openNumberInput({
    title: 'Over Power Protection',
    description: ``,
    units: ['', '', '', 'W'],
    input: device.overPowerProtection,
    unit: 'W',
    key: OPP,
  });
}

async function changeOTP() {
  await openNumberInput({
    title: 'Over Temperature Protection',
    description: ``,
    units: ['', '', '', '℃'],
    input: device.overTemperatureProtection,
    unit: '℃',
    key: OTP,
  });
}

async function changeLVP() {
  await openNumberInput({
    title: 'Low Voltage Protection',
    description: ``,
    units: ['', '', 'mV', 'V'],
    input: device.lowVoltageProtection,
    unit: 'V',
    key: LVP,
  });
}

function formatNumber(n: number) {
  if (n < 10) {
    return sprintf('%05.3f', n);
  } else {
    return sprintf('%05.2f', n);
  }
}

function formatNumberForInput(number: string | number, sep = ',') {
    if (typeof number === 'number') {
        number = number.toFixed(3);
    }
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function formatDateTime(date: Date) {
  return date.toISOString();
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
  }[state];
}

async function setGroup(group: any) {
  const groupNumber = group.n;
  const setVoltage = groupsInput[group.n].setVoltage || group.setVoltage;
  const setCurrent = groupsInput[group.n].setCurrent || group.setCurrent;

  const cmdVoltage = GROUP1_VOLTAGE_SET + (groupNumber - 1) * 2;
  const cmdCurrent = GROUP1_CURRENT_SET + (groupNumber - 1) * 2;

  await setFloatValue(VOLTAGE_SET, setVoltage);
  await setFloatValue(CURRENT_SET, setCurrent);
  await setFloatValue(cmdVoltage, setVoltage);
  await setFloatValue(cmdCurrent, setCurrent);

  groupsInput[group.n].setVoltage = null;
  groupsInput[group.n].setCurrent = null;
}

async function editGroupVoltage(group: any) {
  const voltage = await openNumberInput({
    title: `Edit Group ${group.n} Voltage`,
    description: ``,
    units: ['', '', 'mV', 'V'],
    input: group.setVoltage,
    unit: 'V',
  });
  if (voltage) {
    groupsInput[group.n].setVoltage = voltage as any;
  }
}

async function editGroupCurrent(group: any) {
  const current = await openNumberInput({
    title: `Edit Group ${group.n} Current`,
    description: ``,
    units: ['', '', 'mA', 'A'],
    input: group.setCurrent,
    unit: 'A',
  });
  if (current) {
    groupsInput[group.n].setCurrent = current as any;
  }
}

function groupChanged(group: any, type: 'V' | 'I' | null) {
  const input = groupsInput[group.n];
  if (!type || type === 'V') {
    if (input.setVoltage !== null && input.setVoltage !== group.setVoltage) {
      return true;
    }
  }
  if (!type || type === 'I') {
    if (input.setCurrent !== null && input.setCurrent !== group.setCurrent) {
      return true;
    }
  }
  return false;
}

async function editBrightness() {
  const brightness = await openNumberInput({
    title: 'Brightness',
    description: `Max 10`,
    units: ['', '', '', 'x1'],
    input: device.brightness,
    unit: '/10',
  });
  if (brightness) {
    await setByteValue(BRIGHTNESS, brightness as number);
  }
}

async function editVolume() {
  const volume = await openNumberInput({
    title: 'Volume',
    description: `Max 10`,
    units: ['', '', '', 'x1'],
    input: device.volume,
    unit: '/10',
  });
  if (volume) {
    await setByteValue(VOLUME, volume as number);
  }
}

async function evaluateDSL(text: string) {
  const dslFunction = await functionWithTimeout((tempV, tempI, text) => {
    const queue: any[] = [];
    const scope = {
      V: (v: number) => {
        if (v) {
          tempV = v;
          queue.push({ type: 'V', args: [v] });
        } else {
          return tempV;
        }
      },
      I: (i: number) => {
        if (i) {
          tempI = i;
          queue.push({ type: 'I', args: [i] });
        } else {
          return tempI;
        }
      },
      ON: () => {
        queue.push({ type: 'ON' });
      },
      OFF: () => {
        queue.push({ type: 'OFF' });
      },
      SLEEP: (n: number) => {
        queue.push({ type: 'SLEEP', args: [n] });
      },
      times: function (n: number, f: (i: number) => void) {
        for (let i = 0; i < n; i++) {
          f(i);
        }
      },
    };

    const argumentNames = Object.keys(scope);
    const argumentValues = argumentNames.map((name) => scope[name]);

    Function.apply(null, argumentNames.concat(text)).apply(null, argumentValues);
    return queue;
  }, 500);

  let queue: any[] = [];
  let tempV = device.setVoltage;
  let tempI = device.setCurrent;
  try {
    queue = await dslFunction(tempV, tempI, text);
  } catch (e: any) {
    alert(e.message);
    return;
  }

  programRunning.value = true;
  programRemaining.value = queue.length;
  await executeCommands(
    queue,
    (n) => {
      programRemaining.value = n;
    }
  );
  programRunning.value = false;
}

function runProgram() {
  evaluateDSL(program.value);
}

function abortProgram() {
  abortExecuteCommands();
}

function downloadHistory() {
  const csv = history.value.map((h) => [h.time.toISOString(), h.v, h.i, h.p].join('\t'));
  csv.unshift(['Time', 'Voltage', 'Current', 'Power'].join('\t'));
  const blob = new Blob([csv.join('\n')], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <v-app>
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

    <v-main class="main-content">
      <v-container fluid>
        <v-row>
          <v-col cols="8">
            <Graph
              ref="graph"
              :history="history"
              :graph-options="graphOptions"
              :connected="isConnected"
              style="height: 400px"
            />
            <div class="tabs-container">
            <v-tabs v-model="tab" align-tabs="start" class="mt-4">
              <v-tab value="groups">Memory Groups</v-tab>
              <v-tab value="metering">Metering</v-tab>
              <v-tab value="protections">Protections</v-tab>
              <v-tab value="program">Program</v-tab>
              <v-tab value="history">History</v-tab>
              <v-tab value="settings">Settings</v-tab>
            </v-tabs>
            <v-window v-model="tab">
              <v-window-item value="groups">
                <MemoryGroups
                  :groups="groups"
                  :groups-input="groupsInput"
                  @set-group="setGroup"
                  @edit-group-voltage="editGroupVoltage"
                  @edit-group-current="editGroupCurrent"
                />
              </v-window-item>
              <v-window-item value="metering">
                <Metering :device="device" />
              </v-window-item>
              <v-window-item value="protections">
                <Protections
                  :device="device"
                  @change-ovp="changeOVP"
                  @change-ocp="changeOCP"
                  @change-opp="changeOPP"
                  @change-otp="changeOTP"
                  @change-lvp="changeLVP"
                />
              </v-window-item>
              <v-window-item value="program">
                <Program
                  v-model:program="program"
                  :program-running="programRunning"
                  :program-remaining="programRemaining"
                  :program-examples="programExamples"
                  @run-program="runProgram"
                  @abort-program="abortProgram"
                />
              </v-window-item>
              <v-window-item value="history">
                <History
                  :history="history"
                  :history-table-headers="historyTableHeaders"
                  @reset-history="resetHistory"
                  @download-history="downloadHistory"
                />
              </v-window-item>
              <v-window-item value="settings">
                <Settings
                  :device="device"
                  @edit-brightness="editBrightness"
                  @edit-volume="editVolume"
                />
              </v-window-item>
            </v-window>
            </div>
          </v-col>
          <v-col cols="4">
            <OutputView
              :device="device"
              @change-voltage="changeVoltage"
              @change-current="changeCurrent"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-overlay v-model="connectOverlay" class="justify-center align-center" style="position: fixed" contained>
      <div style="text-align: center">
        <p>Device is not connected</p>
        <v-btn class="connect" color="red" @click="connect">
          CONNECT
          <v-tooltip activator="parent" location="start">Connect</v-tooltip>
        </v-btn>
      </div>
    </v-overlay>

    <NumberInput
      v-model="showNumberInput"
      :title="numberInput.title"
      :description="numberInput.description"
      :description-html="numberInput.descriptionHtml"
      :unit="numberInput.unit"
      :units="numberInput.units"
      :prev="numberInput.prev"
      @input="onNumberInput"
    />
  </v-app>
</template>

<style>
.main-content {
  padding-top: 64px;
}

.tabs-container {
  margin-top: 20px;
}
.monomaniac-one-regular {
  font-family: 'Monomaniac One', sans-serif;
  font-weight: 400;
  font-style: normal;
}

/* <uniquifier>: Use a unique and descriptive class name */
/* <weight>: Use a value from 100 to 900 */

.noto-sans-jp-normal {
  font-family: 'Noto Sans JP', sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
}

.main-view {
  font-family: 'Monomaniac One', sans-serif;
  font-weight: 400;
  font-style: normal;
  font-size: 80px;
  text-align: right;
  line-height: 1;
  padding: 20px;
}

.main-view .set {
  font-size: 50%;
}

#app {
  margin: 0 auto;
}

p.note {
  margin: 1em 0;
  font-size: 90%;
  max-width: 30em;
  color: #333;
}

.main-view .unit {
  font-size: 50%;
}

.voltage {
  color: oklch(63.11% 0.1964 139.76);
}

.current {
  color: oklch(63.11% 0.1964 26.48);
}

.voltage.v-chip {
  background: oklch(63.11% 0.1964 139.76);
  color: white;
}

.current.v-chip {
  background: oklch(63.11% 0.1964 26.48);
  color: white;
}

.v-chip {
  margin-left: 5px;
}

.power {
  color: oklch(63.11% 0.1964 230.46);
}

.mode {
  font-size: 50%;
}

.info {
  font-size: 25%;
}

.enabled {
  background: repeating-linear-gradient(-45deg, #ffffff, #ffffff 5px, #fce6ba 5px, #fce6ba 10px);
}

.v-app-bar .v-btn {
  margin: 10px;
}

.changeable {
  cursor: pointer;
}

.changeable .v-btn {
  visibility: hidden;
}

.changeable:hover {
  cursor: pointer;
  background: rgb(200 200 200 / 50%);
}

.changeable:hover .v-btn {
  visibility: visible;
}

.groups .changeable.changed {
  background: #ffcccc;
}

.groups .v-list-item__content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
}

#numberInputting {
  font-size: 200%;
  text-align: right;
  font-weight: bold;
  padding: 20px 2px;
}

#numberInput {
  width: 100%;
  table-layout: fixed;
}

#numberInput .v-btn {
  margin: 0;
  min-width: auto;
  min-height: 10vh;
  width: 100%;
  box-sizing: border-box;
  background: #efefef;
  font-size: 200%;
  text-transform: none;
}
</style>


