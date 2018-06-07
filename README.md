express-brute-mssql
===================

[![Build Status](https://travis-ci.org/reg0/express-brute-mssql.svg?branch=master)](https://travis-ci.org/reg0/express-brute-mssql)

A MS Sql Server store for [express-brute](https://github.com/AdamPflug/express-brute) via [mssql](https://github.com/tediousjs/node-mssql).

Installation
------------
via npm:

    $ npm install express-brute-mssql

express-brute-msql expects a table named `brute` (this may be overridden in the constructor) to exist in whatever database you're connecting to.

```sql
create table bruteschema.brute(
	id nvarchar(255) primary key, 
	count int, 
	first_request datetime2, 
	last_request datetime2, 
	expires datetime2
);
```
Usage
-----
``` js
var ExpressBrute = require('express-brute'),
	MsSqlStore = require('express-brute-mssql');

var store = new MsSqlStore({
	host: '127.0.0.1',
	tableName: 'brute',
	database: 'brutedb',
	schemaName: 'bruteschema',
	username: 'appuser',
	password: 'password'
});

var bruteforce = new ExpressBrute(store);

app.post('/auth',
	bruteforce.prevent, // error 403 if we hit this route too often
	function (req, res, next) {
		res.send('Success!');
	}
);
```

Options
-------
- `host`         MS Sql Server host name or IP address
- `database`     Database name to connect to
- `username`     Database username
- `password`     Corresponding password, if password authentication is required
- `tableName`    Include to use a storage table named something other than `brute`
- `schemaName`   Include if your storage table is in a schema other than `dbo`
- `pool`         You may pass in your application's `pool` instance to `express-brute-mssql` to share connection pools or use the native bindings; if not supplied, `express-brute-mssql` will spin up its own pool
