import { describe, it, expect } from 'vitest';
import { sleep, functionWithTimeout } from '../utils.js';

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
  });

  describe('functionWithTimeout()', () => {
    it('関数を正常に実行する', async () => {
      const testFn = (a, b) => a + b;
      const wrappedFn = await functionWithTimeout(testFn, 1000);
      
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
      
      const wrappedFn = await functionWithTimeout(slowFn, 100);
      
      await expect(wrappedFn()).rejects.toThrow('timeout');
    });

    it('引数を正しく渡す', async () => {
      const testFn = (name, age) => `${name} is ${age} years old`;
      const wrappedFn = await functionWithTimeout(testFn, 1000);
      
      const result = await wrappedFn('Alice', 30);
      expect(result).toBe('Alice is 30 years old');
    });

    it('複数の引数を処理する', async () => {
      const testFn = (...args) => args.reduce((sum, val) => sum + val, 0);
      const wrappedFn = await functionWithTimeout(testFn, 1000);
      
      const result = await wrappedFn(1, 2, 3, 4, 5);
      expect(result).toBe(15);
    });

    it('戻り値が正しく返される', async () => {
      const testFn = () => ({ name: 'test', value: 42 });
      const wrappedFn = await functionWithTimeout(testFn, 1000);
      
      const result = await wrappedFn();
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('Worker内でエラーが発生した場合', async () => {
      const errorFn = () => {
        throw new Error('Worker error');
      };
      
      const wrappedFn = await functionWithTimeout(errorFn, 1000);
      
      await expect(wrappedFn()).rejects.toThrow("Worker error");
    });

    it('関数内でthisを使用しない場合でも動作する', async () => {
      const arrowFn = (x) => x * 2;
      const wrappedFn = await functionWithTimeout(arrowFn, 1000);
      
      const result = await wrappedFn(21);
      expect(result).toBe(42);
    });

    it('同期的な関数も処理できる', async () => {
      const syncFn = (a, b) => a - b;
      const wrappedFn = await functionWithTimeout(syncFn, 1000);
      
      const result = await wrappedFn(10, 3);
      expect(result).toBe(7);
    });

    it('タイムアウト後にWorkerが適切に終了する', async () => {
      const slowFn = () => {
        while (true) {} // 無限ループ
      };
      
      const wrappedFn = await functionWithTimeout(slowFn, 50);
      
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
  });
});
