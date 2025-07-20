/**
 * DPS-150プロトコルのパケット生成・操作ヘルパー関数
 */

/**
 * チェックサムを計算する
 * @param {number} c3 - データタイプ
 * @param {Uint8Array} data - データ部分
 * @returns {number} チェックサム値
 */
export function calculateChecksum(c3, data) {
  let checksum = c3 + data.length;
  for (let i = 0; i < data.length; i++) {
    checksum += data[i];
  }
  return checksum % 0x100;
}

/**
 * Float32をリトルエンディアンのUint8Arrayに変換
 * @param {number} value - Float値
 * @returns {Uint8Array} 4バイトのリトルエンディアンデータ
 */
export function floatToLittleEndian(value) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true); // true = little endian
  return new Uint8Array(buffer);
}

/**
 * コマンドパケットを生成する
 * @param {number} header - ヘッダー (0xf0 or 0xf1)
 * @param {number} command - コマンド
 * @param {number} type - データタイプ
 * @param {number|Array|Uint8Array} data - データ
 * @returns {Uint8Array} 完全なコマンドパケット
 */
export function createCommandPacket(header, command, type, data) {
  let dataBytes;
  
  if (typeof data === 'number') {
    dataBytes = new Uint8Array([data]);
  } else if (Array.isArray(data)) {
    dataBytes = new Uint8Array(data);
  } else if (data instanceof Uint8Array) {
    dataBytes = data;
  } else {
    dataBytes = new Uint8Array(0);
  }

  const length = dataBytes.length;
  const checksum = calculateChecksum(type, dataBytes);
  
  const packet = new Uint8Array(5 + length);
  packet[0] = header;
  packet[1] = command;
  packet[2] = type;
  packet[3] = length;
  packet.set(dataBytes, 4);
  packet[packet.length - 1] = checksum;
  
  return packet;
}

/**
 * Float値用のコマンドパケットを生成する
 * @param {number} header - ヘッダー
 * @param {number} command - コマンド
 * @param {number} type - データタイプ
 * @param {number} value - Float値
 * @returns {Uint8Array} 完全なコマンドパケット
 */
export function createFloatCommandPacket(header, command, type, value) {
  const dataBytes = floatToLittleEndian(value);
  return createCommandPacket(header, command, type, dataBytes);
}

/**
 * レスポンスパケットを生成する
 * @param {number} type - データタイプ
 * @param {number|Array|Uint8Array} data - データ
 * @returns {Uint8Array} 完全なレスポンスパケット
 */
export function createResponsePacket(type, data) {
  return createCommandPacket(0xf0, 0xa1, type, data);
}

/**
 * Float値用のレスポンスパケットを生成する
 * @param {number} type - データタイプ
 * @param {number} value - Float値
 * @returns {Uint8Array} 完全なレスポンスパケット
 */
export function createFloatResponsePacket(type, value) {
  const dataBytes = floatToLittleEndian(value);
  return createResponsePacket(type, dataBytes);
}

/**
 * 複数のFloat値を含むレスポンスパケットを生成する
 * @param {number} type - データタイプ
 * @param {number[]} values - Float値の配列
 * @returns {Uint8Array} 完全なレスポンスパケット
 */
export function createMultiFloatResponsePacket(type, values) {
  const dataBytes = new Uint8Array(values.length * 4);
  values.forEach((value, index) => {
    const floatBytes = floatToLittleEndian(value);
    dataBytes.set(floatBytes, index * 4);
  });
  return createResponsePacket(type, dataBytes);
}

/**
 * 文字列用のレスポンスパケットを生成する
 * @param {number} type - データタイプ
 * @param {string} text - 文字列
 * @returns {Uint8Array} 完全なレスポンスパケット
 */
export function createStringResponsePacket(type, text) {
  const dataBytes = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
  return createResponsePacket(type, dataBytes);
}

/**
 * ALL コマンド用の大きなレスポンスパケットを生成する
 * @param {Object} data - 全データのオブジェクト
 * @returns {Uint8Array} 完全なレスポンスパケット
 */
export function createAllResponsePacket(data) {
  // 139バイトの固定サイズ（実装を参照）
  const dataBytes = new Uint8Array(139);
  const view = new DataView(dataBytes.buffer);
  
  // Float値を順番に設定
  view.setFloat32(0, data.inputVoltage || 0, true);      // d1
  view.setFloat32(4, data.setVoltage || 0, true);        // d2  
  view.setFloat32(8, data.setCurrent || 0, true);        // d3
  view.setFloat32(12, data.outputVoltage || 0, true);    // d4
  view.setFloat32(16, data.outputCurrent || 0, true);    // d5
  view.setFloat32(20, data.outputPower || 0, true);      // d6
  view.setFloat32(24, data.temperature || 0, true);      // d7
  
  // グループ設定値 (d8-d19)
  view.setFloat32(28, data.group1setVoltage || 0, true);
  view.setFloat32(32, data.group1setCurrent || 0, true);
  view.setFloat32(36, data.group2setVoltage || 0, true);
  view.setFloat32(40, data.group2setCurrent || 0, true);
  view.setFloat32(44, data.group3setVoltage || 0, true);
  view.setFloat32(48, data.group3setCurrent || 0, true);
  view.setFloat32(52, data.group4setVoltage || 0, true);
  view.setFloat32(56, data.group4setCurrent || 0, true);
  view.setFloat32(60, data.group5setVoltage || 0, true);
  view.setFloat32(64, data.group5setCurrent || 0, true);
  view.setFloat32(68, data.group6setVoltage || 0, true);
  view.setFloat32(72, data.group6setCurrent || 0, true);
  
  // 保護設定値 (d20-d24)
  view.setFloat32(76, data.overVoltageProtection || 0, true);
  view.setFloat32(80, data.overCurrentProtection || 0, true);
  view.setFloat32(84, data.overPowerProtection || 0, true);
  view.setFloat32(88, data.overTemperatureProtection || 0, true);
  view.setFloat32(92, data.lowVoltageProtection || 0, true);
  
  // バイト値 (d25-d33)
  dataBytes[96] = data.brightness || 0;                  // d25
  dataBytes[97] = data.volume || 0;                      // d26
  dataBytes[98] = data.meteringClosed ? 0 : 1;           // d27
  
  view.setFloat32(99, data.outputCapacity || 0, true);   // d28
  view.setFloat32(103, data.outputEnergy || 0, true);    // d29
  
  dataBytes[107] = data.outputClosed ? 1 : 0;            // d30
  dataBytes[108] = data.protectionState || 0;            // d31
  dataBytes[109] = data.mode === "CC" ? 0 : 1;           // d32
  dataBytes[110] = 0;                                    // d33
  
  // 上限値 (d37-d43)
  view.setFloat32(111, data.upperLimitVoltage || 0, true);
  view.setFloat32(115, data.upperLimitCurrent || 0, true);
  view.setFloat32(119, 0, true);  // d39
  view.setFloat32(123, 0, true);  // d40
  view.setFloat32(127, 0, true);  // d41
  view.setFloat32(131, 0, true);  // d42
  view.setFloat32(135, 0, true);  // d43
  
  return createResponsePacket(255, dataBytes);
}