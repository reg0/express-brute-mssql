var assert = require('chai').assert;
var MsSqlStore = require('../');

describe('express-brute MS Sql Server store', function () {
	var instance;

	beforeEach(function () {
		instance = new MsSqlStore({
			tableName: 'brute',
			database: 'brutedb',
			schemaName: 'bruteschema',
			user: 'sa',
			password: 'P@s$w0rd'
		});
	});

	afterEach(function (done) {
		instance.reset('1.2.3.4', done);
	});

	it('should be instantiable', function () {
		assert.isOk(instance);
	});

	it('should set and retrieve values for a key', function (done) {
		var curDate = new Date(),
			object = {count: 1, lastRequest: curDate, firstRequest: curDate};

		instance.set('1.2.3.4', object, 1, function (err) {
			assert.isNull(err);

			instance.get('1.2.3.4', function (err, result) {
				assert.isNull(err);
				assert.equal(result.count, object.count);
				assert(Math.abs(result.firstRequest.getTime() - object.firstRequest.getTime()) < 5);
				assert(Math.abs(result.lastRequest.getTime() - object.lastRequest.getTime()) < 5);

				done();
			});
		});
	});

	it('should increment values for a key and return the latest value', function (done) {
		var curDate = new Date(),
			object = {count: 1, lastRequest: curDate, firstRequest: curDate};

		instance.set('1.2.3.4', object, 1, function (err) {
			assert.isNull(err);

			instance.increment('1.2.3.4', 1, function (err) {
				assert.isNull(err);

				instance.get('1.2.3.4', function (err, result) {
					assert.isNull(err);
				
					object.count++;

					assert.equal(result.count, object.count);
					assert(Math.abs(result.firstRequest.getTime() - object.firstRequest.getTime()) < 5);
					assert(Math.abs(result.lastRequest.getTime() - object.lastRequest.getTime()) > 5);

					done();
				});
			});
		});
	});

	it('should initialize values if incrementing a nonexistent key', function (done) {
		instance.increment('1.2.3.4', 1, function (err) {
			assert.isNull(err);

			instance.get('1.2.3.4', function (err, result) {
				assert.isNull(err);
				assert.equal(result.count, 1);
				assert.isTrue(result.firstRequest instanceof Date);
				assert.isTrue(result.lastRequest instanceof Date);

				done();
			});
		});
	});

	it('should return null if no value is available', function (done) {
		instance.get('1.2.3.4', function (err, result) {
			assert.isNull(err);
			assert.isNull(result);

			done();
		});
	});

	it('should reset rows', function (done) {
		var curDate = new Date(),
			object = {count: 1, lastRequest: curDate, firstRequest: curDate};

		instance.set('1.2.3.4', object, 1, function (err) {
			assert.isNull(err);

			instance.reset('1.2.3.4', function (err, result) {
				assert.isNull(err);

				assert.equal(result.count, object.count);
				assert(Math.abs(result.firstRequest.getTime() - object.firstRequest.getTime()) < 5);
				assert(Math.abs(result.lastRequest.getTime() - object.lastRequest.getTime()) < 5);

				instance.get('1.2.3.4', function (err, result) {
					assert.isNull(err);
					assert.isNull(result);

					done();
				});
			});
		});
	});

	it('should expire rows', function (done) {
		var curDate = new Date(),
			object = {count: 1, lastRequest: curDate, firstRequest: curDate};

		instance.set('1.2.3.4', object, 1, function (err) {
			assert.isNull(err);

			setTimeout(function () {
				// get after .5 sec, should still be there
				instance.get('1.2.3.4', function (err, result) {
					assert.isNull(err);
					assert.equal(result.count, object.count);
					assert(Math.abs(result.firstRequest.getTime() - object.firstRequest.getTime()) < 5);
					assert(Math.abs(result.lastRequest.getTime() - object.lastRequest.getTime()) < 5);

					setTimeout(function () {
						// get after 1 sec, should have expired
						instance.get('1.2.3.4', function (err, result) {
							assert.isNull(err);
							assert.isNull(result);

							done();
						});
					}, 500);
				});
			}, 500);
		});
	});
});