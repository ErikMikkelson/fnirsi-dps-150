// Mock serial port that simulates DPS-150 protocol responses
export class MockDPS150SerialPort extends EventTarget implements SerialPort {
  onconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  readonly connected: boolean = true;
  
  private mockData = {
    setVoltage: 5.0,
    setCurrent: 1.0,
    outputEnabled: false,
    outputVoltage: 0.0,
    outputCurrent: 0.0,
    inputVoltage: 20.0,
    temperature: 25.0,
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
    if (!this.controller) return;

    // Simulate realistic behavior
    if (this.mockData.outputEnabled) {
      // Gradually approach set voltage
      const diff = this.mockData.setVoltage - this.mockData.outputVoltage;
      this.mockData.outputVoltage += diff * 0.1 + (Math.random() - 0.5) * 0.01;
      this.mockData.outputCurrent = 0.5 + (Math.random() - 0.5) * 0.1;
    } else {
      this.mockData.outputVoltage = 0;
      this.mockData.outputCurrent = 0;
    }

    // Send ALL_DATA response (this is a simplified version)
    const response = new Uint8Array(144); // Total packet size
    response[0] = 0x8A; // HEADER_INPUT
    response[1] = 0x01; // CMD_GET
    response[2] = 0x01; // ALL_DATA
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
    console.log('MockDPS150SerialPort opened with options:', options);
  }

  async close(): Promise<void> {
    console.log('MockDPS150SerialPort closed');
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