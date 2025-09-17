import {
  DeviceInfo,
  DPS150Commands,
  GroupValue,
  SystemInfo,
} from './dps-150';

export class TestDPS150 {
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: ((data: any) => void) | null = null;

  private systemInfo: SystemInfo = {
    outputClosed: true,
    cv_cc: 'CV',
    protectionState: '',
    voltage: 0,
    current: 0,
    power: 0,
    inputVoltage: 12.5,
    temperature: 30,
  };

  private deviceInfo: DeviceInfo = {
    model: 'DPS-150-TEST',
    serialNumber: '12345678',
    firmwareVersion: '1.0',
    upperLimitVoltage: 150,
    upperLimitCurrent: 10,
    setVoltage: 0,
    setCurrent: 0,
    group1setVoltage: 1,
    group1setCurrent: 0.1,
    group2setVoltage: 2,
    group2setCurrent: 0.2,
    group3setVoltage: 3,
    group3setCurrent: 0.3,
    group4setVoltage: 4,
    group4setCurrent: 0.4,
    group5setVoltage: 5,
    group5setCurrent: 0.5,
    group6setVoltage: 6,
    group6setCurrent: 0.6,
    overVoltageProtection: 155,
    overCurrentProtection: 10.5,
    overPowerProtection: 1600,
    overTemperatureProtection: 80,
    lowVoltageProtection: 0,
    brightness: 5,
    volume: 5,
  };

  constructor() {}

  async init(onUpdate: (data: any) => void) {
    this.onUpdate = onUpdate;
    this.startSendingUpdates();
  }

  private startSendingUpdates() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      // Simulate some fluctuations
      this.systemInfo.voltage = this.deviceInfo.setVoltage * (this.systemInfo.outputClosed ? 1 : 0) + (Math.random() - 0.5) * 0.01;
      this.systemInfo.current = this.deviceInfo.setCurrent * (this.systemInfo.outputClosed ? 1 : 0) + (Math.random() - 0.5) * 0.001;
      this.systemInfo.power = this.systemInfo.voltage * this.systemInfo.current;
      this.systemInfo.inputVoltage = 12.5 + (Math.random() - 0.5) * 0.1;
      this.systemInfo.temperature = 30 + (Math.random() - 0.5) * 2;

      if (this.onUpdate) {
        this.onUpdate({ type: 'systemInfo', data: this.systemInfo });
      }
    }, 500);
  }

  async getFloatValue(command: number): Promise<number> {
    return 0; // Not implemented for all commands yet
  }

  async getByteValue(command: number): Promise<number> {
    return 0; // Not implemented for all commands yet
  }

  async setFloatValue(command: number, value: number): Promise<void> {
    const key = Object.keys(DPS150Commands).find(
      (k) => (DPS150Commands as any)[k] === command
    );
    if (key && key in this.deviceInfo) {
      (this.deviceInfo as any)[key] = value;
    }
  }

  async setByteValue(command: number, value: number): Promise<void> {
     const key = Object.keys(DPS150Commands).find(
      (k) => (DPS150Commands as any)[k] === command
    );
    if (key && key in this.deviceInfo) {
      (this.deviceInfo as any)[key] = value;
    }
  }

  async enable(): Promise<void> {
    this.systemInfo.outputClosed = true;
  }

  async disable(): Promise<void> {
    this.systemInfo.outputClosed = false;
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return this.deviceInfo;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return this.systemInfo;
  }

  async getGroupValue(group: number): Promise<GroupValue> {
    return {
      setVoltage: (this.deviceInfo as any)[`group${group}setVoltage`],
      setCurrent: (this.deviceInfo as any)[`group${group}setCurrent`],
    };
  }

  async close(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
