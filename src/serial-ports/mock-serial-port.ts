// Mock serial port that simulates DPS-150 protocol responses
import {
  ALL,
  CMD_GET,
  HEADER_INPUT,
} from '../clients/constants';

// Protocol constants
const RESPONSE_PACKET_SIZE = 144;
const DATA_LENGTH = 139;
const UPDATE_INTERVAL_MS = 500;

// Command codes for handling incoming commands
const CMD_SET_VOLTAGE = 193;
const CMD_SET_CURRENT = 194;
const CMD_OUTPUT_ENABLE = 161;

// Data offsets in the response packet
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
  OUTPUT_ENABLED: 107,
  PROTECTION_STATE: 108,
  CV_MODE: 109,
};

export class MockDPS150SerialPort extends EventTarget implements SerialPort {
  onconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  readonly connected: boolean = true;

  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

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

    // Memory group presets (like original test client)
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
  };

  // Serial port interface implementation
  get readable(): ReadableStream<Uint8Array> | null {
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        this.startDataUpdates();
      },
      cancel: () => {
        this.stopDataUpdates();
      }
    });
  }

  get writable(): WritableStream<Uint8Array> | null {
    return new WritableStream<Uint8Array>({
      write: (chunk) => {
        this.handleCommand(chunk);
      }
    });
  }

  async open(options: SerialOptions): Promise<void> {
    // Mock implementation - no actual serial port to open
  }

  async close(): Promise<void> {
    this.stopDataUpdates();
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
      usbVendorId: 0x1A86, // Mock DPS-150 vendor ID
      usbProductId: 0x7523, // Mock DPS-150 product ID
    };
  }

  forget(): Promise<void> {
    return Promise.resolve();
  }

  // Data update management
  private startDataUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateMockData();
      this.sendDataPacket();
    }, UPDATE_INTERVAL_MS);
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

    this.simulateInputVoltage(20.0); // USB-PD voltage target
    this.simulateTemperature(30.0);  // Room temperature target
  }

  private simulateOutputVoltage(targetVoltage: number): void {
    // Gradually approach set voltage with some noise
    const voltageDiff = targetVoltage - this.mockData.outputVoltage;
    this.mockData.outputVoltage += voltageDiff * 0.1 + (Math.random() - 0.5) * 0.01;
  }

  private simulateOutputCurrent(targetCurrent: number): void {
    // Simulate current with realistic variation around target
    this.mockData.outputCurrent = targetCurrent * 0.5 + (Math.random() - 0.5) * 0.1;
  }

  private simulateInputVoltage(targetVoltage: number): void {
    // Input voltage variations around target with small variations
    this.mockData.inputVoltage = targetVoltage + (Math.random() - 0.5) * 0.2;
  }

  private simulateTemperature(targetTemperature: number): void {
    // Temperature variations around target (±2°C, rounded to 1 decimal)
    this.mockData.temperature = Math.round((targetTemperature + (Math.random() - 0.5) * 4) * 10) / 10;
  }

  // Command handling
  private handleCommand(command: Uint8Array): void {
    if (command.length < 5) return;

    const cmd = command[2]; // Command type
    const dataLen = command[3];

    switch (cmd) {
      case CMD_SET_VOLTAGE:
        if (dataLen === 4) {
          const view = new DataView(command.buffer, command.byteOffset + 4, 4);
          this.mockData.setVoltage = view.getFloat32(0, true);
        }
        break;

      case CMD_SET_CURRENT:
        if (dataLen === 4) {
          const view = new DataView(command.buffer, command.byteOffset + 4, 4);
          this.mockData.setCurrent = view.getFloat32(0, true);
        }
        break;

      case CMD_OUTPUT_ENABLE:
        if (dataLen === 1) {
          this.mockData.outputEnabled = command[4] === 1;
        }
        break;
    }
  }

  // Protocol packet generation
  private sendDataPacket(): void {
    if (!this.controller) return;

    const response = this.createResponsePacket();
    this.controller.enqueue(response);
  }

  private createResponsePacket(): Uint8Array {
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

    // Status flags
    view.setUint8(OFFSETS.OUTPUT_ENABLED, this.mockData.outputEnabled ? 1 : 0);
    view.setUint8(OFFSETS.PROTECTION_STATE, 0); // No protection active
    view.setUint8(OFFSETS.CV_MODE, 1); // Constant voltage mode
  }

  private setChecksum(response: Uint8Array): void {
    let checksum = response[2] + response[3];
    for (let i = 4; i < response.length - 1; i++) {
      checksum += response[i];
    }
    response[response.length - 1] = checksum & 0xFF;
  }
}