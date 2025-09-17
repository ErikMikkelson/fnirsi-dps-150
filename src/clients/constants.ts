export const HEADER_INPUT  = 0xf0; // 240
export const HEADER_OUTPUT = 0xf1; // 241

export const CMD_GET     = 0xa1; // 161
export const CMD_XXX_176 = 0xb0; // 176
export const CMD_SET     = 0xb1; // 177
export const CMD_XXX_192 = 0xc0; // 192
export const CMD_XXX_193 = 0xc1; // 193

// float
export const VOLTAGE_SET = 193;
export const CURRENT_SET = 194;

export const GROUP1_VOLTAGE_SET = 197;
export const GROUP1_CURRENT_SET = 198;
export const GROUP2_VOLTAGE_SET = 199;
export const GROUP2_CURRENT_SET = 200;
export const GROUP3_VOLTAGE_SET = 201;
export const GROUP3_CURRENT_SET = 202;
export const GROUP4_VOLTAGE_SET = 203;
export const GROUP4_CURRENT_SET = 204;
export const GROUP5_VOLTAGE_SET = 205;
export const GROUP5_CURRENT_SET = 206;
export const GROUP6_VOLTAGE_SET = 207;
export const GROUP6_CURRENT_SET = 208;

export const OVP = 209;
export const OCP = 210;
export const OPP = 211;
export const OTP = 212;
export const LVP = 213;

export const METERING_ENABLE = 216;
export const OUTPUT_ENABLE = 219;

// byte
export const BRIGHTNESS = 214;
export const VOLUME = 215;

export const MODEL_NAME = 222;
export const HARDWARE_VERSION = 223;
export const FIRMWARE_VERSION = 224;
export const ALL = 255;

export const DPS150Commands = {
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
  OPP,
  OTP,
  LVP,
  BRIGHTNESS,
  VOLUME,
};

export const PROTECTION_STATES = [
	"",
	"OVP",
	"OCP",
	"OPP",
	"OTP",
	"LVP",
	"REP",
];

// Data response types for parseData switch statement
export enum DataType {
	INPUT_VOLTAGE = 192,
	OUTPUT_VOLTAGE_CURRENT_POWER = 195,
	TEMPERATURE = 196,
	OUTPUT_CAPACITY = 217,
	OUTPUT_ENERGY = 218,
	OUTPUT_ENABLED = 219,
	PROTECTION_STATE = 220,
	MODE_CC_CV = 221,
	MODEL_NAME = 222,
	HARDWARE_VERSION = 223,
	FIRMWARE_VERSION = 224,
	UNKNOWN_225 = 225,
	UPPER_LIMIT_VOLTAGE = 226,
	UPPER_LIMIT_CURRENT = 227,
	ALL_DATA = 255,
}
