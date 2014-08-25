var http = require('http');

var kankun = function(){
    this.name = 'kankun-plug';
    this.displayname = 'Kankun Plug';
    this.description = 'Control your Kankun plugs';
}

kankun.prototype.init = function(){
    var self = this;
    this.listen('kankun on (.+?)', function(from, interface, params){
        self.turnOn('192.168.0.10', params[0], interface, from);
    });

    this.listen('kankun off (.+?)', function(from, interface, params){
        self.turnOff('192.168.0.10', params[0], interface, from);
    });

    this.listen('kankun status (.+?)', function(from, interface, params){
        self.checkStatus('192.168.0.10', params[0], interface, from);
    });
}

kankun.prototype.turnOn = function(ip, name, interface, from){
    var self = this;
    var options = {
        hostname: ip,
        path: '/cgi-bin/relay.cgi?on',
        headers: {
            'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
        }
    };
    var req = http.get(options, function(res) {
        self.sendMessage(name + ' has been turned on', interface, from);
    }).on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

}

kankun.prototype.turnOff = function(ip, name, interface, from){
    var self = this;
    var options = {
        hostname: ip,
        path: '/cgi-bin/relay.cgi?off',
        headers: {
            'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
        }
    };
    var req = http.get(options, function(res) {
        self.sendMessage(name + ' has been turned off', interface, from);
    }).on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

}

kankun.prototype.checkStatus = function(ip, name, interface, from){
    var self = this;
    var options = {
        hostname: ip,
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
            console.log(data)
            if (data.trim() === 'OFF') {
                self.sendMessage(name + ' is off', interface, from);
            } else if (data.trim() === 'ON') {
                self.sendMessage(name + ' is on', interface, from);
            }
        })
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    req.end();
}

module.exports = kankun;
