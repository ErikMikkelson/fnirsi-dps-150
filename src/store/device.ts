import * as Comlink from 'comlink';
import { defineStore } from 'pinia';

import type { WorkerAPI } from '../core/worker';

const worker = new Worker(new URL('../core/worker.ts', import.meta.url), {
  type: 'module',
});
const backend = Comlink.wrap<WorkerAPI>(worker);

export const useDeviceStore = defineStore('device', {
  state: () => ({
    port: null as SerialPort | null,
    dps: backend,
    device: {
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
      outputEnabled: false,
      protectionState: '',
      mode: 'CV',
      upperLimitVoltage: 0,
      upperLimitCurrent: 0,
      modelName: '',
      firmwareVersion: '',
      hardwareVersion: '',
    },
    history: [] as { time: Date; v: number; i: number; p: number }[],
  }),

  actions: {
    async init() {
      if (!navigator.serial) {
        // Use test client
        console.log('Using TestDPS150 client');
        await this.dps.connectTest(
          Comlink.proxy((data: any) => {
            console.log('Received data from test client:', data);
            if (data.type === 'systemInfo') {
              Object.assign(this.device, data.data);
              this.history.unshift({
                time: new Date(),
                v: data.data.outputVoltage,
                i: data.data.outputCurrent,
                p: data.data.outputPower,
              });
              if (this.history.length > 1000) {
                this.history.pop();
              }
            }
          })
        );
        const deviceInfo = await this.dps.getDeviceInfo();
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

      await this.dps.connect(
        p,
        Comlink.proxy((data: any) => {
          if (data.type === 'systemInfo') {
            Object.assign(this.device, data.data);
            this.history.unshift({
              time: new Date(),
              v: data.data.outputVoltage,
              i: data.data.outputCurrent,
              p: data.data.outputPower,
            });
            this.history.splice(10000);
          }
        })
      );
    },

    async connect() {
      this.start(await navigator.serial.requestPort());
    },

    async disconnect() {
      if (this.port) {
        await this.dps.disconnect();
        this.port = null;
      }
    },

    async setV(v: number) {
      await this.dps.setFloatValue(193, v);
    },

    async setI(i: number) {
      await this.dps.setFloatValue(194, i);
    },

    async setOVP(v: number) {
      await this.dps.setFloatValue(195, v);
    },

    async setOCP(i: number) {
      await this.dps.setFloatValue(196, i);
    },

    async setBrightness(b: number) {
      await this.dps.setByteValue(203, b);
    },

    async execute(commands: any[], onProgress: (n: number) => void) {
      await this.dps.executeCommands(commands, Comlink.proxy(onProgress));
    },

    async abortExecute() {
      // This functionality doesn't exist in the worker, so we just disconnect
      // to stop whatever is happening. A better implementation would be to have
      // an abort signal in the worker.
      await this.dps.disconnect();
      if (this.port) {
        await this.start(this.port);
      }
    },
  },
});
