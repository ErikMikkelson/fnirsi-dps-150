import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  functionWithTimeout,
  sleep,
} from '../utils';

describe('utils.js (browser environment)', () => {
  describe('sleep()', () => {
    it('指定時間待機する', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('Promiseを返す', () => {
      const result = sleep(10);
      expect(result).toBeInstanceOf(Promise);
    });

    it('ゼロミリ秒でも動作する', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('負の値でも即座に解決する', async () => {
      const start = Date.now();
      await sleep(-100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('非数値の場合はNaNミリ秒待つ（即座に解決）', async () => {
      const start = Date.now();
      // @ts-ignore
      await sleep('not a number');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('functionWithTimeout()', () => {
    it('関数を正常に実行する', async () => {
      const testFn = (a: number, b: number) => a + b;
      const wrappedFn = functionWithTimeout(testFn, 1000);

      const result = await wrappedFn(2, 3);
      expect(result).toBe(5);
    });

    it('タイムアウト時にエラーをスローする', async () => {
      const slowFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000000000; i++) {
          sum += i;
        }
        return sum;
      };

      const wrappedFn = functionWithTimeout(slowFn, 100);

      await expect(wrappedFn()).rejects.toThrow('timeout');
    });

    it('引数を正しく渡す', async () => {
      const testFn = (name: string, age: number) => `${name} is ${age} years old`;
      const wrappedFn = functionWithTimeout(testFn, 1000);

      const result = await wrappedFn('Alice', 30);
      expect(result).toBe('Alice is 30 years old');
    });

    it('複数の引数を処理する', async () => {
      const testFn = (...args: number[]) => args.reduce((sum, val) => sum + val, 0);
      const wrappedFn = functionWithTimeout(testFn, 1000);

      const result = await wrappedFn(1, 2, 3, 4, 5);
      expect(result).toBe(15);
    });

    it('戻り値が正しく返される', async () => {
      const testFn = () => ({ name: 'test', value: 42 });
      const wrappedFn = functionWithTimeout(testFn, 1000);

      const result = await wrappedFn();
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('Worker内でエラーが発生した場合', async () => {
      const errorFn = () => {
        throw new Error('Worker error');
      };

      const wrappedFn = functionWithTimeout(errorFn, 1000);

      await expect(wrappedFn()).rejects.toThrow();
    });

    it('関数内でthisを使用しない場合でも動作する', async () => {
      const arrowFn = (x: number) => x * 2;
      const wrappedFn = functionWithTimeout(arrowFn, 1000);

      const result = await wrappedFn(21);
      expect(result).toBe(42);
    });

    it('同期的な関数も処理できる', async () => {
      const syncFn = (a: number, b: number) => a - b;
      const wrappedFn = functionWithTimeout(syncFn, 1000);

      const result = await wrappedFn(10, 3);
      expect(result).toBe(7);
    });

    it('タイムアウト後にWorkerが適切に終了する', async () => {
      const slowFn = () => {
        while (true) {} // 無限ループ
      };

      const wrappedFn = functionWithTimeout(slowFn, 50);

      const startTime = Date.now();
      await expect(wrappedFn()).rejects.toThrow('timeout');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
    });

    it('ブラウザ環境でのみ動作する（Web Worker APIが必要）', () => {
      expect(typeof Worker).toBe('function');
      expect(typeof Blob).toBe('function');
      expect(typeof URL.createObjectURL).toBe('function');
    });

    it('負のタイムアウト値でも動作する', async () => {
      const testFn = () => 'immediate';
      const wrappedFn = functionWithTimeout(testFn, -100);

      await expect(wrappedFn()).rejects.toThrow('timeout');
    });

    it('非常に大きなタイムアウト値でも動作する', async () => {
      const testFn = (x: number) => x * 3;
      const wrappedFn = functionWithTimeout(testFn, 999999999);

      const result = await wrappedFn(14);
      expect(result).toBe(42);
    });

    it('関数ではない引数を渡した場合のエラー処理', async () => {
      const notAFunction = 'not a function';
      // @ts-ignore
      const wrappedFn = functionWithTimeout(notAFunction, 1000);

      await expect(wrappedFn()).rejects.toThrow();
    });
  });

  describe('メモリリーク対策', () => {
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;
    let originalCreateObjectURL: any;
    let originalRevokeObjectURL: any;
    let createdURLs: any[];

    beforeEach(() => {
      createdURLs = [];
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      createObjectURLSpy = vi.fn((blob) => {
        const url = originalCreateObjectURL(blob);
        createdURLs.push(url);
        return url;
      });

      revokeObjectURLSpy = vi.fn((url) => {
        originalRevokeObjectURL(url);
      });

      URL.createObjectURL = createObjectURLSpy;
      URL.revokeObjectURL = revokeObjectURLSpy;
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('正常終了時にrevokeObjectURLが呼ばれる', async () => {
      const testFn = (a: number, b: number) => a + b;
      const wrappedFn = functionWithTimeout(testFn, 1000);

      await wrappedFn(2, 3);

      // createObjectURLが1回呼ばれた
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

      // 少し待ってからrevokeObjectURLが呼ばれることを確認
      await new Promise(resolve => setTimeout(resolve, 10));

      // cleanup関数によりrevokeObjectURLが呼ばれることを確認
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(createdURLs[0]);
    });

    it('タイムアウト時にrevokeObjectURLが呼ばれる', async () => {
      const slowFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000000000; i++) {
          sum += i;
        }
        return sum;
      };

      const wrappedFn = functionWithTimeout(slowFn, 50);

      await expect(wrappedFn()).rejects.toThrow('timeout');

      // createObjectURLが1回呼ばれた
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

      // 少し待ってからrevokeObjectURLが呼ばれることを確認
      await new Promise(resolve => setTimeout(resolve, 10));

      // cleanup関数によりrevokeObjectURLが呼ばれることを確認
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(createdURLs[0]);
    });

    it('エラー時にrevokeObjectURLが呼ばれる', async () => {
      const errorFn = () => {
        throw new Error('Test error');
      };

      const wrappedFn = functionWithTimeout(errorFn, 1000);

      await expect(wrappedFn()).rejects.toThrow();

      // createObjectURLが1回呼ばれた
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

      // 少し待ってからrevokeObjectURLが呼ばれることを確認
      await new Promise(resolve => setTimeout(resolve, 10));

      // cleanup関数によりrevokeObjectURLが呼ばれることを確認
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(createdURLs[0]);
    });

    it('複数回実行してもメモリリークしない', async () => {
      const testFn = (x: number) => x * 2;
      const wrappedFn = functionWithTimeout(testFn, 1000);

      // 3回実行
      for (let i = 0; i < 3; i++) {
        await wrappedFn(i);
      }

      // createObjectURLが3回呼ばれた
      expect(createObjectURLSpy).toHaveBeenCalledTimes(3);

      // 少し待ってからrevokeObjectURLも3回呼ばれることを確認
      await new Promise(resolve => setTimeout(resolve, 10));

      // cleanup関数によりrevokeObjectURLが呼ばれることを確認
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3);

      // 作成されたすべてのURLが解放されたことを確認
      createdURLs.forEach((url, index) => {
        expect(revokeObjectURLSpy).toHaveBeenNthCalledWith(index + 1, url);
      });
    });
  });
});
