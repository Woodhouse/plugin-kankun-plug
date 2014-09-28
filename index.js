var http = require('http');

var kankun = function(){
    this.name = 'kankun-plug';
    this.displayname = 'Kankun Plug';
    this.description = 'Control your Kankun plugs';
}

kankun.prototype.init = function(){
    var self = this;
    var dgram = require('dgram');
    var server = dgram.createSocket('udp4');
    this.plugs = [];

    server.bind(9600);

    server.on('message', function (message) {
        if (message.toString().match('"source":"kankun-plug"')) {
            var obj = JSON.parse(message.toString());

            self.plugs[obj.uuid] = {name: obj.name, group: obj.group, ip: obj.ip};
        }
    });

    this.listen('(kankun|small k) on (.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params, function(obj){
            self.turnOn(obj, interface, from)
        });
    });

    this.listen('(kankun|small k) off (.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params, function(obj){
            self.turnOff(obj, interface, from)
        });
    });

    this.listen('(kankun|small k) status (.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params, function(obj){
            self.checkStatus(obj, interface, from)
        });
    });
}

kankun.prototype.checkGroups = function(params, callback) {
    for (var key in this.plugs) {
        if (this.plugs[key].name === params[1] || this.plugs[key].group === params[1]) {
            callback(this.plugs[key]);
        }
    }
}

kankun.prototype.turnOn = function(obj, interface, from){
    var self = this;
    var options = {
        hostname: obj.ip,
        path: '/cgi-bin/relay.cgi?on',
        headers: {
            'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
        }
    };
    var req = http.get(options, function(res) {
        self.sendMessage(obj.name + ' has been turned on', interface, from);
    }).on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

}

kankun.prototype.turnOff = function(obj, interface, from){
    var self = this;
    var options = {
        hostname: obj.ip,
        path: '/cgi-bin/relay.cgi?off',
        headers: {
            'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
        }
    };
    var req = http.get(options, function(res) {
        self.sendMessage(obj.name + ' has been turned off', interface, from);
    }).on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

}

kankun.prototype.checkStatus = function(obj, interface, from){
    var self = this;
    var options = {
        hostname: obj.ip,
        path: '/cgi-bin/relay.cgi?state',
        headers: {
            'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
        }
    };
    var data = '';
    var req = http.request(options, function(res) {
        res.on('data', function (response) {
            data += String(response);
        });

        res.on('end', function(){
            if (data.trim() === 'OFF') {
                self.sendMessage(obj.name + ' is off', interface, from);
            } else if (data.trim() === 'ON') {
                self.sendMessage(obj.name + ' is on', interface, from);
            }
        })
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.end();
}

module.exports = kankun;
