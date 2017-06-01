export class D2LFetch {

	constructor() {
		this._installedMiddlewares = [];
	}

	fetch(input, options) {
		if (typeof input === 'string') {
			input = new Request(input, options);
		}
		if (false === input instanceof Request) {
			return Promise.reject(new TypeError('Invalid input argument(s) supplied.'));
		}

		const chain = this._installedMiddlewares.slice();
		chain.push(this._wrapMiddleware(window.fetch));
		return chain.shift().bind(this, chain)(input);
	}

	use(fn) {
		this._installedMiddlewares.push(this._wrapMiddleware(fn));
	}

	_wrapMiddleware(fn) {
		return (chain, request) => {
			let next;
			if (chain && chain.length !== 0) {
				next = chain.shift().bind(this, chain);
			}
			return fn(request, next);
		};
	}
}
