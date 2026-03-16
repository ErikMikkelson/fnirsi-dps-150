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
      modelName: '',
      hardwareVersion: '',
      firmwareVersion: '',
      upperLimitVoltage: 0,
      upperLimitCurrent: 0,
      setVoltage: 0,
      setCurrent: 0,
      outputVoltage: 0,
      outputCurrent: 0,
      outputPower: 0,
      inputVoltage: 0,
      temperature: 0,
      outputEnabled: false,
      mode: 'CV' as 'CV' | 'CC',
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
      outputCapacity: 0,
      outputEnergy: 0,
      meteringClosed: false,
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
        if (data.outputVoltage !== undefined) {
          this.history.unshift({
            time: new Date(),
            v: data.outputVoltage,
            i: data.outputCurrent ?? 0,
            p: data.outputPower ?? 0,
          });
          if (this.history.length > 10000) {
            this.history.splice(10000);
          }
        }
      });

      await backend.autoConnect(onUpdateCallback);
      this.port = {} as SerialPort; // Mock port reference
      const deviceInfo = await backend.getDeviceInfo();
      Object.assign(this.device, deviceInfo);

      // Ensure output is enabled to match the mock data
      await backend.enable();

      return true;
    },

    async connect() {
      const port = await navigator.serial.requestPort();
      const portInfo = port.getInfo();

      const onUpdateCallback = Comlink.proxy((data: any) => {
        Object.assign(this.device, data);
        if (data.outputVoltage !== undefined) {
          this.history.unshift({
            time: new Date(),
            v: data.outputVoltage,
            i: data.outputCurrent ?? 0,
            p: data.outputPower ?? 0,
          });
          if (this.history.length > 10000) {
            this.history.splice(10000);
          }
        }
      });

      // Pass only the port info (plain object) to the worker.
      // The worker finds the same port via navigator.serial.getPorts().
      await backend.connect(portInfo, onUpdateCallback);
      this.port = port; // Keep reference for UI state tracking
      const deviceInfo = await backend.getDeviceInfo();
      Object.assign(this.device, deviceInfo);
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
      // Disconnect to stop the running program. The user will need to reconnect.
      // A better implementation would use an AbortController in the worker.
      await backend.disconnect();
      this.port = null;
    },

    resetHistory() {
      this.history = [];
    },
  },
});
