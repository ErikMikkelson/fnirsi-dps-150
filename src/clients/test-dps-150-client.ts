import { DPS150Commands } from './constants';
import {
  DeviceClient,
  DeviceInfo,
  GroupValue,
  SystemInfo,
} from './interfaces';

export class TestDPS150Client implements DeviceClient {
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: ((data: any) => void) | null = null;
  private time = 0;

  private systemInfo: SystemInfo = {
    outputEnabled: true, // Enable output by default in test mode
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
    setVoltage: 5,
    setCurrent: 1,
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
  }

  async connectTest() {
    this.startSendingUpdates();
  }

  private startSendingUpdates() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.time += 0.1;
      if (this.systemInfo.outputEnabled) {
        // Simulate realistic power supply behavior
        const setVoltage = this.deviceInfo.setVoltage;
        const setCurrent = this.deviceInfo.setCurrent;

        // Simulate voltage gradually approaching setVoltage with small fluctuations
        const targetVoltage = setVoltage;
        const currentVoltage = this.systemInfo.voltage;
        const voltageDiff = targetVoltage - currentVoltage;
        
        // Gradually approach target voltage with some noise
        this.systemInfo.voltage = currentVoltage + voltageDiff * 0.1 + (Math.random() - 0.5) * 0.01;
        
        // Simulate current with some realistic variation (around 0.5A as requested)
        this.systemInfo.current = 0.5 + (Math.random() - 0.5) * 0.1; // 0.45-0.55A range
        
        // Power = Voltage × Current
        this.systemInfo.power = this.systemInfo.voltage * this.systemInfo.current;
      } else {
        this.systemInfo.voltage = 0;
        this.systemInfo.current = 0;
        this.systemInfo.power = 0;
      }

      this.systemInfo.inputVoltage = 12.5 + (Math.random() - 0.5) * 0.1;
      this.systemInfo.temperature = 30 + (Math.random() - 0.5) * 2;

      if (this.onUpdate) {
        this.onUpdate({ type: 'systemInfo', data: this.systemInfo });
      }
    }, 100);
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
    this.systemInfo.outputEnabled = true;
  }

  async disable(): Promise<void> {
    this.systemInfo.outputEnabled = false;
  }

  async startMetering(): Promise<void> {
    // No-op for test client
  }

  async stopMetering(): Promise<void> {
    // No-op for test client
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
