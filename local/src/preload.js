
// const { contextBridge } = require('electron');
//
const path = require('path');

// console.log(contextBridge);
const SerialPort = require('serialport');
const { DelimiterParser} = require('@serialport/parser-delimiter');

global.config = require(path.resolve(`${__dirname}/../../config/app.js`));
window.config = global.config;

var {app} = require('electron');

window.electronApp = app;

SerialPort.SerialPort.list().then((ports)=>{
  console.log(ports);
});

// contextBridge.exposeInMainWorld('remote', {
//   config: global.config,
//   serialport: SerialPort,
//   Buffer: Buffer,
//   DelimiterParser: DelimiterParser
// });

window.serialport = SerialPort;
window.DelimiterParser = DelimiterParser;
