// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import { app, Menu, Tray } from "electron";
import { devMenuTemplate } from "./menu/dev_menu_template";
import { editMenuTemplate } from "./menu/edit_menu_template";

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

var SerialPort = require('serialport');
var robotjs = require('robotjs');

const BAUDRATE = 9600;
const KEYWORD_COM_NAME = 'usbserial';
const KEYWORD_PLAY = 'PLAY';
const KEYWORD_PREVIOUS = 'PREVIOUS';
const KEYWORD_NEXT = 'NEXT';

const REFRESH_RATE = 5000; // Every 5 seconds.

var WINDOW = null;
var TRAY = null;

var PORT = null;
var PARSER = null;

/*******
* MAIN *
********/
Main();

function Main()
{
    Setup();
    Loop();
}

/***************
* Setup & Loop *
***************/

function Setup()
{
    PARSER = new SerialPort.parsers.Readline();
    PARSER.on('data', function(data) {
        parserOnData(data);
    });

    // Save userData in separate folders for each environment.
    // Thanks to this you can use production and development versions of the app
    // on same machine like those are two separate apps.
    if (env.name !== "production") {
        const userDataPath = app.getPath("userData");
        app.setPath("userData", `${userDataPath} (${env.name})`);
    }

    app.on("ready", () => {
        //setApplicationMenu();

        // Only allow single instance.
        const isSecondInstance = app.makeSingleInstance(function() {});
        if (isSecondInstance == true)
        {
            console.log("No second instance allowed.");
            app.quit();
        }

        if (process.platform === 'darwin') {
            // Hide the app in the Dock.
            app.dock.hide();
        }

        // Setup tray in systray.
        const iconPath = path.join(__dirname, 'icon.png');
        TRAY = new Tray(iconPath);
        TRAY.setToolTip('MediaController');
        CreateMenu({});

        // List serial ports.
        ListSerialPorts();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
}

function Loop()
{
    // Do nothing (for now).

    setTimeout(Loop, REFRESH_RATE);
}

/*****
* UI *
*****/

function setApplicationMenu()
{
    const menus = [editMenuTemplate];
    if (env.name !== "production") {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
}

function CreateMenu(_data)
{
    if (TRAY == null)
    {
        return;
    }

    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Refresh',
            click() { ListSerialPorts(); }
        },
        {
            label: 'Devices',
            submenu: CreateMenuDeviceList(_data.ports)
        },
        { type: 'separator' },
        { role: 'quit' }
    ]);

    TRAY.setContextMenu(contextMenu);
}

function CreateMenuDeviceList(_ports)
{
    if (_ports == null || _ports.length == 0)
    {
        return [{ label: 'Nothing'}];
    }

    var list = [];
    for (var i=0; i<_ports.length; ++i)
    {
        let port = _ports[i];
        list.push({
            label: port.comName,
            type: 'checkbox',
            checked: PORT != null && port.comName == PORT.comName,
            click() { PlugToPort(port); }
        });
    }

    return list;
}

/**************
* Serial Port *
**************/

function ListSerialPorts() {
    SerialPort.list(function(error, ports) {
        if (error) {
            console.error(error);
            return;
        }

        console.log(ports);
        CreateMenu({ports: ports});

        /*for (var i=0; i<ports.length; ++i) {
            var port = ports[i];
            if (port.comName.indexOf(KEYWORD_COM_NAME) > -1)
            {
                PlugToPort(port);
                break;
            }
        }*/
    });
}

function PlugToPort(_portData) {
    if (PORT != null)
    {
        PORT.close();
    }

    var port = new SerialPort(_portData.comName, {
        baudRate: BAUDRATE
    });

    port.on('error', function(error) {
        portOnError(error);
    });

    port.on('open', function() {
        portOnOpen(port);
    });

    port.on('disconnect', function() {
        portOnDisconnect();
    });
}

function portOnError(_error) {
    console.error(_error);
}

function portOnOpen(_port) {
    PORT = _port;
    PORT.pipe(PARSER);
    console.log(PORT.path + " : Open!");
}

function portOnDisconnect(_port) {
    console.log(PORT.path + " : Disconnect.");
    PORT = null;
}

function parserOnData(_data) {
    if (_data.indexOf(KEYWORD_PLAY) > -1) {
        robotjs.keyTap('audio_play');
    }
    else if (_data.indexOf(KEYWORD_PREVIOUS) > -1) {
        robotjs.keyTap('audio_prev');
    }
    else if (_data.indexOf(KEYWORD_NEXT) > -1) {
        robotjs.keyTap('audio_next');
    }
}
