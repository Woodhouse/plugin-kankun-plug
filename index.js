'use strict';

const bluebird = require('bluebird');
const request = require('request-promise');
const moment = require('moment');

class kankun {
    constructor() {
        this.name = 'kankun-plug';
        this.displayname = 'Kankun Plug';
        this.description = 'Control your Kankun plugs';
    }

    init() {
        this.plugs = {};

        this.listenBroadcast('kankun-plug', (message) => {
            let tags;

            if (message.uuid) {
                if (message.group) {
                    tags = message.group.split(',')
                } else {
                    tags = message.tags.split(',');
                }

                if (tags instanceof Array === false) {
                    tags = [tags];
                }

                tags = tags.map((value) => {
                    return value.trim().toLowerCase();
                });

                this.plugs[message.uuid] = {name: message.name.toLowerCase(), tags: tags, ip: message.ip};
            }
        });

        this.listen('(kankun|small k) on (:<group or item>.+?)', 'standard', (from, interfaceName, params) => {
            return this.checkGroups(params[1], (obj) => {
                return this.turnOn(obj, interfaceName, from);
            });
        });

        this.listen('(kankun|small k) off (:<group or item>.+?)', 'standard', (from, interfaceName, params) => {
            return this.checkGroups(params[1], (obj) => {
                return this.turnOff(obj, interfaceName, from);
            });
        });

        this.listen('(kankun|small k) status (:<group or item>.+?)', 'standard', (from, interfaceName, params) => {
            return this.checkGroups(params[1], (obj) => {
                return this.checkStatus(obj, interfaceName, from);
            });
        });

        this.listen('(kankun|small k) timer (:<unit>.+?) (:<seconds, minutes, hours or days>second|minute|hour|day|seconds|minutes|hours|days) (:<state>off|on) (:<group or item>.+?)', 'standard',
            (from, interfaceName, params) => {
                const crontime = moment().add(params[1], params[2]).toDate();

                return this.addCronJob(crontime, 'timer', {
                    plug: params[4],
                    status: params[3],
                    interfaceName: interfaceName,
                    from: from
                }).then((id) => {
                    return `Timer added with ID ${id}`;
                });
            }
        );

        this.listen('(kankun|small k) cancel timer (:<timer id>.+?)', 'standard',
            (from, interfaceName, params) => {
                return this.removeCronJob(params[1]).then(() => {
                    return `Timer with ID ${params[1]} cancelled`;
                });
            }
        );

        this.listen('(kankun|small k) list', 'standard',
            (from, interfaceName, params) => {
                let tags = {};
                let names = [];
                let message = '';

                for (let key in this.plugs) {
                    names.push(`${this.plugs[key].name} (IP: ${this.plugs[key].ip})`);
                    this.plugs[key].tags.forEach((value) => {
                        tags[value] = true;
                    });
                }

                if (names.length > 0) {
                    names = `    - ${names.join('\n    - ')}`;
                    message += `Plug names:\n${names}\n`;
                }

                if (Object.keys(tags).length > 0) {
                    tags = Object.keys(tags);
                    tags = `    - ${tags.join('\n    - ')}`;
                    message += `Tags:\n${tags}`;
                }

                message = message.trim();

                if (message.length === 0) {
                    message = 'No plugs detected yet'
                }

                return message;
            }
        );

        this.registerCronHandler('timer', (params) => {
            this.checkGroups(params.plug, (obj) => {
                if (params.status === 'on') {
                    this.turnOn(obj, params.interfaceName, params.from);
                } else {
                    this.turnOff(obj, params.interfaceName, params.from);
                }
            });
        });
    }

    checkGroups(name, callback) {
        const promises = [];

        for (let key in this.plugs) {
            if (this.plugs[key].name === name.toLowerCase() || this.plugs[key].tags.indexOf(name.toLowerCase()) > -1) {
                promises.push(callback(this.plugs[key]));
            }
        }
        if (promises.length > 0) {
            return bluebird.all(promises).then((messages) => {
                return messages.join(`\n`);
            });
        } else {
            return `No plugs matched "${name}"`;
        }
    }

    turnOn(obj, interfaceName, from){
        return request({
            uri: `http://${obj.ip}/cgi-bin/relay.cgi?on`,
            method: `GET`,
            headers: {
                'User-Agent': 'Woodhouse Bot - https://github.com/Woodhouse/core'
            }
        }).then((res) => {
            return `${obj.name} has been turned on`;
        }).catch((e) => {
            return `${obj.name} could not be turned on: ${e.message}`;
        });
    }

    turnOff(obj, interfaceName, from) {
        return request({
            uri: `http://${obj.ip}/cgi-bin/relay.cgi?off`,
            method: `GET`,
            headers: {
                'User-Agent': 'Woodhouse Bot - https://github.com/Woodhouse/core'
            }
        }).then((res) => {
            return `${obj.name} has been turned off`;
        }).catch((e) => {
            return `${obj.name} could not be turned off: ${e.message}`;
        });
    }

    checkStatus(obj, interfaceName, from) {
        return request({
            uri: `http://${obj.ip}/cgi-bin/relay.cgi?state`,
            method: `GET`,
            headers: {
                'User-Agent': 'Woodhouse Bot - https://github.com/Woodhouse/core'
            }
        }).then((res) => {
            if (data.trim() === 'OFF') {
                return `${obj.name} is off`;
            } else if (data.trim() === 'ON') {
                return `${obj.name} is on`;
            }
        }).catch((e) => {
            return `${obj.name} could not be turned reached: ${e.message}`;
        });
    }}

module.exports = kankun;
