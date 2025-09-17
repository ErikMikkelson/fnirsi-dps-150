import { vi } from 'vitest';

export class MockSerialPort extends EventTarget implements SerialPort {
  isOpen: boolean;
  openOptions: any;
  writtenData: Uint8Array[];
  readQueue: Uint8Array[];
  readerCancelled: boolean;
  _readable: ReadableStream<Uint8Array>;
  _writable: WritableStream<Uint8Array>;
  _reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  _writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  _dataWaiters: ((result: ReadableStreamReadResult<Uint8Array>) => void)[];

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

    // WritableStreamのモック
    this._writable = new WritableStream({
      write: async (chunk) => {
        if (!this.isOpen) {
          throw new Error('Port is not open');
        }
        this.writtenData.push(new Uint8Array(chunk));
      },
      close: async () => {
        // console.log('Writer closed');
      },
      abort: async (reason) => {
        // console.log('Writer aborted:', reason);
      }
    });


    // ReadableStreamのモック
    this._readable = new ReadableStream({
      start: (controller) => {
        // This is a bit of a hack to allow us to push data from the outside
        (this as any)._controller = controller;
      },
      pull: (controller) => {
        //
      },
      cancel: (reason) => {
        this.readerCancelled = true;
        // console.log('Stream cancelled:', reason);
      }
    });
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

    // Abort the writable stream
    if (this.writable && !this.writable.locked) {
        try {
            await this.writable.abort('Port closed');
        } catch(e) {
            // ignore
        }
    }
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

  get readable(): ReadableStream<Uint8Array> {
    return this._readable;
  }

  get writable(): WritableStream<Uint8Array> {
    return this._writable;
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