declare global {
  interface Navigator {
    serial: Serial;
  }

  interface Serial {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }

  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<Uint8Array>;
    readonly connected: boolean;
    onconnect: ((this: SerialPort, ev: Event) => any) | null;
    ondisconnect: ((this: SerialPort, ev: Event) => any) | null;

    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
    getSignals(): Promise<SerialSignals>;
    setSignals(signals: SerialOutputSignals): Promise<void>;
  }

  interface SerialOutputSignals {
    dataTerminalReady?: boolean;
    requestToSend?: boolean;
    break?: boolean;
  }

  interface SerialSignals {
    dataCarrierDetect: boolean;
    clearToSend: boolean;
    ringIndicator: boolean;
    dataSetReady: boolean;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }

  interface ReadableStream<R> {
    getReader(): ReadableStreamDefaultReader<R>;
  }

  interface ReadableStreamDefaultReader<R> {
    read(): Promise<ReadableStreamReadResult<R>>;
    releaseLock(): void;
    cancel(reason?: any): Promise<void>;
  }

  interface ReadableStreamReadResult<T> {
    value?: T;
    done: boolean;
  }

  interface WritableStream<W> {
    getWriter(): WritableStreamDefaultWriter<W>;
  }

  interface WritableStreamDefaultWriter<W> {
    write(chunk: W): Promise<void>;
    releaseLock(): void;
    close(): Promise<void>;
    abort(reason?: any): Promise<void>;
  }
}

export {};
