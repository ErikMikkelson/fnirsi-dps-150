import { sprintf } from 'https://cdn.jsdelivr.net/npm/sprintf-js@1.1.3/+esm'
import {
	DPS150,
	VOLTAGE_SET,
	CURRENT_SET,

	GROUP1_VOLTAGE_SET,
	GROUP1_CURRENT_SET,
	GROUP2_VOLTAGE_SET,
	GROUP2_CURRENT_SET,
	GROUP3_VOLTAGE_SET,
	GROUP3_CURRENT_SET,
	GROUP4_VOLTAGE_SET,
	GROUP4_CURRENT_SET,
	GROUP5_VOLTAGE_SET,
	GROUP5_CURRENT_SET,
	GROUP6_VOLTAGE_SET,
	GROUP6_CURRENT_SET,

	OVP,
	OCP,
	OTP,
	LVP,
	OPP,
} from "./dps-150.js";

async function sleep(n) {
	return new Promise((resolve) => {
		setTimeout(resolve, n);
	});
}

Vue.createApp({
	data() {
		return {
			port: null,

			device: {
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
			},


			showNumberInput: false,
			numberInput: {
				result: "",
				title: "",
				description: "",
				descriptionHtml: "",
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
				this.start(ports[0]);
			}
		},

		connect: async function () {
			console.log('connect');
			this.start(await navigator.serial.requestPort());
		},

		disconnect: async function () {
			if (this.port) {
				this.dps.stop();
				await port.forget();
				console.log('forgot');
			}
		},

		start: async function (port) {
			if (!port) return;
			this.port = port;
			this.dps = new DPS150(this.port, (data) => {
				Object.assign(this.device, data);
			});
			this.dps.start();
		},

		debug: async function () {
			this.dps.getAll();
		},

		enable: async function () {
			await this.dps.enable();
		},

		disable: async function () {
			await this.dps.disable();
		},

		changeVoltage: async function () {
			const voltage = await this.openNumberInput({
				title: "Input Voltage",
				description: "Input Voltage",
				units: ["", "", "mV", "V"],
				input: this.device.setVoltage,
				unit: "V",
			});
			if (voltage) {
				await this.dps.setFloatValue(VOLTAGE_SET, voltage);
				await this.dps.getAll();
			}
		},

		changeCurrent: async function () {
			const current = await this.openNumberInput({
				title: "Input Current",
				description: "Input Current",
				units: ["", "", "mA", "A"],
				input: this.device.setCurrent,
				unit: "A",
			});
			if (current) {
				await this.dps.setFloatValue(CURRENT_SET, current);
				await this.dps.getAll();
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

			console.log('openNumberInput', opts);

			const keyDown = (e) => {
				console.log(e.key);
				this.numberInputChar(e.key);
			};

			window.addEventListener('keydown', keyDown);

			return await new Promise( (resolve, reject) => {
				const cancel = this.$watch('showNumberInput', () => {
					cancel();
					window.removeEventListener('keydown', keyDown);
					console.log('resolve', this.numberInput.result);
					resolve(this.numberInput.result);
				});
			});
		},

		numberInputButton: function (e) {
			const char = e.target.textContent.replace(/\s+/g, '');
			this.numberInputChar(char);
		},

		numberInputChar: function (char) {
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
		}
	}
}).use(Vuetify.createVuetify({
	theme: {
		defaultTheme: 'light' // or dark
	}
})).mount("#app");


