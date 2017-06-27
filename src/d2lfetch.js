export class D2LFetch {

	constructor() {
		this._installedMiddlewares = [];
	}

	fetch(input, options) {
		if ('string' === typeof input) {
			input = new Request(input, options);
		}
		if (false === input instanceof Request) {
			return Promise.reject(new TypeError('Invalid input argument(s) supplied.'));
		}

		const chain = this._installedMiddlewares.slice();
		chain.push({name: 'fetch', fn: this._wrapMiddleware(window.fetch)});
		return chain.shift().fn.bind(this, chain)(input);
	}

	use({name, fn}) {
		this._installedMiddlewares.push({name, fn: this._wrapMiddleware(fn)});
	}

	with({name, fn}) {
		const self = new D2LFetch();
		self._installedMiddlewares = this._installedMiddlewares.slice();
		self._installedMiddlewares.unshift({name, fn: this._wrapMiddleware(fn)});
		return self;
	}

	without(name) {
		const self = new D2LFetch();
		self._installedMiddlewares = this._installedMiddlewares.filter(middleware => middleware.name !== name);
		return self;
	}

	_wrapMiddleware(fn) {
		return (chain, request) => {
			let next;
			if (chain && chain.length !== 0) {
				next = chain.shift().fn.bind(this, chain);
			}
			return fn(request, next);
		};
	}
}
