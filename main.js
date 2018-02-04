"use strict";

var SerialPort = require('serialport');
var robotjs = require('robotjs');

const BAUDRATE = 9600;
const KEYWORD_COM_NAME = 'usbserial';
const KEYWORD_PLAY = 'PLAY';
const KEYWORD_PREVIOUS = 'PREVIOUS';
const KEYWORD_NEXT = 'NEXT';

var PORT = null;
var PARSER = null;

// Start
Main();

function Main()
{
    Setup();
    Loop();
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

    setTimeout(Loop, 1000);
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

        console.log(ports);

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
