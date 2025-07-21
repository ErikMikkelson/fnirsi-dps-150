

export async function sleep(n) {
	return new Promise((resolve) => {
		setTimeout(resolve, n);
	});
}

export async function functionWithTimeout(fn, timeout) {
	const workerCode = `
		self.onmessage = (event) => {
		 postMessage( (${fn.toString()}).apply(null, event.data) );
		};
	`;

	return async function (...args) {
		return await new Promise((resolve, reject) => {
			const worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: "application/javascript" })), {
				type: 'module',
				name: 'evaluator',
			});
			const timer = setTimeout(() => {
				clearTimeout(timer);
				worker.terminate();
				reject(new Error('timeout'));
			}, timeout);
			worker.addEventListener('message', (event) => {
				clearTimeout(timer);
				resolve(event.data);
			});
			worker.addEventListener('error', (event) => {
				console.log('error', event);
				clearTimeout(timer);
				reject(event);
			});
			worker.postMessage(args);
		});
	};
}

