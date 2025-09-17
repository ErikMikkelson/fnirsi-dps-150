import { vi } from 'vitest';

export class MockSerialPort extends EventTarget implements SerialPort {
  isOpen: boolean;
  isClosing: boolean = false;
  openOptions: any;
  writtenData: Uint8Array[];
  readQueue: Uint8Array[];
  readerCancelled: boolean;
  _reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  _writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  _dataWaiters: ((result: ReadableStreamReadResult<Uint8Array>) => void)[];

  // WireMock-style response expectations
  private responseStubs: Array<{
    matcher: (command: Uint8Array) => boolean;
    response: Uint8Array | (() => Uint8Array);
    once?: boolean;
    used?: boolean;
  }> = [];

  // Public getter for testing
  get stubCount(): number {
    return this.responseStubs.length;
  }

  // Add missing properties with mock implementations
  onconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  ondisconnect: ((this: SerialPort, ev: Event) => any) | null = null;
  readonly connected: boolean = false; // Mock value
  setSignals = vi.fn().mockResolvedValue(undefined);
  getSignals = vi.fn().mockResolvedValue({} as SerialSignals);


  constructor() {
    super();
    this.isOpen = false;
    this.openOptions = null;
    this.writtenData = [];
    this.readQueue = [];
    this.readerCancelled = false;
    this._dataWaiters = [];
  }

  get readable(): ReadableStream<Uint8Array> {
    // Create a new ReadableStream for each access to avoid locking issues
    const stream = new ReadableStream({
      start: (controller) => {
        // Store controller on the mock instance so we can push data from tests
        (this as any)._controller = controller;
      },
      pull: (controller) => {
        // No-op for mock
      },
      cancel: (reason) => {
        this.readerCancelled = true;
        // console.log('Stream cancelled:', reason);
      }
    });
    
    return stream;
  }

  // WireMock-style API methods

  /**
   * Set up a response for when a specific command is received
   * @param commandMatcher Function to match incoming commands
   * @param response The response to send back (can be static data or a function)
   * @param once If true, this stub will only be used once
   */
  whenReceiving(commandMatcher: (command: Uint8Array) => boolean): {
    respondWith: (response: Uint8Array | (() => Uint8Array), once?: boolean) => void;
  } {
    return {
      respondWith: (response: Uint8Array | (() => Uint8Array), once = false) => {
        this.responseStubs.push({
          matcher: commandMatcher,
          response,
          once,
          used: false
        });
      }
    };
  }

  /**
   * Convenience method for setting up responses to specific command types
   */
  expectCommand(cmdType: number, parameter?: number): {
    respondWith: (response: Uint8Array | (() => Uint8Array), once?: boolean) => void;
  } {
    const matcher = (command: Uint8Array) => {
      if (command.length < 4) return false;
      if (command[1] !== cmdType) return false; // command[1] is c2 (command type)
      if (parameter !== undefined && command[2] !== parameter) return false; // command[2] is c3 (parameter)
      return true;
    };

    return this.whenReceiving(matcher);
  }



  /**
   * Clear all response stubs
   */
  clearStubs(): void {
    this.responseStubs = [];
  }

  /**
   * Reset the mock to its initial state
   */
  reset(): void {
    this.clearStubs();
    this.writtenData = [];
    this.readQueue = [];
    this.readerCancelled = false;
    this._dataWaiters = [];
  }

  async open(options: any) {
    if (this.isOpen) {
      throw new Error('Port is already open');
    }
    this.openOptions = options;
    this.isOpen = true;
    this.readerCancelled = false;
  }

  async close() {
    if (!this.isOpen) {
      // Allow closing an already closed port
      return;
    }
    this.isClosing = true;
    this.isOpen = false;
    this.readerCancelled = true;

    // Close the readable stream controller if it exists
    if ((this as any)._controller) {
      try {
        (this as any)._controller.close();
      } catch (e) {
        // Ignore if already closing
      }
    }

    this.isClosing = false;
  }

  async forget() {
    // SerialPort.forget()のモック
  }

  getInfo() {
    return {
      usbVendorId: 0x1234,
      usbProductId: 0x5678
    };
  }

  get writable(): WritableStream<Uint8Array> {
    // Create a new WritableStream for each access to avoid locking issues
    return new WritableStream({
      write: async (chunk) => {
        // Always allow writes in tests - mock hardware behavior
        // Real hardware may reject writes to closed ports, but for testing we capture all attempts
        const data = new Uint8Array(chunk);
        this.writtenData.push(data);

        // Check for WireMock-style response stubs and respond if matched
        this.handleWireMockResponse(data);
      },
      close: async () => {
        // console.log('Writer closed');
      },
      abort: async (reason) => {
        // console.log('Writer aborted:', reason);
      }
    }, new CountQueuingStrategy({ highWaterMark: 1 }));
  }

  // Handle WireMock-style responses for any commands
  private handleWireMockResponse(commandData: Uint8Array) {
    // Find a matching stub for this command
    for (let i = 0; i < this.responseStubs.length; i++) {
      const stub = this.responseStubs[i];

      // Skip if this is a once-only stub that's already been used
      if (stub.once && stub.used) continue;

      // Check if this stub matches the command
      if (stub.matcher(commandData)) {
        // Mark as used if it's a once-only stub
        if (stub.once) {
          stub.used = true;
        }

        // Use setTimeout to ensure promise setup completes before response
        setTimeout(() => {
          if (this.isOpen) {
            const response = typeof stub.response === 'function'
              ? stub.response()
              : stub.response;
            this.pushReadData(response);
          }
        }, 0);

        return; // Stop after first match
      }
    }
  }

  /**
   * Public helper to create string responses for tests
   */
  createStringResponse(type: number, value: string): Uint8Array {
    const data = new TextEncoder().encode(value);
    const packet = new Uint8Array(5 + data.length);
    packet[0] = 0xf0; // HEADER_INPUT
    packet[1] = 0xa1; // CMD_GET
    packet[2] = type;
    packet[3] = data.length;
    packet.set(data, 4);

    // Calculate checksum
    let checksum = type + data.length;
    for (let i = 0; i < data.length; i++) {
      checksum += data[i];
    }
    packet[4 + data.length] = checksum % 256;

    return packet;
  }



  /**
   * Public helper to create ALL response for tests
   */
  createAllResponse(): Uint8Array {
    // Create a minimal ALL response with 139 bytes of data
    const dataSize = 139;
    const packet = new Uint8Array(5 + dataSize);
    packet[0] = 0xf0; // HEADER_INPUT
    packet[1] = 0xa1; // CMD_GET
    packet[2] = 255;  // ALL
    packet[3] = dataSize;

    // Fill with some mock data (zeros for simplicity)
    for (let i = 4; i < 4 + dataSize; i++) {
      packet[i] = 0;
    }

    // Calculate checksum
    let checksum = 255 + dataSize;
    for (let i = 4; i < 4 + dataSize; i++) {
      checksum += packet[i];
    }
    packet[4 + dataSize] = checksum % 256;

    return packet;
  }

  // テスト用ヘルパーメソッド
  pushReadData(data: Uint8Array) {
    if (this.isOpen && (this as any)._controller) {
      (this as any)._controller.enqueue(data);
    }
  }

  getWrittenData() {
    return this.writtenData;
  }
}

export const mockSerial = {
  ports: [] as MockSerialPort[],
  listeners: {} as { [key: string]: any[] },

  addEventListener(event: string, callback: any) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  removeEventListener(event: string, callback: any) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  },

  async getPorts() {
    return this.ports;
  },

  // テスト用ヘルパー
  addMockPort(port: MockSerialPort) {
    this.ports.push(port);
  },

  clearMockPorts() {
    this.ports = [];
  },

  triggerConnect(port: MockSerialPort) {
    if (this.listeners['connect']) {
      this.listeners['connect'].forEach(cb => cb({ port }));
    }
  },

  triggerDisconnect(port: MockSerialPort) {
    if (this.listeners['disconnect']) {
      this.listeners['disconnect'].forEach(cb => cb({ port }));
    }
  }
};

// テストで使用するためのエクスポート
// 実際のセットアップはテストファイル内でvi.stubGlobal()を使って行う