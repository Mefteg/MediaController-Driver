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

const setApplicationMenu = () => {
    const menus = [editMenuTemplate];
    if (env.name !== "production") {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

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

    // Hide the app in the Dock.
    app.dock.hide();

    // Setup tray in systray.
    const iconPath = path.join(__dirname, 'icon.png');
    TRAY = new Tray(iconPath);
    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Item1',
            type: 'radio',
            icon: iconPath
        },
        {
            label: 'Item2',
            submenu: [
                { label: 'submenu1' },
                { label: 'submenu2' }
            ]
        },
        {
            label: 'Item3',
            type: 'radio',
            checked: true
        },
        { label: 'Quit',
        accelerator: 'Command+Q',
        selector: 'terminate:',
        }
    ]);
    TRAY.setToolTip('MediaController');
    TRAY.setContextMenu(contextMenu);
});

app.on("window-all-closed", () => {
    app.quit();
});

/*******
* MAIN *
********/
Main();

function Main()
{
    //Setup();
    //Loop();
}

function Setup()
{
    PARSER = new SerialPort.parsers.Readline();
    PARSER.on('data', function(data) {
        parserOnData(data);
    });
}

function Loop()
{
    listenSerialPorts();

    setTimeout(Loop, REFRESH_RATE);
}

function listenSerialPorts() {
    if (PORT != null) {
        return;
    }

    SerialPort.list(function(error, ports) {
        if (error) {
            console.error(error);
            return;
        }

        for (var i=0; i<ports.length; ++i) {
            var port = ports[i];
            if (port.comName.indexOf(KEYWORD_COM_NAME) > -1)
            {
                plugToPort(port);
                break;
            }
        }
    });
}

function plugToPort(_portData) {
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
