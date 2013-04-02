var net = require('net');

var STPClient = function () {
};

STPClient.prototype.connect = function (host, port, callback) {

    this.host = host;
    this.port = port;
    this._queue = [];
    this._retry = 2;
    this._buffer = '';
    this._started = true;
    this._callback = undefined;
    this._on_connect = callback;
    this.reconnect();
};

STPClient.prototype.end = function () {
    this._retry = 2;
    this._queue = [];
    this._buffer = '';
    this._started = false;
    this.client.end();
};

STPClient.prototype.reconnect = function () {
    var self = this;
    this._callback = undefined;
    var client = this.client = net.connect({host: this.host, port: this.port});
    client.on('connect', function () {
          self._retry = 2;
                self._flushQueue();
                if (self._on_connect) {
                    self._on_connect(self);
                }
    });
    client.on('end', function() {
        console.log('client disconnected');
        if (self._started) {
            console.log('reconnecting in', self._retry + 's' );
            setTimeout(function () {self.reconnect();},
                1000*(self._retry = 2*self._retry));
        }
    });
    client.on('error', function() {
        console.log('reconnecting in', self._retry + 's' );
        if (self._started) {
            setTimeout(function () {self.reconnect();},
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
            if (self._callback) {
                var callback = self._callback;
                self._callback = undefined;
                callback(response);
                self._flushQueue();
            }
        }
    });
};

STPClient.prototype.send_request = function (arg, callback) {
    this._queue.push([arg, callback]);
    this._flushQueue();
    //this.client.write(data.length + '\r\n' + data+'\r\n\r\n');
};

STPClient.prototype._flushQueue = function () {
    var self = this;
    if (!self._callback && this._queue.length > 0) {
        var item = this._queue.shift();
        var arg = item[0], callback = item[1];
        var args = [];
        if (typeof arg == 'string') {
            args.push(arg);
        } else {
            args = arg;
        }
        this._callback = function (data) {
            self._callback = undefined;
            callback(data);
        };
        for (var i = 0; i < args.length; i++) {
            var d = args[i] + '';
            this.client.write(d.length + '\r\n' + d +'\r\n');
        }
        this.client.write('\r\n');
    }
};

exports.STPClient =  STPClient;
