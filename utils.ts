

export async function sleep(n: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, n);
	});
}

export function functionWithTimeout<T extends (...args: any[]) => any>(fn: T, timeout: number): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	const workerCode = `
		self.onmessage = (event) => {
		 postMessage( (${fn.toString()}).apply(null, event.data) );
		};
	`;

	return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
		return await new Promise((resolve, reject) => {
			const blobUrl = URL.createObjectURL(new Blob([workerCode], { type: "application/javascript" }));
			const worker = new Worker(blobUrl, {
				type: 'module',
				name: 'evaluator',
			});

			const cleanup = () => {
				clearTimeout(timer);
				worker.terminate();
				URL.revokeObjectURL(blobUrl);
			};

			const timer = setTimeout(() => {
				cleanup();
				reject(new Error('timeout'));
			}, timeout);

			worker.addEventListener('message', (event: MessageEvent<ReturnType<T>>) => {
				cleanup();
				resolve(event.data);
			});

			worker.addEventListener('error', (event) => {
				console.log('error', event);
				cleanup();
				reject(event);
			});

			worker.postMessage(args);
		});
	};
}

