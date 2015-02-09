woodhouse-plugin-kankun-plug
============================
This plugin allows you to control your Kankun KK-SP3 plugs. You can control plugs individually or in groups.

## Installation

* Clone the this repo into the plugins directory.
* If Woodhouse isn't already started, start it and skip to the last step
* If you have the shell interface enabled (enabled by default), run `load modules`, otherwise restart Woodhouse
* Go to [http://localhost:8080](http://localhost:8080), navigate to the plugin page and select the Kankun Plug plugin. Check the enabled box and click save.

## Set up of plugs

* Copy setup.tar.gz to `/tmp` on the plug (`scp`, `wget`, whatever)
* Connect to the plug via `ssh` or `telnet` (default `ssh` passwords are either `admin` or `p9z34c`)
* Navigate to `/tmp` with `cd /tmp`
* Uncompress the archive with `tar -zxf setup.tar.gz`
* Run the install script with `./install.sh`
* This will then reboot the plug
* When the plug has rebooted, go to `http://<<your plug's ip>>/cgi-bin/prefs.cgi` and add a name and a group. Click save.

## Usage

* Via command line, you can simply say `kankun on lounge lamps`
* Via chat interfaces, you can say `woodhouse kankun on lounge lamps`
