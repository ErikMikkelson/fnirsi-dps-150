import {
  DeviceInfo,
  GroupValue,
  SystemInfo,
} from './dps-150';

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
