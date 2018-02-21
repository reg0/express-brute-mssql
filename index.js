var AbstractClientStore = require('express-brute/lib/AbstractClientStore'),
	humps = require('humps'),
	moment = require('moment'),
	util = require('util'),
	_ = require('lodash'),
	sql = require('mssql');

var MsSqlStoreFieldMapping = {
	"count": "count",
	"first_request": "firstRequest",
	"last_request": "lastRequest",
	"id": "id",
	"expires": "expires"	
}

var MsSqlStore = module.exports = function (options) {
	AbstractClientStore.apply(this, arguments);

	this.options = _.extend({}, MsSqlStore.defaults, options);
	this.pool = options.pool;
	
	this.getPool = function() {
		if (this.pool) {
			return Promise.resolve(this.pool);
		}

		return new sql.ConnectionPool(this.options).connect();
	}

	this.mapResult = function(record) {
		return Object.keys(record).reduce(function(result, key){
			result[MsSqlStoreFieldMapping[key]] = record[key];
			return result;
		}, {})
	}

	this.tableName = function(options) {
		return (options.schemaName ? '[' + options.schemaName + '].' : '') + '[' + options.tableName + ']';
	}
};

MsSqlStore.prototype = Object.create(AbstractClientStore.prototype);

MsSqlStore.prototype.set = function (key, value, lifetime, callback) {
	var self = this;

	return this.getPool().then(function(con) {
		var expiry;

		if (lifetime) { 
			expiry = moment().add(lifetime, 'seconds').toDate(); 
		}

		var requestUpdate = new sql.Request(con)
			.input("count", value.count)
			.input("lastRequest", value.lastRequest)
			.input("expires", expiry)
			.input("id", key);

		return requestUpdate.query(
			'UPDATE ' + self.tableName(self.options) +
			' SET count = @count, last_request = @lastRequest, expires = @expires WHERE id = @id'
		).then(function(result) {
			if (!result.rowsAffected[0]) {
				var requestInsert = new sql.Request(con)
					.input("count", value.count)
					.input("firstRequest", value.firstRequest)
					.input("lastRequest", value.lastRequest)
					.input("expires", expiry)
					.input("id", key);

				return requestInsert.query(
					'INSERT INTO ' + self.tableName(self.options) +
					'(id, count, first_request, last_request, expires) ' +
					'VALUES (@id, @count, @firstRequest, @lastRequest, @expires)'
				).then(function(result) {
					return typeof callback === 'function' && callback(null);	
				});
			} else {
				return typeof callback === 'function' && callback(null);
			}
		});
	}).catch(function(error) {
		return typeof callback === 'function' && callback(error);
	}).then(function() {
		sql.close();
	});
};

MsSqlStore.prototype.get = function (key, callback) {
	var self = this;
	
	return this.getPool().then(function(con) {
		var query = 'SELECT id, count, first_request, last_request, expires FROM ' + 
		(self.options.schemaName ? '[' + self.options.schemaName + '].' : '') + '[' + self.options.tableName + ']' + 
		' WHERE id = @id';
		var request = new sql.Request(con).input("id", key);
		return request.query(query).then(function(result) {
			if (result.rowsAffected[0] && new Date(result.recordset[0].expires).getTime() < new Date().getTime()) {
				var queryDelete = 'DELETE FROM ' + self.tableName(self.options) + ' WHERE id = @id';
				var requestDelete = new sql.Request(con).input("id", key);
				return requestDelete.query(queryDelete).then(function(result) {
					return typeof callback === 'function' && callback(null, null);
				});
			} else if (result.rowsAffected[0]) {
				return typeof callback === 'function' && callback(null, result.rowsAffected[0] ? self.mapResult(result.recordset[0]) : null);
			} else {
				return typeof callback === 'function' && callback(null, null);
			}
		});
	}).catch(function(error) {
		return typeof callback === 'function' && callback(error);
	}).then(function() {
		sql.close();
	});
};

MsSqlStore.prototype.reset = function (key, callback) {
	var self = this;

	return this.getPool().then(function(con) {
		var requestDelete = new sql.Request(con).input("id", key);
		return requestDelete.query(
			'DELETE FROM ' + self.tableName(self.options) + ' OUTPUT DELETED.* WHERE id = @id'
		).then(function(result) {
			return typeof callback === 'function' && callback(null, result.recordset && result.recordset.length ? self.mapResult(result.recordset[0]) : null);
		});
	}).catch(function(error) {
		return typeof callback === 'function' && callback(error);			
		sql.close();
	});
};

MsSqlStore.defaults = {
	server: '127.0.0.1',
	schemaName: 'dbo',
	tableName: 'brute'
};
