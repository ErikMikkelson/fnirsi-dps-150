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

				group1setVoltage: 0,
				group1setCurrent: 0,
				group2setVoltage: 0,
				group2setCurrent: 0,
				group3setVoltage: 0,
				group3setCurrent: 0,
				group4setVoltage: 0,
				group4setCurrent: 0,
				group5setVoltage: 0,
				group5setCurrent: 0,
				group6setVoltage: 0,
				group6setCurrent: 0,

				overVoltageProtection: 0,
				overCurrentProtection: 0,
				overPowerProtection: 0,
				overTemperatureProtection: 0,
				lowVoltageProtection: 0,

				brightness: 0,
				volume: 0,
				meteringClosed: false,

				outputCapacity: 0,
				outputEnergy: 0,

				outputClosed: false,
				protectionState: "",
				mode: "CV",

				upperLimitVoltage: 0,
				upperLimitCurrent: 0,

				modelName: "",
				firmwareVersion: "",
				hardwareVersion: "",
			},

			history: [
				{
					time: new Date(),
					v: 0,
					i: 0,
					p: 0,
				}
			],

			groupsInput: {
				1: {
					setVoltage: null,
					setCurrent: null,
				},
				2: {
					setVoltage: null,
					setCurrent: null,
				},
				3: {
					setVoltage: null,
					setCurrent: null,
				},
				4: {
					setVoltage: null,
					setCurrent: null,
				},
				5: {
					setVoltage: null,
					setCurrent: null,
				},
				6: {
					setVoltage: null,
					setCurrent: null,
				}
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

			connectOverlay: true
		}
	},

	computed: {
		groups: function () {
			return [1, 2, 3, 4, 5, 6].map((i) => {
				return {
					n: i,
					setVoltage: this.device[`group${i}setVoltage`],
					setCurrent: this.device[`group${i}setCurrent`],
				};
			});
		}
	},

	watch: {
		history: function () {
			this.updateGraph();
		},

		port: function () {
			if (!this.port) {
				this.connectOverlay = true;
			} else {
				this.connectOverlay = false;
			}
		},
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

		this.updateGraph();
	},

	methods :{
		init: async function () {
			navigator.serial.addEventListener('connect', (event) => {
				console.log('connected', event.target);
			});
			navigator.serial.addEventListener('disconnect', (event) => {
				console.log('disconnected', event.target);
				if (event.target === this.port) {
					this.port = null;
				}
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
				await this.dps.stop();
				await this.port.forget();
				this.port = null;
				console.log('forgot');
			}
		},

		start: async function (port) {
			if (!port) return;
			this.port = port;
			this.dps = new DPS150(this.port, (data) => {
				Object.assign(this.device, data);
				if (data.outputVoltage) {
					this.history.push({
						time: new Date(),
						v: data.outputVoltage,
						i: data.outputCurrent,
						p: data.outputPower,
					});
					this.history = this.history.slice(-100);
				}
			});
			window.__DPS = this.dps;
			try {
				await this.dps.start();
			} catch (e) {
				this.port = null;
				alert(e);
			}
		},

		debug: async function () {
			await this.dps.getAll();
			for (let i = 0; i < 200; i++) {
				const v = (Math.sin(i / 10) + 1) * 3 + 10;
				console.log(v);
				await __DPS.setFloatValue(193, v);
			}
		},

		enable: async function () {
			await this.dps.enable();
		},

		disable: async function () {
			await this.dps.disable();
		},

		startMetering: async function () {
			await this.dps.startMetering();
			await this.dps.getAll();
		},

		stopMetering: async function () {
			await this.dps.stopMetering();
			await this.dps.getAll();
		},

		changeVoltage: async function () {
			const voltage = await this.openNumberInput({
				title: "Input Voltage",
				description: `Input Voltage (max ${this.formatNumber(this.device.upperLimitVoltage)}V)`,
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
				description: `Input Current (max ${this.formatNumber(this.device.upperLimitCurrent)}A)`,
				units: ["", "", "mA", "A"],
				input: this.device.setCurrent,
				unit: "A",
			});
			if (current) {
				await this.dps.setFloatValue(CURRENT_SET, current);
				await this.dps.getAll();
			}
		},

		changeOVP: async function () {
			const voltage = await this.openNumberInput({
				title: "Over Voltage Protection",
				description: ``,
				units: ["", "", "mV", "V"],
				input: this.device.overVoltageProtection,
				unit: "V",
			});
			if (voltage) {
				await this.dps.setFloatValue(OVP, voltage);
				await this.dps.getAll();
			}
		},

		changeOCP: async function () {
			const current = await this.openNumberInput({
				title: "Over Current Protection",
				description: ``,
				units: ["", "", "mA", "A"],
				input: this.device.overCurrentProtection,
				unit: "A",
			});
			if (current) {
				await this.dps.setFloatValue(OCP, current);
				await this.dps.getAll();
			}
		},

		changeOPP: async function () {
			const power = await this.openNumberInput({
				title: "Over Power Protection",
				description: ``,
				units: ["", "", "", "W"],
				input: this.device.overPowerProtection,
				unit: "W",
			});
			if (power) {
				await this.dps.setFloatValue(OPP, power);
				await this.dps.getAll();
			}
		},

		changeOTP: async function () {
			const power = await this.openNumberInput({
				title: "Over Temperature Protection",
				description: ``,
				units: ["", "", "", "℃"],
				input: this.device.overTemperatureProtection,
				unit: "℃",
			});
			if (power) {
				await this.dps.setFloatValue(OTP, power);
				await this.dps.getAll();
			}
		},

		changeLVP: async function () {
			const voltage = await this.openNumberInput({
				title: "Low Voltage Protection",
				description: ``,
				units: ["", "", "mV", "V"],
				input: this.device.lowVoltageProtection,
				unit: "V",
			});
			if (voltage) {
				await this.dps.setFloatValue(LVP, voltage);
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
			if (typeof number === 'number') {
				number = number.toFixed(3);
			}
			return number.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
		},

		formatDateTime: function (date) {
			return date.toISOString();
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
				'mW': 1e-3,
				'W': 1,

				'℃': 1,
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
		},

		setGroup: async function (group) {
			console.log('set group', group);
			const groupNumber = group.n;
			const setVoltage = this.groupsInput[group.n].setVoltage || group.setVoltage;
			const setCurrent = this.groupsInput[group.n].setCurrent || group.setCurrent;

			const cmdVoltage = GROUP1_VOLTAGE_SET + (groupNumber - 1) * 2;
			const cmdCurrent = GROUP1_CURRENT_SET + (groupNumber - 1) * 2;

			await this.dps.setFloatValue(VOLTAGE_SET, setVoltage);
			await this.dps.setFloatValue(CURRENT_SET, setCurrent);
			await this.dps.setFloatValue(cmdVoltage, setVoltage);
			await this.dps.setFloatValue(cmdCurrent, setCurrent);
			await this.dps.getAll();

			this.groupsInput[group.n].setVoltage = null;
			this.groupsInput[group.n].setCurrent = null
		},

		editGroupVoltage: async function (group) {
			const voltage = await this.openNumberInput({
				title: `Edit Group ${group.n} Voltage`,
				description: ``,
				units: ["", "", "mV", "V"],
				input: group.setVoltage,
				unit: "V",
			});
			if (voltage) {
				this.groupsInput[group.n].setVoltage = voltage;
			}
		},

		editGroupCurrent: async function (group) {
			const current = await this.openNumberInput({
				title: `Edit Group ${group.n} Current`,
				description: ``,
				units: ["", "", "mA", "A"],
				input: group.setCurrent,
				unit: "A",
			});
			if (current) {
				this.groupsInput[group.n].setCurrent = current;
			}
		},

		groupChanged: function (group, type) {
			const input = this.groupsInput[group.n];
			if (!type || type === 'V') {
				if (input.setVoltage !== null && input.setVoltage !== group.setVoltage) {
					return true;
				}
			}
			if (!type || type === 'I') {
				if (input.setCurrent !== null && input.setCurrent !== group.setCurrent) {
					return true;
				}
			}
		},

		updateGraph: function () {
			const data = [
				{ 
					mode: "scatter",
					x: [],
					y: [],
					name: "Voltage",
					line: {
						width: 3,
						color: '#38a410',
					},
				},
				{
					mode: "scatter",
					x: [],
					y: [],
					name: "Current",
					yaxis: "y2",
					line: {
						width: 3,
						color: '#e84944',
					},
				},
				{ 
					mode: "scatter",
					x: [],
					y: [],
					name: "Power",
					yaxis: "y3",
					line: {
						width: 3,
						color: '#0097d2',
					},
				},

			];

			for (let h of this.history) {
				data[0].x.push(h.time);
				data[0].y.push(h.v);
				data[1].x.push(h.time);
				data[1].y.push(h.i);
				data[2].x.push(h.time);
				data[2].y.push(h.p);
			}

			const layout = {
				title: {text: ''},
				showlegend: false,
				margin: {
					t: 0,
					b: 50,
					l: 0,
					r: 0,
				},
				xaxis: {
					/*
					title: {
						text: "time",
					},
					*/
					domain: [0.1, 0.9],
					autorange: true,
				},
				yaxis: {
					title: {
						text: "V",
						font: {color: '#38a410'}
					},
					tickfont: {color: '#38a410'},
					minallowed: 0,
					rangemode: "tozero",
					autorange: "max",
				},
				yaxis2: {
					title: {
						text: "I",
						font: {color: '#e84944'}
					},
					tickfont: {color: '#e84944'},
					anchor: 'free',
					overlaying: 'y',
					side: 'left',
					position: 0.05,
					minallowed: 0,
					rangemode: "tozero",
					autorange: "max",
				},
				yaxis3: {
					title: {
						text: "P",
						font: {color: '#0097d2'}
					},
					tickfont: {color: '#0097d2'},
					anchor: 'x',
					overlaying: 'y',
					side: 'right',
					minallowed: 0,
					rangemode: "tozero",
					autorange: "max",
				},
			};

			Plotly.react(this.$refs.graph, data, layout, {
				displayModeBar: false,
			});
		},
	}
}).use(Vuetify.createVuetify({
	theme: {
		defaultTheme: 'light' // or dark
	}
})).mount("#app");


