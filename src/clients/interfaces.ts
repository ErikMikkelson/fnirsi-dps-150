export interface SystemInfo {
  outputEnabled: boolean;
  cv_cc: 'CV' | 'CC';
  protectionState: string;
  voltage: number;
  current: number;
  power: number;
  inputVoltage: number;
  temperature: number;
}

export interface DeviceInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  upperLimitVoltage: number;
  upperLimitCurrent: number;
  setVoltage: number;
  setCurrent: number;
  group1setVoltage: number;
  group1setCurrent: number;
  group2setVoltage: number;
  group2setCurrent: number;
  group3setVoltage: number;
  group3setCurrent: number;
  group4setVoltage: number;
  group4setCurrent: number;
  group5setVoltage: number;
  group5setCurrent: number;
  group6setVoltage: number;
  group6setCurrent: number;
  overVoltageProtection: number;
  overCurrentProtection: number;
  overPowerProtection: number;
  overTemperatureProtection: number;
  lowVoltageProtection: number;
  brightness: number;
  volume: number;
}

export interface DeviceData {
  inputVoltage?: number;
  outputVoltage?: number;
  outputCurrent?: number;
  outputPower?: number;
  temperature?: number;
  outputCapacity?: number;
  outputEnergy?: number;
  outputEnabled?: boolean;
  protectionState?: string;
  mode?: "CC" | "CV";
  modelName?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  upperLimitVoltage?: number;
  upperLimitCurrent?: number;
  setVoltage?: number;
  setCurrent?: number;
  group1setVoltage?: number;
  group1setCurrent?: number;
  group2setVoltage?: number;
  group2setCurrent?: number;
  group3setVoltage?: number;
  group3setCurrent?: number;
  group4setVoltage?: number;
  group4setCurrent?: number;
  group5setVoltage?: number;
  group5setCurrent?: number;
  group6setVoltage?: number;
  group6setCurrent?: number;
  overVoltageProtection?: number;
  overCurrentProtection?: number;
  overPowerProtection?: number;
  overTemperatureProtection?: number;
  lowVoltageProtection?: number;
  brightness?: number;
  volume?: number;
  meteringClosed?: boolean;
}
export interface GroupValue {
  setVoltage: number;
  setCurrent: number;
}

export interface DeviceClient {
  getDeviceInfo(): Promise<DeviceInfo>;
  getSystemInfo(): Promise<SystemInfo>;
  getGroupValue(group: number): Promise<GroupValue>;
  setFloatValue(command: number, value: number): Promise<void>;
  setByteValue(command: number, value: number): Promise<void>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  startMetering(): Promise<void>;
  stopMetering(): Promise<void>;
  close(): Promise<void>;
  start?(): Promise<void>;
  init?(onUpdate: (data: any) => void): Promise<void>;
  connectTest?(): Promise<void>;
}

