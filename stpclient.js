(function () {
    var net = require('net');
    var util = require('util');
    var events = require('events');

    var STPClient = function (host, port) {
        events.EventEmitter.call(this);

        this.host = host;
        this.port = port;
        this._queue = [];
        this._retry = 2;
        this._buffer = '';
        this._started = true;
        this._currCallback = undefined;
        this.connect();
    };

    util.inherits(STPClient, events.EventEmitter);

    STPClient.prototype.end = function () {
        this._retry = 2;
        this._queue = [];
        this._buffer = '';
        this._started = false;
        this.client.end();
    };

    STPClient.prototype.connect = function () {
        var self = this;
        this._currCallback = undefined;
        var client = this.client = net.connect({host: this.host, port: this.port});
        client.on('connect', function () {
            self._retry = 2;
            self._flushQueue();
            self.emit('connect', self);
        });
        client.on('end', function() {
            console.log('client disconnected');
            if (self._started) {
                console.log('reconnecting in', self._retry + 's' );
                setTimeout(function () {self.connect();},
                    1000*(self._retry = 2*self._retry));
            }
        });
        client.on('error', function() {
            console.log('reconnecting in', self._retry + 's' );
            if (self._started) {
                setTimeout(function () {self.connect();},
                    1000*(self._retry = 2*self._retry));
            }
        });
        client.on('data', function(data) {
            self._buffer += data.toString();
            var eof = self._buffer.indexOf('\r\n\r\n');
            if (eof != -1) {
                var sliced = self._buffer.slice(0, eof).split('\r\n');
                var response = [];
                for (var i = 1; i < sliced.length; i+=2) {
                    response.push(sliced[i]);
                }

                self._buffer = '';
                if (self._currCallback) {
                    var callback = self._currCallback;
                    self._currCallback = undefined;
                    callback(response);
                    self._flushQueue();
                }
            }
        });
    };

    STPClient.prototype.send_request = function (arg, callback) {
        this._queue.push([arg, callback]);
        this._flushQueue();
    };

    STPClient.prototype._flushQueue = function () {
        var self = this;
        if (!self._currCallback && this._queue.length > 0) {
            var item = this._queue.shift();
            var arg = item[0], callback = item[1];
            var args = [];
            if (typeof arg == 'string') {
                args.push(arg);
            } else {
                args = arg;
            }
            this._currCallback = function (data) {
                self._currCallback = undefined;
                callback(data);
            };
            for (var i = 0; i < args.length; i++) {
                var d = args[i] + '';
                this.client.write(d.length + '\r\n' + d +'\r\n');
            }
            this.client.write('\r\n');
        }
    };

    exports.connect =  function (host, port) {
        return new STPClient(host, port);
    };
})();
