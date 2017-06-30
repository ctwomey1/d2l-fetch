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
		chain.push({ name: 'fetch', fn: this._wrapMiddleware(window.fetch) });
		return chain.shift().fn.bind(this, chain)(input);
	}

	use(middleware) {
		const {name, fn} = this._verifyMiddleware(middleware);
		this._installedMiddlewares.push({ name, fn: this._wrapMiddleware(fn) });
	}

	addTemp(middleware) {
		const {name, fn} = this._verifyMiddleware(middleware);
		const newFetch = new D2LFetch();

		newFetch._installedMiddlewares = this._installedMiddlewares.slice();
		newFetch._installedMiddlewares.push({ name, fn: newFetch._wrapMiddleware(fn) });

		return newFetch;
	}

	removeTemp(name) {
		if (!name || typeof name !== 'string') {
			throw TypeError('Parameter "name" must be a non-empty string');
		}
		const newFetch = new D2LFetch();
		newFetch._installedMiddlewares = this._installedMiddlewares.filter(middleware => middleware.name !== name);
		return newFetch;
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

	_verifyMiddleware(middleware) {
		if (!middleware || 'object' !== typeof middleware) {
			throw TypeError('Parameter "middleware" must be an object');
		}

		const {name, fn} = middleware;
		if (!name || 'string' !== typeof name) {
			throw TypeError('Parameter "middleware.name" must be a non-empty string');
		}
		if (!fn || 'function' !== typeof fn) {
			throw TypeError('Parameter "middleware.fn" must be a function');
		}

		return middleware;
	}
}
