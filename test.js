var fs = require('fs');
var STPClient = require('./stpclient').STPClient;
var client = new STPClient();
client.connect('localhost', 3399, function (conn) {
    console.log('client connected');
    conn.send_request('info', function (data) {
        console.log('resp', data);
    });
    conn.send_request('ping', function (data) {
        console.log('resp', data);
    });
    conn.send_request(['psubscribe', '*'], function (data) {
        console.log('resp', data);
        conn.send_request('next', function (data) {
            console.log('resp', data);
            conn.send_request('next', arguments.callee);
        });
    });

});
