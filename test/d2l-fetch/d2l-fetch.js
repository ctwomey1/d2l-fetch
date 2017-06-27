'use strict';

var invalidRequestInputs = [
	undefined,
	null,
	1,
	{},
	{ whatiam: 'is not a Request'}
];

describe('d2l-fetch', function() {

	var sandbox;

	var passthroughMiddleware = function(request, next) {
		return next(request);
	};

	var earlyExitMiddleware = function() {
		return;
	};

	function getRequest() {
		return new Request('/path/to/data');
	}

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		sandbox.stub(window, 'fetch');
	});

	afterEach(function() {
		sandbox.restore();
		window.d2lfetch._installedMiddlewares = [];
	});

	it('should be a thing', function() {
		expect(window.d2lfetch).to.be.defined;
	});

	describe('.use', function() {
		it('should be a public function', function() {
			expect(window.d2lfetch.use instanceof Function).to.equal(true);
		});

		it('should wrap the supplied function in a middleware handler function', function() {
			sandbox.spy(window.d2lfetch, '_wrapMiddleware');
			window.d2lfetch.use({name: 'passthroughMiddleware', fn: passthroughMiddleware});
			expect(window.d2lfetch._wrapMiddleware).to.be.calledWith(passthroughMiddleware);
		});

		it('should add the wrapped function to the _installedMiddlewares array', function() {
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
			window.d2lfetch.use({name: 'passthroughMiddleware', fn: passthroughMiddleware});
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(1);
		});
	});

	describe('.fetch', function() {

		var windowFetchResponse = Promise.resolve(new Response());
		var passthroughSpy, earlyExitSpy;

		beforeEach(function() {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			earlyExitSpy = sandbox.spy(earlyExitMiddleware);
		});

		it('should be a public function', function() {
			expect(window.d2lfetch.fetch instanceof Function).to.equal(true);
		});

		invalidRequestInputs.forEach(function(input) {
			it('should throw a TypeError if it is not passed a Request object or the provided input cannot be used to create a new Request object', function() {
				return window.d2lfetch.fetch(input)
					.then((function() { expect.fail(); }), function(err) { expect(err instanceof TypeError).to.equal(true); });
			});
		});

		describe('when no middleware is present', function() {
			it('should call window.fetch with the provided Request object', function() {
				expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
				var req = getRequest();
				return window.d2lfetch.fetch(req)
					.then(function() {
						expect(window.fetch).to.be.calledWith(req);
					});
			});

			it('should call window.fetch with a request object created from the provided url and options', function() {
				expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
				var url = '/path/to/data';
				var options = { method: 'PUT' };
				return window.d2lfetch.fetch(url, options)
					.then(function() {
						expect(window.fetch).to.be.calledWith(sinon.match.has('url', sinon.match(/\/path\/to\/data$/)));
						expect(window.fetch).to.be.calledWith(sinon.match.has('method', 'PUT'));
					});
			});
		});

		describe('when one middleware is use\'d', function() {

			it('should call the middleware', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
			});

			it('should not call window.fetch if the middleware does not call next()', function() {
				window.d2lfetch.use({name: 'earlyExitSpy', fn: earlyExitSpy});
				window.d2lfetch.fetch(getRequest());
				expect(earlyExitSpy).to.be.called;
				expect(window.fetch).not.to.be.called;
			});

			it('should call window.fetch when the middleware calls next()', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
				expect(window.fetch).to.be.called;
			});

			it('should receive a Promise from window.fetch', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				var response = window.d2lfetch.fetch(getRequest());
				expect(response).to.equal(windowFetchResponse);
			});
		});

		describe('when multiple middlewares are use\'d', function() {

			var thirdMiddleware = function(request, next) {
				return next(request);
			};
			var anotherSpy;

			beforeEach(function() {
				anotherSpy = sandbox.spy(thirdMiddleware);
			});

			it('should call the middlewares in the order they were use\'d', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				window.d2lfetch.use({name: 'anotherSpy', fn: anotherSpy});
				window.d2lfetch.use({name: 'earlyExitSpy', fn: earlyExitSpy});
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(earlyExitSpy);
			});

			it('should not call further down the chain if at any point a middleware does not call next()', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				window.d2lfetch.use({name: 'earlyExitSpy', fn: earlyExitSpy});
				window.d2lfetch.use({name: 'anotherSpy', fn: anotherSpy});
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(earlyExitSpy);
				expect(anotherSpy).not.to.be.called;
			});

			it('should call window.fetch when the final use\'d middleware calls next()', function() {
				window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
				window.d2lfetch.use({name: 'anotherSpy', fn: anotherSpy});
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(window.fetch);
				expect(window.fetch).to.be.called;
			});
		});
	});

	describe('.withMiddleware', function() {
		var windowFetchResponse = Promise.resolve(new Response());
		var secondMiddleware = function(request, next) {
			return next(request);
		};
		var passthroughSpy, anotherSpy;

		beforeEach(function() {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			anotherSpy = sandbox.spy(secondMiddleware);
		});

		it('should be a public function', function() {
			expect(window.d2lfetch.withMiddleware instanceof Function).to.equal(true);
		});

		it('should return a new D2LFetch object', function() {
			expect(window.d2lfetch.withMiddleware({name: 'test', fn: function() {}})).not.to.equal(window.d2lfetch);
		});

		it('should return a new D2LFetch object with a different set of middleware', function() {
			expect(window.d2lfetch.withMiddleware({name: 'test', fn: function() {}})._installedMiddlewares).not.to.equal(window.d2lfetch._installedMiddlewares);
		});

		it('should add a new middleware to installed middlewares of the new D2LFetch object', function() {
			expect(window.d2lfetch._installedMiddlewares).to.be.empty;
			expect(window.d2lfetch.withMiddleware({name: 'test', fn: function() {}})._installedMiddlewares).to.have.lengthOf(1);
		});

		it('should add new middleware after all other middlewares', function() {
			window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
			window.d2lfetch.withMiddleware({name: 'anotherSpy', fn: anotherSpy}).fetch(getRequest());
			expect(passthroughSpy).to.be.calledBefore(anotherSpy);
		});

		it('should be able to be chain called multiple times', function() {
			window.d2lfetch
				.withMiddleware({name: 'passthroughSpy', fn: passthroughSpy})
				.withMiddleware({name: 'anotherSpy', fn: anotherSpy})
				.fetch(getRequest());
			expect(anotherSpy).to.be.called;
			expect(passthroughSpy).to.be.calledBefore(anotherSpy);
		});

		it('should be able to be chain called with D2lFetch.withoutMiddleware', function() {
			window.d2lfetch
				.withMiddleware({name: 'passthroughSpy', fn: passthroughSpy})
				.withoutMiddleware('passthroughSpy')
				.fetch();
			expect(passthroughSpy).not.to.be.called;
		});
	});

	describe('.withoutMiddleware', function() {
		var windowFetchResponse = Promise.resolve(new Response());
		var secondMiddleware = function(request, next) {
			return next(request);
		};
		var passthroughSpy, anotherSpy;

		beforeEach(function() {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			anotherSpy = sandbox.spy(secondMiddleware);
		});

		it('should be a public function', function() {
			expect(window.d2lfetch.withoutMiddleware instanceof Function).to.equal(true);
		});

		it('should return a new D2LFetch object', function() {
			expect(window.d2lfetch.withoutMiddleware({name: 'test', fn: function() {}})).not.to.equal(window.d2lfetch);
		});

		it('should return a new D2LFetch object with a different set of middleware', function() {
			expect(window.d2lfetch.withoutMiddleware({name: 'test', fn: function() {}})._installedMiddlewares).not.to.equal(window.d2lfetch._installedMiddlewares);
		});

		it('should remove a specified installed middleware', function() {
			window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
			window.d2lfetch.withoutMiddleware('passthroughSpy').fetch(getRequest());
			expect(passthroughSpy).not.to.be.called;
		});

		it('should be able to be chain called', function() {
			window.d2lfetch.use({name: 'passthroughSpy', fn: passthroughSpy});
			window.d2lfetch.use({name: 'anotherSpy', fn: anotherSpy});
			window.d2lfetch
				.withoutMiddleware('passthroughSpy')
				.withoutMiddleware('anotherSpy')
				.fetch(getRequest());
			expect(passthroughSpy).not.to.be.called;
			expect(anotherSpy).not.to.be.called;
		});
	});

});
