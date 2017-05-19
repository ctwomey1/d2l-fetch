export class D2LFetch {

	constructor() {
		this._installedMiddlewares = [];
	}

	fetch(request) {
		if (false === request instanceof Request) {
			return Promise.reject(new TypeError('Invalid request argument supplied; must be a valid window.Request object.'));
		}

		const chain = this._installedMiddlewares.slice();
		chain.push(this._wrapMiddleware(window.fetch));
		return chain.shift().bind(this, chain)(request);
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
