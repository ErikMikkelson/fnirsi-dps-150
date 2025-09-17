import type { Remote } from 'comlink';
import * as Comlink from 'comlink';
import { defineStore } from 'pinia';

import type { Backend as MyWorker } from '../core/worker';

const Backend = Comlink.wrap<typeof MyWorker>(new Worker(new URL('../core/worker.ts', import.meta.url), { type: 'module' }));

export const useDeviceStore = defineStore('device', {
  state: () => ({
    port: null as SerialPort | null,
    dps: null as Remote<MyWorker> | null,
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
      outputClosed: false,
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
        this.dps = await new Backend();
        await this.dps.connectTest(
          Comlink.proxy((data) => {
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
      this.dps = await new Backend();
      const ports = await navigator.serial.getPorts();
      if (ports.length) {
        this.start(ports[0]);
      }
    },

    async start(p: SerialPort) {
      if (!p) return;
      this.port = p;
      const portInfo = p.getInfo();

      await this.dps!.startSerialPort(
        {
          usbVendorId: portInfo.usbVendorId,
          usbProductId: portInfo.usbProductId,
        },
        Comlink.proxy((data) => {
          if (!data) {
            this.port = null;
            return;
          }
          Object.assign(this.device, data);
          if (typeof data.outputVoltage === 'number') {
            if (
              this.history.length >= 2 &&
              data.outputVoltage === 0 &&
              data.outputCurrent === 0 &&
              data.outputPower === 0 &&
              this.history[0].v === 0 &&
              this.history[0].i === 0 &&
              this.history[0].p === 0 &&
              this.history[1].v === 0 &&
              this.history[1].i === 0 &&
              this.history[1].p === 0
            ) {
              this.history[0].time = new Date();
              return;
            }
            this.history.unshift({
              time: new Date(),
              v: data.outputVoltage,
              i: data.outputCurrent,
              p: data.outputPower,
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
        await this.dps!.stopSerialPort();
        this.port = null;
      }
    },

    async enable() {
      await this.dps!.enable();
    },

    async disable() {
      await this.dps!.disable();
    },

    async startMetering() {
      await this.dps!.startMetering();
      await this.dps!.getAll();
    },

    async stopMetering() {
      await this.dps!.stopMetering();
      await this.dps!.getAll();
    },

    async setFloatValue(key: number, value: number) {
      await this.dps!.setFloatValue(key, value);
      await this.dps!.getAll();
    },

    async setByteValue(key: number, value: number) {
      await this.dps!.setByteValue(key, value);
      await this.dps!.getAll();
    },

    async executeCommands(queue: any[], onProgress: (n: number) => void) {
      await this.dps!.executeCommands(queue, Comlink.proxy(onProgress));
    },

    abortExecuteCommands() {
      this.dps!.abortExecuteCommands();
    },

    resetHistory() {
      this.history = [];
    },
  },
});
