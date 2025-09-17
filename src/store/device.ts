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
    async init() {
      if (!navigator.serial) {
        // Use test client
        console.log('Using TestDPS150 client');
        await backend.connectTest(
          Comlink.proxy((data: any) => {
            if (data.type === 'systemInfo') {
              Object.assign(this.device, data.data);
              this.history.unshift({
                time: new Date(),
                v: data.data.voltage,
                i: data.data.current,
                p: data.data.power,
              });
              if (this.history.length > 1000) {
                this.history.pop();
              }
            }
          })
        );
        const deviceInfo = await backend.getDeviceInfo();
        Object.assign(this.device, deviceInfo);
        this.port = {} as SerialPort; // Fake port
        return;
      }
      const ports = await navigator.serial.getPorts();
      if (ports.length) {
        this.start(ports[0]);
      }
    },

    async start(p: SerialPort) {
      if (!p) return;
      this.port = p;

      await backend.connect(
        p,
        Comlink.proxy((data: any) => {
          Object.assign(this.device, data);
          this.history.unshift({
            time: new Date(),
            v: data.outputVoltage,
            i: data.outputCurrent,
            p: data.outputPower,
          });
          this.history.splice(10000);
        })
      );
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
