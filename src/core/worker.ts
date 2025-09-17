import * as Comlink from 'comlink';

import { DPS150 } from './dps-150';
import { TestDPS150 } from './dps-150.test-client';

let dps: DPS150 | TestDPS150 | null = null;

const exposed = {
  async connect(port: SerialPort, onUpdate: (data: any) => void) {
    dps = new DPS150(port, onUpdate);
    await dps.start();
    return true;
  },
  async connectTest(onUpdate: (data: any) => void) {
    dps = new TestDPS150();
    await dps.init(onUpdate);
    return true;
  },
  async disconnect() {
    if (dps) {
      // @ts-ignore
      await dps.close();
      dps = null;
    }
  },
  async getDeviceInfo() {
    return dps?.getDeviceInfo();
  },
  async getSystemInfo() {
    return dps?.getSystemInfo();
  },
  async getGroupValue(group: number) {
    return dps?.getGroupValue(group);
  },
  async setFloatValue(command: number, value: number) {
    await dps?.setFloatValue(command, value);
  },
  async setByteValue(command: number, value: number) {
    await dps?.setByteValue(command, value);
  },
  async enable() {
    await dps?.enable();
  },
  async disable() {
    await dps?.disable();
  },
  async startMetering() {
    // await dps?.startMetering();
  },
  async stopMetering() {
    // await dps?.stopMetering();
  },
  async executeCommands(commands: any[], onProgress: (n: number) => void) {
    if (!dps) return;
    let i = 0;
    for (const command of commands) {
      onProgress(commands.length - i);
      i++;
      switch (command.type) {
        case 'V':
          await dps.setFloatValue(193, command.args[0]);
          break;
        case 'I':
          await dps.setFloatValue(194, command.args[0]);
          break;
        case 'ON':
          await dps.enable();
          break;
        case 'OFF':
          await dps.disable();
          break;
        case 'SLEEP':
          await new Promise((resolve) => setTimeout(resolve, command.args[0]));
          break;
      }
    }
    onProgress(0);
  },
};

Comlink.expose(exposed);


