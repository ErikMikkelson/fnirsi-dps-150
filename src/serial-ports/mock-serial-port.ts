// Mock serial port that simulates DPS-150 protocol responses
import {
  ALL,
  CMD_GET,
  CMD_SET,
  HEADER_INPUT,
  OUTPUT_ENABLE,
  VOLTAGE_SET,
  CURRENT_SET,
  BRIGHTNESS,
  VOLUME,
  MODEL_NAME,
  HARDWARE_VERSION,
  FIRMWARE_VERSION,
} from '../clients/constants';

// Protocol constants
const RESPONSE_PACKET_SIZE = 144;
const DATA_LENGTH = 139;
const UPDATE_INTERVAL_MS = 500;

// Data offsets in the ALL response packet (relative to data start at byte 4)
const OFFSETS = {
  INPUT_VOLTAGE: 0,
  SET_VOLTAGE: 4,
  SET_CURRENT: 8,
  OUTPUT_VOLTAGE: 12,
  OUTPUT_CURRENT: 16,
  OUTPUT_POWER: 20,
  TEMPERATURE: 24,
  GROUP1_VOLTAGE: 28,
  GROUP1_CURRENT: 32,
  GROUP2_VOLTAGE: 36,
  GROUP2_CURRENT: 40,
  GROUP3_VOLTAGE: 44,
  GROUP3_CURRENT: 48,
  GROUP4_VOLTAGE: 52,
  GROUP4_CURRENT: 56,
  GROUP5_VOLTAGE: 60,
  GROUP5_CURRENT: 64,
  GROUP6_VOLTAGE: 68,
  GROUP6_CURRENT: 72,
  OVP: 76,
  OCP: 80,
  OPP: 84,
  OTP: 88,
  LVP: 92,
  BRIGHTNESS: 96,
  VOLUME: 97,
  METERING_CLOSED: 98,
  OUTPUT_CAPACITY: 99,
  OUTPUT_ENERGY: 103,
  OUTPUT_ENABLED: 107,
  PROTECTION_STATE: 108,
  CV_MODE: 109,
  UPPER_LIMIT_VOLTAGE: 111,
  UPPER_LIMIT_CURRENT: 115,
};

// Map of data types to mock data keys for float SET commands
const FLOAT_SET_MAP: Record<number, string> = {
  // Group voltage/current (197-208)
  197: 'group1setVoltage', 198: 'group1setCurrent',
  199: 'group2setVoltage', 200: 'group2setCurrent',
  201: 'group3setVoltage', 202: 'group3setCurrent',
  203: 'group4setVoltage', 204: 'group4setCurrent',
  205: 'group5setVoltage', 206: 'group5setCurrent',
  207: 'group6setVoltage', 208: 'group6setCurrent',
  // Protection thresholds (209-213)
  209: 'overVoltageProtection',
  210: 'overCurrentProtection',
  211: 'overPowerProtection',
  212: 'overTemperatureProtection',
  213: 'lowVoltageProtection',
};

export class MockDPS150SerialPort extends EventTarget implements SerialPort {
  onconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  readonly connected: boolean = true;

  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private updateInterval: number | null = null;
  private _readable: ReadableStream<Uint8Array> | null = null;
  private _writable: WritableStream<Uint8Array> | null = null;

  private mockData = {
    // Power supply settings
    setVoltage: 5.0,
    setCurrent: 1.0,
    outputEnabled: true,

    // Live measurements (start close to target for quicker convergence)
    outputVoltage: 4.5,
    outputCurrent: 0.5,
    inputVoltage: 20.0,
    temperature: 30.0,

    // Memory group presets
    group1setVoltage: 1.0,
    group1setCurrent: 0.1,
    group2setVoltage: 2.0,
    group2setCurrent: 0.2,
    group3setVoltage: 3.0,
    group3setCurrent: 0.3,
    group4setVoltage: 4.0,
    group4setCurrent: 0.4,
    group5setVoltage: 5.0,
    group5setCurrent: 0.5,
    group6setVoltage: 6.0,
    group6setCurrent: 0.6,

    // Protection thresholds
    overVoltageProtection: 33.0,
    overCurrentProtection: 5.5,
    overPowerProtection: 160.0,
    overTemperatureProtection: 80.0,
    lowVoltageProtection: 1.0,

    // Settings
    brightness: 7,
    volume: 5,

    // Metering
    meteringClosed: false,
    outputCapacity: 0.125,
    outputEnergy: 0.625,

    // Device limits
    upperLimitVoltage: 32.0,
    upperLimitCurrent: 5.1,
  };

  // Device info (responds to GET queries)
  private deviceInfo = {
    modelName: 'DPS-150',
    hardwareVersion: '1.0',
    firmwareVersion: '2.3',
  };

  // Serial port interface implementation — cached to avoid creating new streams on every access
  get readable(): ReadableStream<Uint8Array> | null {
    if (!this._readable) {
      this._readable = new ReadableStream<Uint8Array>({
        start: (controller) => {
          this.controller = controller;
          this.startDataUpdates();
        },
        cancel: () => {
          this.stopDataUpdates();
          this._readable = null;
        }
      });
    }
    return this._readable;
  }

  get writable(): WritableStream<Uint8Array> | null {
    if (!this._writable) {
      this._writable = new WritableStream<Uint8Array>({
        write: (chunk) => {
          this.handleCommand(chunk);
        }
      });
    }
    return this._writable;
  }

  async open(options: SerialOptions): Promise<void> {
    // Mock implementation - no actual serial port to open
  }

  async close(): Promise<void> {
    this.stopDataUpdates();
    this.controller = null;
    this._readable = null;
    this._writable = null;
  }

  setSignals(signals: SerialOutputSignals): Promise<void> {
    return Promise.resolve();
  }

  getSignals(): Promise<SerialInputSignals> {
    return Promise.resolve({
      dataCarrierDetect: false,
      clearToSend: true,
      ringIndicator: false,
      dataSetReady: true,
    });
  }

  getInfo(): SerialPortInfo {
    return {
      usbVendorId: 0x1A86,
      usbProductId: 0x7523,
    };
  }

  forget(): Promise<void> {
    return Promise.resolve();
  }

  // Data update management
  private startDataUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateMockData();
      this.sendAllDataPacket();
    }, UPDATE_INTERVAL_MS) as unknown as number;
  }

  private stopDataUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Mock data simulation
  private updateMockData(): void {
    if (this.mockData.outputEnabled) {
      this.simulateOutputVoltage(this.mockData.setVoltage);
      this.simulateOutputCurrent(this.mockData.setCurrent);
    } else {
      this.mockData.outputVoltage = 0;
      this.mockData.outputCurrent = 0;
    }

    this.simulateInputVoltage(20.0);
    this.simulateTemperature(30.0);

    // Accumulate capacity and energy when output is enabled
    if (this.mockData.outputEnabled) {
      const intervalHours = UPDATE_INTERVAL_MS / 3600000;
      this.mockData.outputCapacity += this.mockData.outputCurrent * intervalHours;
      this.mockData.outputEnergy += this.mockData.outputVoltage * this.mockData.outputCurrent * intervalHours;
    }
  }

  private simulateOutputVoltage(targetVoltage: number): void {
    const voltageDiff = targetVoltage - this.mockData.outputVoltage;
    this.mockData.outputVoltage += voltageDiff * 0.1 + (Math.random() - 0.5) * 0.01;
  }

  private simulateOutputCurrent(targetCurrent: number): void {
    this.mockData.outputCurrent = targetCurrent * 0.5 + (Math.random() - 0.5) * 0.1;
  }

  private simulateInputVoltage(targetVoltage: number): void {
    this.mockData.inputVoltage = targetVoltage + (Math.random() - 0.5) * 0.2;
  }

  private simulateTemperature(targetTemperature: number): void {
    this.mockData.temperature = Math.round((targetTemperature + (Math.random() - 0.5) * 4) * 10) / 10;
  }

  // Command handling
  private handleCommand(command: Uint8Array): void {
    if (command.length < 5) return;

    const cmdType = command[1]; // GET=0xa1, SET=0xb1, etc.
    const dataType = command[2];

    if (cmdType === CMD_GET) {
      this.handleGetCommand(dataType);
    } else if (cmdType === CMD_SET) {
      this.handleSetCommand(dataType, command);
    }
    // Ignore CMD_XXX_193 (0xc1) and CMD_XXX_176 (0xb0) init commands
  }

  private handleGetCommand(dataType: number): void {
    if (!this.controller) return;

    switch (dataType) {
      case MODEL_NAME:
        this.sendStringResponse(MODEL_NAME, this.deviceInfo.modelName);
        break;
      case HARDWARE_VERSION:
        this.sendStringResponse(HARDWARE_VERSION, this.deviceInfo.hardwareVersion);
        break;
      case FIRMWARE_VERSION:
        this.sendStringResponse(FIRMWARE_VERSION, this.deviceInfo.firmwareVersion);
        break;
      case ALL:
        this.sendAllDataPacket();
        break;
    }
  }

  private handleSetCommand(dataType: number, command: Uint8Array): void {
    const dataLen = command[3];

    switch (dataType) {
      case VOLTAGE_SET:
        if (dataLen === 4) {
          const view = new DataView(command.buffer, command.byteOffset + 4, 4);
          this.mockData.setVoltage = view.getFloat32(0, true);
        }
        break;

      case CURRENT_SET:
        if (dataLen === 4) {
          const view = new DataView(command.buffer, command.byteOffset + 4, 4);
          this.mockData.setCurrent = view.getFloat32(0, true);
        }
        break;

      case OUTPUT_ENABLE:
        if (dataLen === 1) {
          this.mockData.outputEnabled = command[4] === 1;
        }
        break;

      case BRIGHTNESS:
        if (dataLen === 1) {
          this.mockData.brightness = command[4];
        }
        break;

      case VOLUME:
        if (dataLen === 1) {
          this.mockData.volume = command[4];
        }
        break;

      default:
        // Handle float SET commands for groups (197-208) and protections (209-213)
        if (dataLen === 4 && dataType in FLOAT_SET_MAP) {
          const view = new DataView(command.buffer, command.byteOffset + 4, 4);
          (this.mockData as any)[FLOAT_SET_MAP[dataType]] = view.getFloat32(0, true);
        }
        break;
    }
  }

  // Response packet generation
  private sendStringResponse(type: number, value: string): void {
    if (!this.controller) return;

    const data = new TextEncoder().encode(value);
    const packet = new Uint8Array(5 + data.length);
    packet[0] = HEADER_INPUT;
    packet[1] = CMD_GET;
    packet[2] = type;
    packet[3] = data.length;
    packet.set(data, 4);

    let checksum = type + data.length;
    for (let i = 0; i < data.length; i++) {
      checksum += data[i];
    }
    packet[4 + data.length] = checksum & 0xFF;

    this.controller.enqueue(packet);
  }

  private sendAllDataPacket(): void {
    if (!this.controller) return;

    const response = this.createAllResponsePacket();
    this.controller.enqueue(response);
  }

  private createAllResponsePacket(): Uint8Array {
    const response = new Uint8Array(RESPONSE_PACKET_SIZE);

    // Packet header
    response[0] = HEADER_INPUT;
    response[1] = CMD_GET;
    response[2] = ALL;
    response[3] = DATA_LENGTH;

    // Fill data payload
    this.fillDataPayload(response);

    // Calculate and set checksum
    this.setChecksum(response);

    return response;
  }

  private fillDataPayload(response: Uint8Array): void {
    const view = new DataView(response.buffer, 4);

    // Basic measurements
    view.setFloat32(OFFSETS.INPUT_VOLTAGE, this.mockData.inputVoltage, true);
    view.setFloat32(OFFSETS.SET_VOLTAGE, this.mockData.setVoltage, true);
    view.setFloat32(OFFSETS.SET_CURRENT, this.mockData.setCurrent, true);
    view.setFloat32(OFFSETS.OUTPUT_VOLTAGE, this.mockData.outputVoltage, true);
    view.setFloat32(OFFSETS.OUTPUT_CURRENT, this.mockData.outputCurrent, true);
    view.setFloat32(OFFSETS.OUTPUT_POWER, this.mockData.outputVoltage * this.mockData.outputCurrent, true);
    view.setFloat32(OFFSETS.TEMPERATURE, this.mockData.temperature, true);

    // Memory group values
    view.setFloat32(OFFSETS.GROUP1_VOLTAGE, this.mockData.group1setVoltage, true);
    view.setFloat32(OFFSETS.GROUP1_CURRENT, this.mockData.group1setCurrent, true);
    view.setFloat32(OFFSETS.GROUP2_VOLTAGE, this.mockData.group2setVoltage, true);
    view.setFloat32(OFFSETS.GROUP2_CURRENT, this.mockData.group2setCurrent, true);
    view.setFloat32(OFFSETS.GROUP3_VOLTAGE, this.mockData.group3setVoltage, true);
    view.setFloat32(OFFSETS.GROUP3_CURRENT, this.mockData.group3setCurrent, true);
    view.setFloat32(OFFSETS.GROUP4_VOLTAGE, this.mockData.group4setVoltage, true);
    view.setFloat32(OFFSETS.GROUP4_CURRENT, this.mockData.group4setCurrent, true);
    view.setFloat32(OFFSETS.GROUP5_VOLTAGE, this.mockData.group5setVoltage, true);
    view.setFloat32(OFFSETS.GROUP5_CURRENT, this.mockData.group5setCurrent, true);
    view.setFloat32(OFFSETS.GROUP6_VOLTAGE, this.mockData.group6setVoltage, true);
    view.setFloat32(OFFSETS.GROUP6_CURRENT, this.mockData.group6setCurrent, true);

    // Protection thresholds
    view.setFloat32(OFFSETS.OVP, this.mockData.overVoltageProtection, true);
    view.setFloat32(OFFSETS.OCP, this.mockData.overCurrentProtection, true);
    view.setFloat32(OFFSETS.OPP, this.mockData.overPowerProtection, true);
    view.setFloat32(OFFSETS.OTP, this.mockData.overTemperatureProtection, true);
    view.setFloat32(OFFSETS.LVP, this.mockData.lowVoltageProtection, true);

    // Settings
    view.setUint8(OFFSETS.BRIGHTNESS, this.mockData.brightness);
    view.setUint8(OFFSETS.VOLUME, this.mockData.volume);
    view.setUint8(OFFSETS.METERING_CLOSED, this.mockData.meteringClosed ? 0 : 1);

    // Metering values
    view.setFloat32(OFFSETS.OUTPUT_CAPACITY, this.mockData.outputCapacity, true);
    view.setFloat32(OFFSETS.OUTPUT_ENERGY, this.mockData.outputEnergy, true);

    // Status flags
    view.setUint8(OFFSETS.OUTPUT_ENABLED, this.mockData.outputEnabled ? 1 : 0);
    view.setUint8(OFFSETS.PROTECTION_STATE, 0); // No protection active
    view.setUint8(OFFSETS.CV_MODE, 1); // Constant voltage mode

    // Upper limits
    view.setFloat32(OFFSETS.UPPER_LIMIT_VOLTAGE, this.mockData.upperLimitVoltage, true);
    view.setFloat32(OFFSETS.UPPER_LIMIT_CURRENT, this.mockData.upperLimitCurrent, true);
  }

  private setChecksum(response: Uint8Array): void {
    let checksum = response[2] + response[3];
    for (let i = 4; i < response.length - 1; i++) {
      checksum += response[i];
    }
    response[response.length - 1] = checksum & 0xFF;
  }
}
