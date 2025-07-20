import { vi } from 'vitest';

export class MockSerialPort {
  constructor() {
    this.isOpen = false;
    this.openOptions = null;
    this.writtenData = [];
    this.readQueue = [];
    this.readerCancelled = false;
    this._readable = null;
    this._writable = null;
    this._reader = null;
    this._writer = null;
    this._dataWaiters = [];
  }

  async open(options) {
    if (this.isOpen) {
      throw new Error('Port is already open');
    }
    this.openOptions = options;
    this.isOpen = true;
    this.readerCancelled = false;
    
    // WritableStreamのモック
    this._writable = {
      getWriter: () => {
        this._writer = {
          write: vi.fn(async (data) => {
            this.writtenData.push(new Uint8Array(data));
          }),
          releaseLock: vi.fn()
        };
        return this._writer;
      }
    };

    // ReadableStreamのモック
    this._readable = {
      getReader: () => {
        this._reader = {
          read: vi.fn(async () => {
            if (this.readerCancelled) {
              return { done: true };
            }
            
            // readQueueからデータを取り出す
            if (this.readQueue.length > 0) {
              const value = this.readQueue.shift();
              return { value, done: false };
            }
            
            // データがない場合は実際のReadableStreamのように待機
            return new Promise((resolve) => {
              this._dataWaiters.push(resolve);
            });
          }),
          cancel: vi.fn(async () => {
            this.readerCancelled = true;
            // 待機中のreaderをすべて終了
            this._dataWaiters.forEach(resolve => resolve({ done: true }));
            this._dataWaiters = [];
          }),
          releaseLock: vi.fn()
        };
        return this._reader;
      }
    };
  }

  async close() {
    if (!this.isOpen) {
      throw new Error('Port is not open');
    }
    this.isOpen = false;
    this._readable = null;
    this._writable = null;
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

  get readable() {
    return this.isOpen ? this._readable : null;
  }

  get writable() {
    return this.isOpen ? this._writable : null;
  }

  // テスト用ヘルパーメソッド
  pushReadData(data) {
    this.readQueue.push(new Uint8Array(data));
    
    // 待機中のreaderがあれば通知
    if (this._dataWaiters.length > 0) {
      const resolve = this._dataWaiters.shift();
      const value = this.readQueue.shift();
      resolve({ value, done: false });
    }
  }

  getWrittenData() {
    return this.writtenData;
  }

  clearWrittenData() {
    this.writtenData = [];
  }
}

// navigator.serialのモック
export const mockSerial = {
  ports: [],
  
  getPorts: vi.fn(async () => {
    return mockSerial.ports;
  }),
  
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  
  // テスト用ヘルパー
  addMockPort(port) {
    this.ports.push(port);
  },
  
  clearPorts() {
    this.ports = [];
  },
  
  triggerDisconnect(port) {
    const listeners = this.addEventListener.mock.calls
      .filter(call => call[0] === 'disconnect')
      .map(call => call[1]);
    
    listeners.forEach(listener => {
      listener({ target: port });
    });
  }
};

// テストで使用するためのエクスポート
// 実際のセットアップはテストファイル内でvi.stubGlobal()を使って行う