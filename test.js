var fs = require('fs');
var client = require('./stpclient').connect('localhost', 3399);
client.on('connect',  function (conn) {
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
