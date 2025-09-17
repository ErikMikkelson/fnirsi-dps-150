// Mock serial port that simulates DPS-150 protocol responses
import {
  ALL,
  CMD_GET,
  HEADER_INPUT,
} from '../clients/constants';

export class MockDPS150SerialPort extends EventTarget implements SerialPort {
  onconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  readonly connected: boolean = true;

  private mockData = {
    setVoltage: 5.0,
    setCurrent: 1.0,
    outputEnabled: true,  // Enable output by default in test mode
    outputVoltage: 4.5,   // Start close to target for quicker convergence
    outputCurrent: 0.5,   // Start with realistic current
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

  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  get readable(): ReadableStream<Uint8Array> | null {
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        // Start sending periodic updates
        this.updateInterval = setInterval(() => {
          this.sendMockData();
        }, 500);
      },
      cancel: () => {
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }
      }
    });
  }

  get writable(): WritableStream<Uint8Array> | null {
    return new WritableStream<Uint8Array>({
      write: (chunk) => {
        // Parse incoming commands and potentially update mock data
        this.handleCommand(chunk);
      }
    });
  }

  private handleCommand(command: Uint8Array) {
    // Simple command parsing - this would be more sophisticated in a real implementation
    if (command.length >= 5) {
      const cmd = command[2]; // Command type
      const dataLen = command[3];

      // Handle some basic commands
      if (cmd === 193 && dataLen === 4) { // Set voltage
        const view = new DataView(command.buffer, command.byteOffset + 4, 4);
        this.mockData.setVoltage = view.getFloat32(0, true);
      } else if (cmd === 194 && dataLen === 4) { // Set current
        const view = new DataView(command.buffer, command.byteOffset + 4, 4);
        this.mockData.setCurrent = view.getFloat32(0, true);
      } else if (cmd === 161 && dataLen === 1) { // Output enable/disable
        this.mockData.outputEnabled = command[4] === 1;
      }
    }
  }

  private sendMockData() {
    if (!this.controller) {
      return;
    }

    // Simulate realistic behavior
    if (this.mockData.outputEnabled) {
      // Gradually approach set voltage with some noise
      const voltageDiff = this.mockData.setVoltage - this.mockData.outputVoltage;
      this.mockData.outputVoltage += voltageDiff * 0.1 + (Math.random() - 0.5) * 0.01;

      // Simulate current with realistic variation (around 0.5A as in original test)
      this.mockData.outputCurrent = 0.5 + (Math.random() - 0.5) * 0.1;
    } else {
      this.mockData.outputVoltage = 0;
      this.mockData.outputCurrent = 0;
    }

    // Input voltage variations (USB-PD ~20V with small variations)
    this.mockData.inputVoltage = 20.0 + (Math.random() - 0.5) * 0.2;

    // Temperature variations (30°C ± 2°C, rounded to 1 decimal)
    this.mockData.temperature = Math.round((30 + (Math.random() - 0.5) * 4) * 10) / 10;

    // Send ALL_DATA response (this is a simplified version)
    const response = new Uint8Array(144); // Total packet size
    response[0] = HEADER_INPUT; // Use correct header
    response[1] = CMD_GET; // Use correct command
    response[2] = ALL; // Use correct ALL_DATA constant
    response[3] = 139;  // Data length

    // Fill in the data (simplified - real implementation would have all fields)
    const view = new DataView(response.buffer, 4);
    view.setFloat32(0, this.mockData.inputVoltage, true);  // Input voltage
    view.setFloat32(4, this.mockData.setVoltage, true);    // Set voltage
    view.setFloat32(8, this.mockData.setCurrent, true);    // Set current
    view.setFloat32(12, this.mockData.outputVoltage, true); // Output voltage
    view.setFloat32(16, this.mockData.outputCurrent, true); // Output current
    view.setFloat32(20, this.mockData.outputVoltage * this.mockData.outputCurrent, true); // Power
    view.setFloat32(24, this.mockData.temperature, true);   // Temperature

    // Memory group values (at correct offsets as per DPS150Client parsing)
    view.setFloat32(28, this.mockData.group1setVoltage, true); // Group 1 voltage
    view.setFloat32(32, this.mockData.group1setCurrent, true); // Group 1 current
    view.setFloat32(36, this.mockData.group2setVoltage, true); // Group 2 voltage
    view.setFloat32(40, this.mockData.group2setCurrent, true); // Group 2 current
    view.setFloat32(44, this.mockData.group3setVoltage, true); // Group 3 voltage
    view.setFloat32(48, this.mockData.group3setCurrent, true); // Group 3 current
    view.setFloat32(52, this.mockData.group4setVoltage, true); // Group 4 voltage
    view.setFloat32(56, this.mockData.group4setCurrent, true); // Group 4 current
    view.setFloat32(60, this.mockData.group5setVoltage, true); // Group 5 voltage
    view.setFloat32(64, this.mockData.group5setCurrent, true); // Group 5 current
    view.setFloat32(68, this.mockData.group6setVoltage, true); // Group 6 voltage
    view.setFloat32(72, this.mockData.group6setCurrent, true); // Group 6 current

    // Add some default values for other fields...
    view.setUint8(107, this.mockData.outputEnabled ? 1 : 0); // Output enabled
    view.setUint8(108, 0); // Protection state
    view.setUint8(109, 1); // CV mode

    // Calculate checksum
    let checksum = response[2] + response[3];
    for (let i = 4; i < response.length - 1; i++) {
      checksum += response[i];
    }
    response[response.length - 1] = checksum & 0xFF;

    this.controller.enqueue(response);
  }

  async open(options: SerialOptions): Promise<void> {
    // Mock implementation - no actual serial port to open
  }

  async close(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
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
}