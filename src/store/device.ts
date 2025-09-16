import {
  reactive,
  ref,
} from 'vue';

import type { Remote } from 'comlink';
import * as Comlink from 'comlink';
import { defineStore } from 'pinia';

import type { Backend as MyWorker } from '../worker';

const Backend = Comlink.wrap<typeof MyWorker>(new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' }));

export const useDeviceStore = defineStore('device', () => {
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

  async function setFloatValue(key: number, value: number) {
    await dps.value!.setFloatValue(key, value);
    await dps.value!.getAll();
  }

  async function setByteValue(key: number, value: number) {
    await dps.value!.setByteValue(key, value);
    await dps.value!.getAll();
  }

  async function executeCommands(queue: any[], onProgress: (n: number) => void) {
    await dps.value!.executeCommands(queue, Comlink.proxy(onProgress));
  }

  function abortExecuteCommands() {
    dps.value!.abortExecuteCommands();
  }

  function resetHistory() {
    history.value = [];
  }

  return {
    port,
    dps,
    device,
    history,
    init,
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
  };
});
