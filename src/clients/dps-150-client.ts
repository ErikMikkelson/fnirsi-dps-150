import { sleep } from '../utils';
import {
  ALL,
  CMD_GET,
  CMD_SET,
  CMD_XXX_176,
  CMD_XXX_193,
  FIRMWARE_VERSION,
  HARDWARE_VERSION,
  HEADER_INPUT,
  HEADER_OUTPUT,
  METERING_ENABLE,
  MODEL_NAME,
  OUTPUT_ENABLE,
  PROTECTION_STATES,
} from './constants';
import {
  DeviceClient,
  DeviceInfo,
  GroupValue,
  SystemInfo,
} from './interfaces';

interface DeviceData {
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

export type DPS150Callback = (data: DeviceData) => void;

export class DPS150Client implements DeviceClient {
	private port: SerialPort;
	private callback: DPS150Callback;
	private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	private responsePromises: Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }> = new Map();


	constructor(port: SerialPort, callback: DPS150Callback) {
		this.port = port;
		this.callback = callback;
	}

	async start(): Promise<void> {
		if (!this.port.readable || !this.port.writable) {
			await this.port.open({
				baudRate: 115200,
				bufferSize: 1024,
				dataBits: 8,
				stopBits: 1,
				flowControl: 'hardware',
				parity: 'none'
			});
		}
		console.log('start', this.port);
		this.startReader();
		await this.initCommand();
	}

	async stop(): Promise<void> {
		console.log('stop');
		// Try to send a final command, but don't fail if the port is already closing
		try {
			await this.sendCommand(HEADER_OUTPUT, CMD_XXX_193, 0, 0);
		} catch (error) {
			console.warn("Could not send stop command, port might be closed already:", error);
		}

		if (this.reader) {
			try {
				await this.reader.cancel();
			} catch (error) {
				// Ignore errors on cancel, as the stream might already be closed
			}
			this.reader = undefined;
		}
		if (this.port.readable) { // Check if readable is not null before closing
			try {
				await this.port.close();
			} catch (error) {
				console.error("Error closing port:", error);
			}
		}
	}

	async startReader(): Promise<void> {
		if (!this.port.readable) {
			console.error("Port is not readable");
			return;
		}
		console.log('reading...');
		let buffer = new Uint8Array();
		this.reader = this.port.readable.getReader();
		try {
			while (true) {
				const { value, done } = await this.reader.read();
				if (done) {
					console.log('Reader cancelled or stream closed');
					if (this.reader) {
						try { this.reader.releaseLock(); } catch(e) { /* ignore */ }
					}
					break;
				}
				if (!value) {
					continue;
				}
				const b = new Uint8Array(buffer.length + value.length);
				b.set(buffer);
				b.set(value, buffer.length);
				buffer = b;
				for (let i = 0; i < buffer.length - 6; i++) {
					if (buffer[i] === HEADER_INPUT && buffer[i+1] === CMD_GET) {
						const c1 = buffer[i];
						const c2 = buffer[i+1];
						const c3 = buffer[i+2];
						const c4 = buffer[i+3];
						if (i+4+c4 > buffer.length) { // Ensure entire packet is in buffer
							break
						}
						const c5 = new Uint8Array(buffer.subarray(i+4, i+4+c4));
						const c6 = buffer[i+4+c4];

						let s6 = c3 + c4;
						for (let j = 0; j < c4; j++) {
							s6 += c5[j];
						};
						s6 %= 0x100;
						if (s6 != c6) {
							// console.log('checksum error', s6, c6, Array.from(c5).map(v => v.toString(16)).join(" "));
							buffer = buffer.subarray(i+1);
							i = -1; // restart loop
							continue;
						}
						// console.log('readData', c1, c2, c3, c4, Array.from(c5).map(v => v.toString(16)).join(" "), c6, '==', s6);
						this.parseData(c1, c2, c3, c4, c5);
						buffer = buffer.subarray(i+5+c4);
						i = -1; // restart loop
					}
				}
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				console.log('Reading aborted.');
			} else {
				console.log('Error in startReader:', error);
			}
		} finally {
			if (this.reader) {
				try {
					this.reader.releaseLock();
				} catch (e) {
					// Ignore error if lock is already released
				}
			}
		}
	}

	async initCommand(): Promise<void> {
		await this.sendCommand(HEADER_OUTPUT, CMD_XXX_193, 0, 1); // CMD_1
		// new int[5] { 9600, 19200, 38400, 57600, 115200 };
		await this.sendCommand(HEADER_OUTPUT, CMD_XXX_176, 0, [9600, 19200, 38400, 57600, 115200].indexOf(115200) + 1); // CMD_13

		await this.sendCommand(HEADER_OUTPUT, CMD_GET, MODEL_NAME, 0); // get model name
		await this.sendCommand(HEADER_OUTPUT, CMD_GET, HARDWARE_VERSION, 0); // get hardware version
		await this.sendCommand(HEADER_OUTPUT, CMD_GET, FIRMWARE_VERSION, 0); // get firmware version
		await this.getAll();
	}

	async sendCommand(c1: number, c2: number, c3: number, c5: number | number[] | Uint8Array): Promise<void> {
		let data: number[] | Uint8Array;
		if (typeof c5 === 'number') {
			data = [ c5 ];
		} else {
			data = c5;
		}

		const c4 = data.length;
		let c6 = c3 + c4;
		for (let i = 0; i < c4; i++) {
			c6 += data[i];
		}
		const c = new Uint8Array(data.length + 5);
		c[0] = c1;
		c[1] = c2;
		c[2] = c3;
		c[3] = c4;
		if (data instanceof Uint8Array) {
			c.set(data, 4);
		} else {
			for (let i = 0; i < c4; i++) {
				c[4 + i] = data[i];
			}
		}
		c[c.length - 1] = c6;
		await this.sendCommandRaw(c);
	}

	async sendCommandFloat(c1: number, c2: number, c3: number, c5: number): Promise<void> {
		const v = new DataView(new ArrayBuffer(4));
		v.setFloat32(0, c5, true);
		await this.sendCommand(c1, c2, c3, new Uint8Array(v.buffer));
	}

	async sendCommandRaw(command: Uint8Array): Promise<void> {
		// console.log('sendCommand', Array.from(command).map(v => v.toString(16)).join(" "));
		if (!this.port.writable) {
			console.error("Port is not writable");
			throw new Error("Port is not writable");
		}
		const writer = this.port.writable.getWriter();
		try {
			await writer.write(command);
			await sleep(50);
		} finally{
			writer.releaseLock();
		}
	}

	parseData(c1: number, c2: number, c3: number, c4: number, c5: Uint8Array): void {
		const { callback } = this;
		const view = new DataView(c5.buffer, c5.byteOffset, c5.byteLength);
		switch (c3) {
			case 192: // input voltage
				callback({ inputVoltage: view.getFloat32(0, true) });
				if (this.responsePromises.has(c3)) {
					this.responsePromises.get(c3)?.resolve(view.getFloat32(0, true));
					this.responsePromises.delete(c3);
				}
				break;
			case 195: // output voltage, current, power
				callback({
					outputVoltage: view.getFloat32(0, true),
					outputCurrent: view.getFloat32(4, true),
					outputPower: view.getFloat32(8, true),
				});
				break;
			case 196: // temperature
				callback({ temperature: view.getFloat32(0, true) });
				break;
			case 217: // output capacity
				callback({ outputCapacity: view.getFloat32(0, true) });
				break;
			case 218: // output energy
				callback({ outputEnergy: view.getFloat32(0, true) });
				break;
			case 219: // output closed?
				callback({ outputEnabled: c5[0] === 1 });
				break;
			case 220: // protection
				callback({ protectionState: PROTECTION_STATES[c5[0]] });
				break;
			case 221: // cc=0 or cv=1
				callback({ mode: c5[0] === 0 ? "CC" : "CV" });
				break;
			case 222: // model name
				// d33
				callback({ modelName: String.fromCharCode(...c5) });
				if (this.responsePromises.has(c3)) {
					this.responsePromises.get(c3)?.resolve(String.fromCharCode(...c5));
					this.responsePromises.delete(c3);
				}
				break;
			case 223: // hardware version
				// d34
				callback({ hardwareVersion: String.fromCharCode(...c5) });
				if (this.responsePromises.has(c3)) {
					this.responsePromises.get(c3)?.resolve(String.fromCharCode(...c5));
					this.responsePromises.delete(c3);
				}
				break;
			case 224: // firmware version
				// d35
				callback({ firmwareVersion: String.fromCharCode(...c5) });
				if (this.responsePromises.has(c3)) {
					this.responsePromises.get(c3)?.resolve(String.fromCharCode(...c5));
					this.responsePromises.delete(c3);
				}
				break;
			case 225: // ???
				// d36
				console.log(c3, c5[0]);
				break;
			case 226: // upper limit voltage
				callback({ upperLimitVoltage: view.getFloat32(0, true) });
				break;
			case 227: // upper limit current
				callback({ upperLimitCurrent: view.getFloat32(0, true) });
				break;
			case 255:
				// set all
				{
					const d1 = view.getFloat32(0, true); // input voltage
					const d2 = view.getFloat32(4, true); // vset
					const d3 = view.getFloat32(8, true); // cset
					const d4 = view.getFloat32(12, true); // output voltage
					const d5 = view.getFloat32(16, true); // output current
					const d6 = view.getFloat32(20, true); // output power
					const d7 = view.getFloat32(24, true); // temperature
					const d8 = view.getFloat32(28, true); // group 1 vset
					const d9 = view.getFloat32(32, true); // group 1 cset
					const d10 = view.getFloat32(36, true); // group 2 vset
					const d11 = view.getFloat32(40, true); // group 2 cset
					const d12 = view.getFloat32(44, true); // group 3 vset
					const d13 = view.getFloat32(48, true); // group 3 cset
					const d14 = view.getFloat32(52, true); // group 4 vset
					const d15 = view.getFloat32(56, true); // group 4 cset
					const d16 = view.getFloat32(60, true); // group 5 vset
					const d17 = view.getFloat32(64, true); // group 5 cset
					const d18 = view.getFloat32(68, true); // group 6 vset
					const d19 = view.getFloat32(72, true); // group 6 cset
					const d20 = view.getFloat32(76, true); // ovp
					const d21 = view.getFloat32(80, true); // ocp
					const d22 = view.getFloat32(84, true); // opp
					const d23 = view.getFloat32(88, true); // otp
					const d24 = view.getFloat32(92, true); // lvp
					const d25 = c5[96]; // brightness
					const d26 = c5[97]; // volume
					const d27 = c5[98]; // metering open=0 or close=1
					const d28 = view.getFloat32(99, true);  // output capacity [Ah]
					const d29 = view.getFloat32(103, true); // output energy [Wh]
					const d30 = c5[107]; // output closed?
					const d31 = c5[108]; // protection OVP=1, OCP=2, OPP=3, OTP=4, LVP=5
					const d32 = c5[109]; // cc=0 or cv=1
					const d33 = c5[110]; // ?

					const d37 = view.getFloat32(111, true); // upper limit voltage
					const d38 = view.getFloat32(115, true); // upper limit current
					const d39 = view.getFloat32(119, true); // ??? voltage
					const d40 = view.getFloat32(123, true); // ??? current
					const d41 = view.getFloat32(127, true);
					const d42 = view.getFloat32(131, true);
					const d43 = view.getFloat32(135, true);
					/*
					console.log({
						d1, d2, d3, d4, d5, d6, d7, d8, d9, d10,
						d11, d12, d13, d14, d15, d16, d17, d18, d19, d20,
						d21, d22, d23, d24, d25, d26, d27, d28, d29, d30,
						d31, d32, d37, d38, d39, d40, d41, d42, d43
					});
					*/
					// dump unknown data
					/*
					console.log(c5.length, {
						d31, d33, d39, d40, d41, d42, d43
					});
					*/

					callback({
						inputVoltage: d1,
						setVoltage: d2,
						setCurrent: d3,
						outputVoltage: d4,
						outputCurrent: d5,
						outputPower: d6,
						temperature: d7,

						group1setVoltage: d8,
						group1setCurrent: d9,
						group2setVoltage: d10,
						group2setCurrent: d11,
						group3setVoltage: d12,
						group3setCurrent: d13,
						group4setVoltage: d14,
						group4setCurrent: d15,
						group5setVoltage: d16,
						group5setCurrent: d17,
						group6setVoltage: d18,
						group6setCurrent: d19,

						overVoltageProtection: d20,
						overCurrentProtection: d21,
						overPowerProtection: d22,
						overTemperatureProtection: d23,
						lowVoltageProtection: d24,

						brightness: d25,
						volume: d26,
						meteringClosed: d27 === 0,

						outputCapacity: d28,
						outputEnergy: d29,

						outputEnabled: d30 === 1,
						protectionState: PROTECTION_STATES[d31],
						mode: d32 === 0 ? "CC" : "CV",

						upperLimitVoltage: d37,
						upperLimitCurrent: d38,
					});
					if (this.responsePromises.has(c3)) {
						this.responsePromises.get(c3)?.resolve({
							inputVoltage: d1,
							setVoltage: d2,
							setCurrent: d3,
							outputVoltage: d4,
							outputCurrent: d5,
							outputPower: d6,
							temperature: d7,
							group1setVoltage: d8,
							group1setCurrent: d9,
							group2setVoltage: d10,
							group2setCurrent: d11,
							group3setVoltage: d12,
							group3setCurrent: d13,
							group4setVoltage: d14,
							group4setCurrent: d15,
							group5setVoltage: d16,
							group5setCurrent: d17,
							group6setVoltage: d18,
							group6setCurrent: d19,
							overVoltageProtection: d20,
							overCurrentProtection: d21,
							overPowerProtection: d22,
							overTemperatureProtection: d23,
							lowVoltageProtection: d24,
							brightness: d25,
							volume: d26,
							meteringClosed: d27 === 0,
							outputCapacity: d28,
							outputEnergy: d29,
							outputEnabled: d30 === 1,
							protectionState: PROTECTION_STATES[d31],
							mode: d32 === 0 ? "CC" : "CV",
							upperLimitVoltage: d37,
							upperLimitCurrent: d38,
						});
						this.responsePromises.delete(c3);
					}
				}
				break;
		}
	}

	private async sendCommandWithResponse<T>(c1: number, c2: number, c3: number, c5: number | number[] | Uint8Array): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.responsePromises.set(c3, { resolve, reject });
			this.sendCommand(c1, c2, c3, c5);
			setTimeout(() => {
				if (this.responsePromises.has(c3)) {
					this.responsePromises.delete(c3);
					reject(new Error('Timeout'));
				}
			}, 1000);
		});
	}


	async getAll(): Promise<any> {
		return this.sendCommandWithResponse(HEADER_OUTPUT, CMD_GET, ALL, 0);
	}

	async setFloatValue(type: number, value: number): Promise<void> {
		await this.sendCommandFloat(HEADER_OUTPUT, CMD_SET, type, value);
	}

	async setByteValue(type: number, value: number): Promise<void> {
		await this.sendCommand(HEADER_OUTPUT, CMD_SET, type, value);
	}

	async enable(): Promise<void> {
		await this.setByteValue(OUTPUT_ENABLE, 1);
	}

	async disable(): Promise<void> {
		await this.setByteValue(OUTPUT_ENABLE, 0);
	}

	async startMetering(): Promise<void> {
		await this.setByteValue(METERING_ENABLE, 1);
	}

	async stopMetering(): Promise<void> {
		await this.setByteValue(METERING_ENABLE, 0);
	}

	async close(): Promise<void> {
		await this.stop();
	}

	async getDeviceInfo(): Promise<DeviceInfo> {
		return this.getAll();
	}

	async getSystemInfo(): Promise<SystemInfo> {
		return this.getAll();
	}

	async getGroupValue(group: number): Promise<GroupValue> {
		const all = await this.getAll();
		return {
			setVoltage: all[`group${group}setVoltage`],
			setCurrent: all[`group${group}setCurrent`],
		}
	}
}