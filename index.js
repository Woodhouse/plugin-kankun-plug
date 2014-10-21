var http = require('http');
var moment = require('moment');

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
        self.checkGroups(params[1], function(obj){
            self.turnOn(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) off (.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params[1], function(obj){
            self.turnOff(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) status (.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params[1], function(obj){
            self.checkStatus(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) timer (.+?) (seconds|minutes|hours|days) (off|on) (.+?)', 'standard',
        function(from, interface, params){
            self.setTimer(from, interface, params);
        }
    );

    this.listen('(kankun|small k) cancel timer (.+?)', 'standard',
        function(from, interface, params){
            self.cancelTimer(from, interface, params);
        }
    );
}

kankun.prototype.checkGroups = function(name, callback) {
    for (var key in this.plugs) {
        if (this.plugs[key].name === name || this.plugs[key].group === name) {
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

kankun.prototype.setTimer = function(from, interface, params) {
    var self = this;
    var crontime = moment().add(params[1], params[2]).toDate();

    var id = self.api.addCronJob(crontime, function(){
        self.checkGroups(params[4], function(obj){
            if (params[3] === 'on') {
                self.turnOn(obj, interface, from);
            } else {
                self.turnOff(obj, interface, from);
            }
        });
    });

    self.sendMessage('Timer added with ID ' + id, interface, from);
}

kankun.prototype.cancelTimer = function(from, interface, params) {
    this.api.stopCronJob(params[1]);
    this.sendMessage('Timer with ID ' + params[1] + ' cancelled', interface, from);
}

module.exports = kankun;
