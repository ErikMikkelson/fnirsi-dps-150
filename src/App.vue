<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { sprintf } from 'sprintf-js';
import * as Comlink from 'comlink';
import type { Remote } from 'comlink';
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
} from '../dps-150.ts';
import { functionWithTimeout } from '../utils.js';
import type { Worker as MyWorker } from '../worker';

// @ts-ignore
import Plotly from 'plotly.js/dist/plotly.min.js';

const Backend = Comlink.wrap<typeof MyWorker>(new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' }));

const port = ref<SerialPort | null>(null);
const dps = ref<Remote<MyWorker> | null>(null);

const device = reactive({
  inputVoltage: 0,
  setVoltage: 0,
  setCurrent: 0,
  outputVoltage: 0,
  outputCurrent: 0,
  outputPower: 0,
  temperature: 0,
  group1setVoltage: 0,
  group1setCurrent: 0,
  group2setVoltage: 0,
  group2setCurrent: 0,
  group3setVoltage: 0,
  group3setCurrent: 0,
  group4setVoltage: 0,
  group4setCurrent: 0,
  group5setVoltage: 0,
  group5setCurrent: 0,
  group6setVoltage: 0,
  group6setCurrent: 0,
  overVoltageProtection: 0,
  overCurrentProtection: 0,
  overPowerProtection: 0,
  overTemperatureProtection: 0,
  lowVoltageProtection: 0,
  brightness: 0,
  volume: 0,
  meteringClosed: false,
  outputCapacity: 0,
  outputEnergy: 0,
  outputClosed: false,
  protectionState: '',
  mode: 'CV',
  upperLimitVoltage: 0,
  upperLimitCurrent: 0,
  modelName: '',
  firmwareVersion: '',
  hardwareVersion: '',
});

const history = ref<{ time: Date; v: number; i: number; p: number }[]>([]);

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
});

const tab = ref(null);
const connectOverlay = ref(true);
const program = ref('');
const programRunning = ref(false);
const programRemaining = ref(0);

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

const graph = ref<HTMLDivElement | null>(null);

function updateGraph() {
    if (!graph.value) return;
  const voltage = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Voltage',
    line: {
      width: 3,
      color: '#38a410',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}V',
  };
  const current = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Current',
    yaxis: 'y2',
    line: {
      width: 3,
      color: '#e84944',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}A',
  };
  const power = {
    mode: 'lines+markers',
    x: [],
    y: [],
    name: 'Power',
    yaxis: 'y3',
    line: {
      width: 3,
      color: '#0097d2',
      shape: 'linear',
    },
    hovertemplate: '%{y:.3f}W',
  };

  for (let i = 0; i < history.value.length; i++) {
    const h = history.value[i];
    voltage.x.push(h.time);
    voltage.y.push(h.v);
    current.x.push(h.time);
    current.y.push(h.i);
    power.x.push(h.time);
    power.y.push(h.p);
    if (i > 60) break;
  }

  const data = [];
  if (graphOptions.voltage) {
    data.push(voltage);
  }
  if (graphOptions.current) {
    data.push(current);
  }
  if (graphOptions.power) {
    data.push(power);
  }

  const layout = {
    title: { text: '' },
    showlegend: false,
    margin: {
      t: 0,
      b: 50,
      l: 0,
      r: 0,
    },
    xaxis: {
      domain: [0.1, 0.9],
      type: 'date',
      range: [new Date(Date.now() - 1000 * graphOptions.duration), new Date()],
      tickformat: '%M:%S\n %H',
    },
    yaxis: {
      title: {
        text: 'V',
        font: { color: '#38a410' },
      },
      tickfont: { color: '#38a410' },
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
    yaxis2: {
      title: {
        text: 'I',
        font: { color: '#e84944' },
      },
      tickfont: { color: '#e84944' },
      anchor: 'free',
      overlaying: 'y',
      side: 'left',
      position: 0.05,
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
    yaxis3: {
      title: {
        text: 'P',
        font: { color: '#0097d2' },
      },
      tickfont: { color: '#0097d2' },
      anchor: 'x',
      overlaying: 'y',
      side: 'right',
      minallowed: 0,
      rangemode: 'tozero',
      autorange: 'max',
    },
  };

  Plotly.react(graph.value, data, layout, {
    displayModeBar: false,
    responsive: true,
  });
}

watch(history, updateGraph, { deep: true });
watch(port, (newPort) => {
  connectOverlay.value = !newPort;
});
watch(graphOptions, updateGraph, { deep: true });

async function init() {
  if (!navigator.serial) {
    return;
  }
  dps.value = await new Backend();
  const ports = await navigator.serial.getPorts();
  if (ports.length) {
    start(ports[0]);
  }
}

async function start(p: SerialPort) {
  if (!p) return;
  port.value = p;
  const portInfo = p.getInfo();

  await dps.value!.startSerialPort(
    {
      usbVendorId: portInfo.usbVendorId,
      usbProductId: portInfo.usbProductId,
    },
    Comlink.proxy((data) => {
      if (!data) {
        port.value = null;
        return;
      }
      Object.assign(device, data);
      if (typeof data.outputVoltage === 'number') {
        if (
          history.value.length >= 2 &&
          data.outputVoltage === 0 &&
          data.outputCurrent === 0 &&
          data.outputPower === 0 &&
          history.value[0].v === 0 &&
          history.value[0].i === 0 &&
          history.value[0].p === 0 &&
          history.value[1].v === 0 &&
          history.value[1].i === 0 &&
          history.value[1].p === 0
        ) {
          history.value[0].time = new Date();
          return;
        }
        history.value.unshift({
          time: new Date(),
          v: data.outputVoltage,
          i: data.outputCurrent,
          p: data.outputPower,
        });
        history.value = history.value.slice(0, 10000);
      }
    })
  );
}

async function connect() {
  start(await navigator.serial.requestPort());
}

async function disconnect() {
  if (port.value) {
    await dps.value!.stopSerialPort();
    port.value = null;
  }
}

async function enable() {
  await dps.value!.enable();
}

async function disable() {
  await dps.value!.disable();
}

async function startMetering() {
  await dps.value!.startMetering();
  await dps.value!.getAll();
}

async function stopMetering() {
  await dps.value!.stopMetering();
  await dps.value!.getAll();
}

async function openNumberInput(opts: any) {
  numberInput.result = '';
  numberInput.title = opts.title || '';
  numberInput.description = opts.description || '';
  numberInput.descriptionHtml = opts.descriptionHtml || '';
  numberInput.prev = opts.input || '';
  numberInput.unit = opts.unit || '';
  numberInput.units = opts.units || [];
  numberInput.input = '';
  showNumberInput.value = true;

  const keyDown = (e: KeyboardEvent) => {
    numberInputChar(e.key);
  };

  window.addEventListener('keydown', keyDown);

  return await new Promise((resolve) => {
    const unwatch = watch(showNumberInput, () => {
      unwatch();
      window.removeEventListener('keydown', keyDown);
      resolve(numberInput.result);
    });
  });
}

function numberInputChar(char: string) {
  const UNITS: { [key: string]: number } = {
    'G': 1e9, 'M': 1e6, 'k': 1e3, 'x1': 1, 'm': 1e-3, 'µ': 1e-6, 'n': 1e-9, 'p': 1e-12,
    'mV': 1e-3, 'V': 1, 'mA': 1e-3, 'A': 1, 'mW': 1e-3, 'W': 1, '℃': 1,
  };

  if (/^[0-9]$/.test(char)) {
    numberInput.input += char;
  } else if (char === '.') {
    if (!numberInput.input.includes('.')) {
      numberInput.input += char;
    }
  } else if (char === 'Backspace' || char === '\u232B') {
    if (numberInput.input.length) {
      numberInput.input = numberInput.input.slice(0, -1);
    } else {
      showNumberInput.value = false;
    }
  } else if (char === '-') {
    if (numberInput.input[0] === '-') {
      numberInput.input = numberInput.input.slice(1);
    } else {
      numberInput.input = '-' + numberInput.input;
    }
  } else if (UNITS[char]) {
    const base = parseFloat(numberInput.input);
    numberInput.result = base * UNITS[char];
    showNumberInput.value = false;
  }
}

function numberInputButton(e: Event) {
    const char = (e.target as HTMLElement).textContent?.replace(/\s+/g, '');
    if (char) {
        numberInputChar(char);
    }
}

async function changeVoltage() {
  const voltage = await openNumberInput({
    title: 'Input Voltage',
    description: `Input Voltage (max ${formatNumber(device.upperLimitVoltage)}V)`,
    units: ['', '', 'mV', 'V'],
    input: device.setVoltage,
    unit: 'V',
  });
  if (voltage) {
    await dps.value!.setFloatValue(VOLTAGE_SET, voltage as number);
    await dps.value!.getAll();
  }
}

async function changeCurrent() {
  const current = await openNumberInput({
    title: 'Input Current',
    description: `Input Current (max ${formatNumber(device.upperLimitCurrent)}A)`,
    units: ['', '', 'mA', 'A'],
    input: device.setCurrent,
    unit: 'A',
  });
  if (current) {
    await dps.value!.setFloatValue(CURRENT_SET, current as number);
    await dps.value!.getAll();
  }
}

async function changeOVP() {
  const voltage = await openNumberInput({
    title: 'Over Voltage Protection',
    description: ``,
    units: ['', '', 'mV', 'V'],
    input: device.overVoltageProtection,
    unit: 'V',
  });
  if (voltage) {
    await dps.value!.setFloatValue(OVP, voltage as number);
    await dps.value!.getAll();
  }
}

async function changeOCP() {
  const current = await openNumberInput({
    title: 'Over Current Protection',
    description: ``,
    units: ['', '', 'mA', 'A'],
    input: device.overCurrentProtection,
    unit: 'A',
  });
  if (current) {
    await dps.value!.setFloatValue(OCP, current as number);
    await dps.value!.getAll();
  }
}

async function changeOPP() {
  const power = await openNumberInput({
    title: 'Over Power Protection',
    description: ``,
    units: ['', '', '', 'W'],
    input: device.overPowerProtection,
    unit: 'W',
  });
  if (power) {
    await dps.value!.setFloatValue(OPP, power as number);
    await dps.value!.getAll();
  }
}

async function changeOTP() {
  const temp = await openNumberInput({
    title: 'Over Temperature Protection',
    description: ``,
    units: ['', '', '', '℃'],
    input: device.overTemperatureProtection,
    unit: '℃',
  });
  if (temp) {
    await dps.value!.setFloatValue(OTP, temp as number);
    await dps.value!.getAll();
  }
}

async function changeLVP() {
  const voltage = await openNumberInput({
    title: 'Low Voltage Protection',
    description: ``,
    units: ['', '', 'mV', 'V'],
    input: device.lowVoltageProtection,
    unit: 'V',
  });
  if (voltage) {
    await dps.value!.setFloatValue(LVP, voltage as number);
    await dps.value!.getAll();
  }
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

  await dps.value!.setFloatValue(VOLTAGE_SET, setVoltage);
  await dps.value!.setFloatValue(CURRENT_SET, setCurrent);
  await dps.value!.setFloatValue(cmdVoltage, setVoltage);
  await dps.value!.setFloatValue(cmdCurrent, setCurrent);
  await dps.value!.getAll();

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
    await dps.value!.setByteValue(BRIGHTNESS, brightness as number);
    await dps.value!.getAll();
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
    await dps.value!.setByteValue(VOLUME, volume as number);
    await dps.value!.getAll();
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
  await dps.value!.executeCommands(
    queue,
    Comlink.proxy((n) => {
      programRemaining.value = n;
    })
  );
  programRunning.value = false;
}

function runProgram() {
  evaluateDSL(program.value);
}

function abortProgram() {
  dps.value!.abortExecuteCommands();
}

function resetHistory() {
  history.value = [];
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

onMounted(() => {
  init();
  programExamples.forEach((example) => {
    example.code = example.code.trim().replace(/\t+/g, '');
  });
  program.value = programExamples[0].code;
  updateGraph();
});
</script>

<template>
  <v-app>
    <v-app-bar density="default">
      <v-app-bar-title>
        {{ device.modelName }} {{ device.firmwareVersion }} {{ device.hardwareVersion }}
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <span class="ms-2">
        <v-chip>{{ device.temperature.toFixed(0) }}°C</v-chip>
        <v-chip :color="device.protectionState === 'LVP' ? 'red' : 'default'">Input: {{ formatNumber(device.inputVoltage) }}V</v-chip>
      </span>

      <v-btn class="connect" icon variant="flat" color="red" @click="connect" v-if="!port">
        <v-icon>mdi-link-off</v-icon>
        <v-tooltip activator="parent" location="bottom">Connect</v-tooltip>
      </v-btn>
      <v-btn class="disconnect" icon variant="flat" color="green" @click="disconnect" v-else>
        <v-icon>mdi-link</v-icon>
        <v-tooltip activator="parent" location="bottom">Disconnect</v-tooltip>
      </v-btn>

      <v-btn icon variant="flat" color="green" @click="enable" v-if="!device.outputClosed" title="Enable" :disabled="!port">
        <v-icon>mdi-power</v-icon>
        <v-tooltip activator="parent" location="bottom">Enable Output</v-tooltip>
      </v-btn>

      <v-btn icon variant="flat" color="red" @click="disable" v-if="device.outputClosed" title="Disable">
        <v-icon>mdi-power</v-icon>
        <v-tooltip activator="parent" location="bottom">Disable Output</v-tooltip>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <div class="d-flex">
          <div class="flex-fill" style="padding: 10px; height: 500px">
            <div style="position: relative; height: 100%">
              <div ref="graph" style="height: 100%"></div>
              <div class="d-flex justify-center" style="position: absolute; bottom: 0">
                <v-checkbox label="Voltage" hide-details color="green" v-model="graphOptions.voltage"></v-checkbox>
                <v-checkbox label="Current" hide-details color="red" v-model="graphOptions.current"></v-checkbox>
                <v-checkbox label="Power" hide-details color="blue" v-model="graphOptions.power"></v-checkbox>
              </div>
            </div>
          </div>

          <div class="main-view" :class="{ enabled: device.outputClosed }" style="width: 300px">
            <div class="changeable voltage" @click="changeVoltage">
              <span>{{ port ? formatNumber(device.outputVoltage) : '-' }}</span><span class="unit">V</span>
              <div class="set">
                vset <span>{{ formatNumber(device.setVoltage) }}</span><span class="unit">V</span>
              </div>
            </div>
            <div class="changeable current" @click="changeCurrent">
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
        </div>

        <v-card>
          <v-tabs v-model="tab">
            <v-tab value="memory">Memory Groups</v-tab>
            <v-tab value="metering">Metering</v-tab>
            <v-tab value="protections">Protections</v-tab>
            <v-tab value="program">Program</v-tab>
            <v-tab value="history">History</v-tab>
            <v-tab value="settings">Settings</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="tab">
              <v-window-item value="memory">
                <v-table density="compact" style="max-width: 30em" class="groups">
                  <tbody>
                    <tr v-for="group in groups" :key="group.n">
                      <td>
                        <v-btn size="x-small" :color="groupChanged(group, null) ? 'red' : 'green'" variant="flat" @click="setGroup(group)">
                          M{{ group.n }}
                          <v-tooltip activator="parent" location="start">
                            {{ groupChanged(group, null) ? 'Update with changed values' : `Set M${group.n}` }}
                          </v-tooltip>
                        </v-btn>
                      </td>
                      <td @click="editGroupVoltage(group)" class="changeable" :class="{ changed: groupChanged(group, 'V') }">
                        {{ formatNumber(groupsInput[group.n].setVoltage || group.setVoltage) }}V
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                      <td @click="editGroupCurrent(group)" class="changeable" :class="{ changed: groupChanged(group, 'I') }">
                        {{ formatNumber(groupsInput[group.n].setCurrent || group.setCurrent) }}A
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>
              <v-window-item value="metering">
                <v-btn @click="startMetering" color="green" v-if="device.meteringClosed">Start</v-btn>
                <v-btn @click="stopMetering" color="red" v-else>Stop</v-btn>
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
              </v-window-item>
              <v-window-item value="protections">
                <v-table density="compact" style="max-width: 30em">
                  <tbody>
                    <tr>
                      <th>Over Voltage Protection</th>
                      <td @click="changeOVP" class="changeable">
                        {{ formatNumber(device.overVoltageProtection) }}V
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                    <tr>
                      <th>Over Current Protection</th>
                      <td @click="changeOCP" class="changeable">
                        {{ formatNumber(device.overCurrentProtection) }}A
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                    <tr>
                      <th>Over Power Protection</th>
                      <td @click="changeOPP" class="changeable">
                        {{ formatNumber(device.overPowerProtection) }}W
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                    <tr>
                      <th>Over Temperature Protection</th>
                      <td @click="changeOTP" class="changeable">
                        {{ formatNumber(device.overTemperatureProtection) }}℃
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                    <tr>
                      <th>Low Voltage Protection</th>
                      <td @click="changeLVP" class="changeable">
                        {{ formatNumber(device.lowVoltageProtection) }}V
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>
              <v-window-item value="program">
                <div class="d-flex">
                  <div class="flex-fill" style="margin-right: 10px">
                    <v-textarea v-model="program" prepend-icon="mdi-code-block-parentheses" style="width: 100%" rows="10" auto-grow></v-textarea>
                    <div class="text-right">
                      <v-btn size="small">
                        Examples
                        <v-menu activator="parent">
                          <v-list>
                            <v-list-item @click="program = example.code" v-for="example in programExamples" :key="example.name" :title="example.name"></v-list-item>
                          </v-list>
                        </v-menu>
                      </v-btn>
                    </div>
                  </div>
                  <div style="width: 25em">
                    <v-table density="compact">
                      <tbody>
                        <tr>
                          <th>V(v)</th>
                          <td>Set voltage to `v`</td>
                        </tr>
                        <tr>
                          <th>V()</th>
                          <td>Get current set voltage</td>
                        </tr>
                        <tr>
                          <th>I(i)</th>
                          <td>Set current to `i`</td>
                        </tr>
                        <tr>
                          <th>I()</th>
                          <td>Get current set current</td>
                        </tr>
                        <tr>
                          <th>ON()</th>
                          <td>Enable output</td>
                        </tr>
                        <tr>
                          <th>OFF()</th>
                          <td>Disable output</td>
                        </tr>
                        <tr>
                          <th>SLEEP(ms)</th>
                          <td>Sleep `ms`</td>
                        </tr>
                        <tr>
                          <th>times(n, f)</th>
                          <td>Run `f` for `n` times</td>
                        </tr>
                      </tbody>
                    </v-table>
                    <v-card variant="plain">
                      <v-card-text>
                        The program is executed once and for all. It then builds a command queue. The actual output control is then performed according to the command queue.
                      </v-card-text>
                    </v-card>
                  </div>
                </div>
                <v-btn color="green" @click="runProgram" v-if="!programRunning">Run</v-btn>
                <v-btn color="red" @click="abortProgram" v-else>Abort ({{ programRemaining }} remains)</v-btn>
              </v-window-item>
              <v-window-item value="history">
                <v-row>
                  <v-col>
                    <v-btn @click="downloadHistory" :disabled="!history.length" color="deep-orange-darken-1" prepend-icon="mdi-download-box">Download</v-btn>
                  </v-col>
                  <v-col style="text-align: right">
                    <v-btn @click="resetHistory" :disabled="!history.length" color="blue-grey-lighten-2" prepend-icon="mdi-close-box">Reset</v-btn>
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
              </v-window-item>
              <v-window-item value="settings">
                <v-table density="compact" style="width: 30em">
                  <tbody>
                    <tr>
                      <th>Brightness</th>
                      <td @click="editBrightness()" class="changeable">
                        {{ device.brightness }}
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                    <tr>
                      <th>Volume</th>
                      <td @click="editVolume()" class="changeable">
                        {{ device.volume }}
                        <v-btn size="x-small" color="green" variant="flat">set</v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>

    <v-overlay v-model="connectOverlay" class="justify-center" style="position: fixed" contained>
      <div style="text-align: center; padding: 5em">
        <p>Device is not connected</p>
        <p>
          <v-btn @click="connect" v-if="!port">Connect</v-btn>
        </p>
      </div>
    </v-overlay>

    <v-dialog width="auto" v-model="showNumberInput" id="numberInput">
      <v-card :title="numberInput.title" v-if="numberInput">
        <v-divider class="mt-3"></v-divider>
        <v-card-text>
          <div style="height: 100%; width: 100%; display: flex; flex-direction: column">
            <div style="flex: 1">
              <div v-html="numberInput.descriptionHtml" v-if="numberInput.descriptionHtml"></div>
              <div v-else>
                {{ numberInput.description || '' }}
              </div>
            </div>
            <div id="numberInputting">
              <span class="number" v-if="numberInput.input">{{ formatNumberForInput(numberInput.input) }}</span>
              <span class="number" v-else style="color: rgba(0,0,0,.54);">{{ formatNumberForInput(numberInput.prev) }}</span>
              <span class="unit">{{ numberInput.unit }}</span>
            </div>
            <table id="numberInput">
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">7</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">8</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">9</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="numberInput.units[0]">{{ numberInput.units[0] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">4</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">5</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">6</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="numberInput.units[1]">{{ numberInput.units[1] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">1</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">2</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">3</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="numberInput.units[2]">{{ numberInput.units[2] }}</v-btn></td>
              </tr>
              <tr>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">0</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">.</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton">&#x232B;</v-btn></td>
                <td><v-btn variant="tonal" class="" @click="numberInputButton" v-show="numberInput.units[3]">{{ numberInput.units[3] }}</v-btn></td>
              </tr>
            </table>
          </div>
        </v-card-text>

        <template v-slot:actions>
          <v-btn class="ms-auto" text="Cancel" @click="showNumberInput = false"></v-btn>
        </template>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style>
.monomaniac-one-regular {
  font-family: 'Monomaniac One', sans-serif;
  font-weight: 400;
  font-style: normal;
}

.noto-sans-jp-normal {
  font-family: 'Noto Sans JP', serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
}

body {
  font-family: 'Noto Sans JP', serif;
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
  background: rgb(200, 200, 200, 0.5);
}

.changeable:hover .v-btn {
  visibility: visible;
}

.groups .changeable.changed {
  background: #ffcccc;
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


