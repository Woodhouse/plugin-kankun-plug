var http = require('http');
var moment = require('moment');
var dgram = require('dgram');

var kankun = function(){
    this.name = 'kankun-plug';
    this.displayname = 'Kankun Plug';
    this.description = 'Control your Kankun plugs';
}

kankun.prototype.init = function(){
    var self = this;
    this.server = dgram.createSocket('udp4');
    this.plugs = {};

    this.server.bind(9600);

    this.server.on('message', function (message) {
        if (message.toString().match('"source":"kankun-plug"')) {
            var obj = JSON.parse(message.toString()),
                tags = [];

            if (obj.uuid) {
                if (obj.group) {
                    tags = obj.group.split(',')
                } else {
                    tags = obj.tags.split(',');
                }

                if (tags instanceof Array === false) {
                    tags = [tags];
                }

                tags = tags.map(function(value) {
                    return value.trim().toLowerCase();
                });

                self.plugs[obj.uuid] = {name: obj.name.toLowerCase(), tags: tags, ip: obj.ip};
            }
        }
    });

    this.listen('(kankun|small k) on (:<group or item>.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params[1], function(obj){
            self.turnOn(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) off (:<group or item>.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params[1], function(obj){
            self.turnOff(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) status (:<group or item>.+?)', 'standard', function(from, interface, params){
        self.checkGroups(params[1], function(obj){
            self.checkStatus(obj, interface, from);
        });
    });

    this.listen('(kankun|small k) timer (:<unit>.+?) (:<seconds, minutes, hours or days>second|minute|hour|day|seconds|minutes|hours|days) (:<state>off|on) (:<group or item>.+?)', 'standard',
        function(from, interface, params){
            self.setTimer(from, interface, params);
        }
    );

    this.listen('(kankun|small k) cancel timer (:<timer id>.+?)', 'standard',
        function(from, interface, params){
            self.cancelTimer(from, interface, params);
        }
    );

    this.listen('(kankun|small k) list', 'standard',
        function(from, interface, params){
            var tags = {},
                names = [],
                message = '';

            for (var key in self.plugs) {
                names.push(self.plugs[key].name + ' (IP: ' + self.plugs[key].ip + ')');
                self.plugs[key].tags.forEach(function(value) {
                    tags[value] = true;
                });
            }

            if (names.length > 0) {
                names = '    - ' + names.join('\n    - ');
                message += 'Plug names:\n' + names + '\n';
            }

            if (Object.keys(tags).length > 0) {
                tags = Object.keys(tags);
                tags = '    - ' + tags.join('\n    - ');
                message += 'Tags:\n' + tags;
            }

            message = message.trim()

            if (message.length === 0) {
                message = 'No plugs detected yet'
            }

            self.sendMessage(message, interface, from);
        }
    );

    this.registerCronHandler('timer', function(params){
        self.checkGroups(params.plug, function(obj){
            if (params.status === 'on') {
                self.turnOn(obj, params.interface, params.from);
            } else {
                self.turnOff(obj, params.interface, params.from);
            }
        });
    });
}

kankun.prototype.checkGroups = function(name, callback) {
    for (var key in this.plugs) {
        if (this.plugs[key].name === name.toLowerCase() || this.plugs[key].tags.indexOf(name.toLowerCase()) > -1) {
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

    var id = this.addCronJob(crontime, 'timer', {
        plug: params[4],
        status: params[3],
        interface: interface,
        from: from
    });

    this.sendMessage('Timer added with ID ' + id, interface, from);
}

kankun.prototype.cancelTimer = function(from, interface, params) {
    this.removeCronJob(params[1]);
    this.sendMessage('Timer with ID ' + params[1] + ' cancelled', interface, from);
}

kankun.prototype.exit = function() {
    this.server.close();
}

module.exports = kankun;
