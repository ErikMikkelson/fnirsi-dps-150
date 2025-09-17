import * as Comlink from 'comlink';
import { wrap } from 'comlink';
import { defineStore } from 'pinia';

import type { WorkerAPI } from '../worker';

const worker = new Worker(new URL('../worker.ts', import.meta.url), {
  type: 'module',
});

const backend = wrap<WorkerAPI>(worker);

export const useDeviceStore = defineStore('device', {
  state: () => ({
    port: null as SerialPort | null,
    device: {
      model: '',
      serialNumber: '',
      firmwareVersion: '',
      upperLimitVoltage: 0,
      upperLimitCurrent: 0,
      setVoltage: 0,
      setCurrent: 0,
      voltage: 0,
      current: 0,
      power: 0,
      inputVoltage: 0,
      temperature: 0,
      outputEnabled: false,
      cv_cc: 'CV',
      protectionState: '',
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
    },
    history: [] as { time: Date; v: number; i: number; p: number }[],
    program: {
      running: false,
      remaining: 0,
    },
  }),

  actions: {
    async autoConnect() {
      // Try to auto-connect with test client if enabled
      const onUpdateCallback = Comlink.proxy((data: any) => {
        Object.assign(this.device, data);
        this.history.unshift({
          time: new Date(),
          v: data.outputVoltage || 0,
          i: data.outputCurrent || 0,
          p: data.outputPower || 0,
        });
        if (this.history.length > 10000) {
          this.history.splice(10000);
        }
      });

      await backend.autoConnect(onUpdateCallback);
      this.port = {} as SerialPort; // Mock port reference
      const deviceInfo = await backend.getDeviceInfo();
      Object.assign(this.device, deviceInfo);
      return true;
    },

    async start(p: SerialPort) {
      if (!p) return;
      this.port = p;

      await p.open({
        baudRate: 115200,
        bufferSize: 1024,
        dataBits: 8,
        stopBits: 1,
        flowControl: 'hardware',
        parity: 'none'
      });

      if (!p.readable || !p.writable) {
        console.error('Port does not have readable or writable streams');
        return;
      }

      const onUpdateCallback = Comlink.proxy((data: any) => {
        Object.assign(this.device, data);
        this.history.unshift({
          time: new Date(),
          v: data.outputVoltage || 0,
          i: data.outputCurrent || 0,
          p: data.outputPower || 0,
        });
        if (this.history.length > 10000) {
          this.history.splice(10000);
        }
      });

      await backend.connect(p, onUpdateCallback);
      const deviceInfo = await backend.getDeviceInfo();
      Object.assign(this.device, deviceInfo);
    },

    async connect() {
      this.start(await navigator.serial.requestPort());
    },

    async disconnect() {
      if (this.port) {
        await backend.disconnect();
        this.port = null;
      }
    },

    async enable() {
      await backend.enable();
    },

    async disable() {
      await backend.disable();
    },

    async startMetering() {
      await backend.startMetering();
    },

    async stopMetering() {
      await backend.stopMetering();
    },

    async setFloatValue(command: number, value: number) {
      await backend.setFloatValue(command, value);
    },

    async setByteValue(command: number, value: number) {
      await backend.setByteValue(command, value);
    },

    async executeCommands(
      commands: any[],
      onProgress: (n: number) => void = () => {}
    ) {
      this.program.running = true;
      await backend.executeCommands(commands, Comlink.proxy(onProgress));
      this.program.running = false;
    },

    async abortExecuteCommands() {
      // This functionality doesn't exist in the worker, so we just disconnect
      // to stop whatever is happening. A better implementation would be to have
      // an abort signal in the worker.
      await backend.disconnect();
      if (this.port) {
        await this.start(this.port);
      }
    },

    resetHistory() {
      this.history = [];
    },
  },
});
