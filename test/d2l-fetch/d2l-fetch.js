'use strict';

var invalidRequestInputs = [
	undefined,
	null,
	1,
	'hello',
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
			window.d2lfetch.use(passthroughMiddleware);
			expect(window.d2lfetch._wrapMiddleware).to.be.calledWith(passthroughMiddleware);
		});

		it('should add the wrapped function to the _installedMiddlewares array', function() {
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
			window.d2lfetch.use(passthroughMiddleware);
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
			it('should throw a TypeError if it is not passed a Request object', function() {
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
		});

		describe('when one middleware is use\'d', function() {

			it('should call the middleware', function() {
				window.d2lfetch.use(passthroughSpy);
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
			});

			it('should not call window.fetch if the middleware does not call next()', function() {
				window.d2lfetch.use(earlyExitSpy);
				window.d2lfetch.fetch(getRequest());
				expect(earlyExitSpy).to.be.called;
				expect(window.fetch).not.to.be.called;
			});

			it('should call window.fetch when the middleware calls next()', function() {
				window.d2lfetch.use(passthroughSpy);
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
				expect(window.fetch).to.be.called;
			});

			it('should receive a Promise from window.fetch', function() {
				window.d2lfetch.use(passthroughSpy);
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
				window.d2lfetch.use(passthroughSpy);
				window.d2lfetch.use(anotherSpy);
				window.d2lfetch.use(earlyExitSpy);
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(earlyExitSpy);
			});

			it('should not call further down the chain if at any point a middleware does not call next()', function() {
				window.d2lfetch.use(passthroughSpy);
				window.d2lfetch.use(earlyExitSpy);
				window.d2lfetch.use(anotherSpy);
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(earlyExitSpy);
				expect(anotherSpy).not.to.be.called;
			});

			it('should call window.fetch when the final use\'d middleware calls next()', function() {
				window.d2lfetch.use(passthroughSpy);
				window.d2lfetch.use(anotherSpy);
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(window.fetch);
				expect(window.fetch).to.be.called;
			});
		});
	});

});
