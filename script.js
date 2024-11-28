import { sprintf } from 'https://cdn.jsdelivr.net/npm/sprintf-js@1.1.3/+esm'
import { DPS150 } from "./dps-150.js";

async function sleep(n) {
	return new Promise((resolve) => {
		setTimeout(resolve, n);
	});
}

// byte
const BRIGHTNESS = 214;

// float
const OVP = 209;
const OCP = 210;
const OTP = 211;
const LVP = 212;
const OPP = 213;

const VOLTAGE_SET = 193; // voltage
const CURRENT_SET = 194; // current

const GROUP1_VOLTAGE_SET = 197;
const GROUP1_CURRENT_SET = 198;
const GROUP2_VOLTAGE_SET = 199;
const GROUP2_CURRENT_SET = 200;
const GROUP3_VOLTAGE_SET = 201;
const GROUP3_CURRENT_SET = 202;
const GROUP4_VOLTAGE_SET = 203;
const GROUP4_CURRENT_SET = 204;
const GROUP5_VOLTAGE_SET = 205;
const GROUP5_CURRENT_SET = 206;
const GROUP6_VOLTAGE_SET = 207;
const GROUP6_CURRENT_SET = 208;

Vue.createApp({
	data() {
		return {
			port: null,

			inputVoltage: 0,
			setVoltage: 0,
			setCurrent: 0,
			outputVoltage: 0,
			outputCurrent: 0,
			outputPower: 0,
			temperature: 0,
			outputClosed: false,
			mode: "CV",

			outputCapacity: 0,
			outputEnergy: 0,

			modelName: "",
			firmwareVersion: "",
			hardwareVersion: "",

			upperLimitVoltage: 0,
			upperLimitCurrent: 0,


			showNumberInput: false,
			numberInput: {
				result: "",
				title: "",
				description: "",
				descriptionHtml: "",
				prev: "",
				unit: "",
				units: [],
				input: "",
			},
		}
	},

	computed: {
	},

	watch: {
	},

	mounted() {
		console.log("mounted");
		this.init();
		console.log('numberInput');
		console.log(this.numberInput);
//		this.openNumberInput({
//			title: "Input Voltage",
//			description: "Input Voltage",
//			units: ["", "", "mV", "V"],
//			input: "",
//			prev: 9,
//			unit: "V",
//		});
	},

	methods :{
		init: async function () {
			navigator.serial.addEventListener('connect', (event) => {
				console.log('connected', event.target);
			});
			navigator.serial.addEventListener('disconnect', (event) => {
				console.log('disconnected', event.target);
			});
			console.log(navigator.serial);
			const ports = await navigator.serial.getPorts();
			if (ports.length) {
				this.port = ports[0];
				this.start();
			}
		},

		connect: async function () {
			console.log('connect');
			this.port = await navigator.serial.requestPort();
			this.start();
		},

		start: async function () {
			console.log('start', this.port);
			await this.port.open({
				baudRate: 9600,
				bufferSize: 1024,
				dataBits: 8,
				stopBits: 1,
				flowControl: 'hardware',
				parity: 'none'
			});
			this.startReader();
			await this.initCommand();
		},

		startReader: async function () {
			console.log('reading...');
			let buffer = new Uint8Array();
			while (this.port.readable) {
				const reader = this.port.readable.getReader();
				try {
					while (true) {
						const { value, done } = await reader.read();
						if (done) {
							console.log('done');
							break;
						}
						let b = new Uint8Array(buffer.length + value.length);
						b.set(buffer);
						b.set(value, buffer.length);
						buffer = b;
						for (let i = 0; i < buffer.length - 6; i++) {
							if (buffer[i] === 0xf0 && buffer[i+1] === 0xa1) {
								const c1 = buffer[i];
								const c2 = buffer[i+1];
								const c3 = buffer[i+2];
								const c4 = buffer[i+3];
								if (i+c4 >= buffer.length) {
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
									break;
								}
								// console.log('readData', c1, c2, c3, c4, Array.from(c5).map(v => v.toString(16)).join(" "), c6, '==', s6);
								buffer = buffer.subarray(i+4+c4);
								this.parseData(c1, c2, c3, c4, c5, c6);
							}
						}
						// console.log('parseData', Array.from(buffer).map(v => v.toString(16)).join(" "));
						// this.parseData(value);
					}
				} catch (error) {
					console.log(error);
				} finally {
					reader.releaseLock();
				}
			}
		},

		initCommand: async function () {
			await this.sendCommand(241, 193, 0, 1); // CMD_1
			// new int[5] { 9600, 19200, 38400, 57600, 115200 };
			await this.sendCommand(241, 176, 0, 1); // CMD_13 9600

			await this.sendCommand(241, 161, 222, 0); // get model name
			await this.sendCommand(241, 161, 224, 0); // get firmware version
			await this.sendCommand(241, 161, 223, 0); // get hardware version
			await this.sendCommand(241, 161, 255, 0); // get all
		},

		parseData: function (c1, c2, c3, c4, c5) {
			const view = new DataView(c5.buffer);
			let v1, v2, v3;
			switch (c3) {
				case 192: // input voltage
					this.inputVoltage = view.getFloat32(0, true);
					break;
				case 195: // output voltage, current, power
					this.outputVoltage = view.getFloat32(0, true);
					this.outputCurrent = view.getFloat32(4, true);
					this.outputPower = view.getFloat32(8, true);
					break;
				case 196: // temperature
					this.temperature = view.getFloat32(0, true);
					break;
				case 217: // output capacity
					this.outputCapacity = view.getFloat32(0, true);
					break;
				case 218: // output energery
					this.outputEnergy = view.getFloat32(0, true);
					break;
				case 219: // output closed?
					this.outputClosed = c5[0] === 1;
					break;
				case 220: // ??
					let d31 = c5[0];
					console.log(c3, c5[0]);
					break;
				case 221: // cc=0 or cv=1
					this.mode = c5[0] === 0 ? "CC" : "CV";
					break;
				case 222: // model name
					// d33
					this.modelName = String.fromCharCode(...c5);
					break;
				case 223: // hardware version
					// d34
					this.hardwareVersion = String.fromCharCode(...c5);
					break;
				case 224: // firmware version
					// d35
					this.firmwareVersion = String.fromCharCode(...c5);
					break;
				case 225: // ???
					// d36
					console.log(c3, c5[0]);
					break;
				case 226: // upper limit voltage
					this.upperLimitVoltage = view.getFloat32(0, true);
					break;
				case 227: // upper limit current
					this.upperLimitCurrent = view.getFloat32(0, true);
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
						const d29 = view.getFloat32(103, true); // output energery [Wh]
						const d30 = c5[107]; // output closed?
						const d31 = c5[108];
						const d32 = c5[109]; // cc=0 or cv=1

						const d37 = view.getFloat32(111, true); // upper limit voltage
						const d38 = view.getFloat32(115, true); // upper limit current
						const d39 = view.getFloat32(119, true); // ??? voltage
						const d40 = view.getFloat32(123, true); // ??? current
						const d41 = view.getFloat32(127, true);
						const d42 = view.getFloat32(131, true);
						const d43 = view.getFloat32(135, true);
						console.log({
							d1, d2, d3, d4, d5, d6, d7, d8, d9, d10,
							d11, d12, d13, d14, d15, d16, d17, d18, d19, d20,
							d21, d22, d23, d24, d25, d26, d27, d28, d29, d30,
							d31, d32, d37, d38, d39, d40, d41, d42, d43
						});

						this.inputVoltage = d1;
						this.setVoltage = d2;
						this.setCurrent = d3;
						this.outputVoltage = d4;
						this.outputCurrent = d5;
						this.outputPower = d6;
						this.temperature = d7;
						this.outputClosed = d30 === 1;
					}
					break;
			}
		},

		sendCommand: async function (c1, c2, c3, c5) {
			/**
			 * c1: 0xf0 (in) or 0xf1 (out)
			 * c2: command
			 *   177: set
			 *   161: get
			 * 
			 *
			 */

			if (typeof c5 === 'number') {
				c5 = [ c5 ];
			}

			const c4 = c5.length;
			let c6 = c3 + c4;
			for (let i = 0; i < c4; i++) {
				c6 += c5[i];
			}
			const c = new Uint8Array(c5.length + 5);
			c[0] = c1;
			c[1] = c2;
			c[2] = c3;
			c[3] = c4;
			for (let i = 0; i < c4; i++) {
				c[4 + i] = c5[i];
			}
			c[c.length - 1] = c6;
			await this.sendCommandRaw(c);
		},

		sendCommandFloat: async function (c1, c2, c3, c5) {
			const v = new DataView(new ArrayBuffer(4));
			v.setFloat32(0, c5, true);
			this.sendCommand(c1, c2, c3, new Uint8Array(v.buffer));
		},

		sendCommandRaw: async function (command) {
			console.log('sendCommand', Array.from(command).map(v => v.toString(16)).join(" "));
			const writer = this.port.writable.getWriter();
			try {
				await writer.write(command);
				await sleep(100);
			} finally{
				writer.releaseLock();
			}
		},

		enable: async function () {
			this.sendCommand(241, 177, 219, 1);
		},

		disable: async function () {
			this.sendCommand(241, 177, 219, 0);
		},

		debug: async function () {
			await this.sendCommand(241, 161, 255, 0); // get all
		},

		disconnect: async function () {
			if (this.port) {
				await this.sendCommand(241, 193, 0, 0);
				const port = this.port;
				this.port = null;
				await port.forget();
				console.log('forgot');
			}
		},

		formatNumber: function (n) {
			if (n < 10) {
				return sprintf("%05.3f", n);
			} else {
				return sprintf("%05.2f", n);
			}
		},


		formatNumberForInput: function (number, sep) {
			if (!sep) sep = ',';
			return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
		},

		openNumberInput: async function (opts) {
			this.numberInput.result = '';
			this.numberInput.title = opts.title || '';
			this.numberInput.description = opts.description || '';
			this.numberInput.descriptionHtml = opts.descriptionHtml || '';
			this.numberInput.prev  = opts.input || '';
			this.numberInput.unit = opts.unit || '';
			this.numberInput.units = opts.units || '';
			this.numberInput.input = '';
			this.showNumberInput = true;

			return await new Promise( (resolve, reject) => {
				const cancel = this.$watch('showNumberInput', () => {
					cancel();
					console.log('resolve', this.numberInput.result);
					resolve(this.numberInput.result);
				});
			});
		},

		numberInputButton: function (e) {
			const UNITS = {
				'G': 1e9,
				'M': 1e6,
				'k': 1e3,
				'x1' : 1,
				'm' : 1e-3,
				'\u00b5' : 1e-6,
				'n' : 1e-9,
				'p' : 1e-12,

				'mV' : 1e-3,
				'V' : 1,
				'mA': 1e-3,
				'A': 1,
			};

			const char = e.target.textContent.replace(/\s+/g, '');
			console.log(JSON.stringify(char));
			if (/^[0-9]$/.test(char)) {
				this.numberInput.input += char;
			} else
			if (char === '.') {
				if (!this.numberInput.input.includes('.')) {
					this.numberInput.input += char;
				}
			} else
			if (char === '\u232B') {
				if (this.numberInput.input.length) {
					this.numberInput.input = this.numberInput.input.slice(0, -1);
				} else {
					this.showNumberInput = false;
				}
			} else
			if (char === '-') {
				if (this.numberInput.input[0] === '-') {
					this.numberInput.input = this.numberInput.input.slice(1);
				} else {
					this.numberInput.input = '-' + this.numberInput.input;
				}
			} else
			if (UNITS[char]) {
				const base = parseFloat(this.numberInput.input);
				this.numberInput.result = base * UNITS[char];
				this.showNumberInput = false;
			}
			console.log(this.numberInput.input, parseFloat(this.numberInput.input));
		},


	}
}).use(Vuetify.createVuetify({
	theme: {
		defaultTheme: 'light' // or dark
	}
})).mount("#app");


