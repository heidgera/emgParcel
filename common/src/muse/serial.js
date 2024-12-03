'use strict';

//const { SerialPort } = require('serialport');
//const { SerialPort } = require('serialport')

obtain(['serialport'], ({SerialPort})=> {
  //var {SerialPort = window.SerialPort;
  console.log(window.SerialPort);
  DelimiterParser = window.DelimiterParser;
  exports.Serial = function (delim = '\r\n') {

    var _this = this;
    let ser = null;
    _this.isOpen = false;
    _this.onOpen = () => {};
    _this.onClose = () => {};

    _this.onMessage = () => {console.log('test');};

    _this.onPortNotFound = function (ports) {
      console.log('Port not found');
    };

    _this.write = (str)=> {
      if (_this.isOpen) ser.write(str);
    };

    _this.send = (arr) => {
      if (_this.isOpen) ser.write(Buffer.from(arr));
    };

    var openByName = (portName, baud) => {
      console.log('Opening serialport ' + portName);
      ser = new SerialPort({
        path: portName,
        baudRate: baud
      });

      /*let Pass = require('stream').PassThrough;

      let b = Pass();

      b.on('data', function (data) {
        console.log('b1:', data);
      });

      ser.pipe(b);*/
      var parser = ser.pipe(new DelimiterParser({ delimiter: delim }));

      parser.on('data', function (data) {
        _this.onMessage(data);
      });

      ser.on('open', function () {
        _this.isOpen = true;
        _this.onOpen();
      });

      ser.on('close', function () {
        _this.isOpen = false;
        console.log('port closed');
        _this.onClose();
      });

      ser.on('error', function () {
        console.log('Error from SerialPort');
      });
    };

    _this.open = (props) => {
      var name = null;
      SerialPort.list().then((ports)=> {
        ports.forEach(function (port) {
          console.log(port);
          if (port.path.includes(props.name) ||
              (port.manufacturer && props.manufacturer &&
              port.manufacturer.toLowerCase() == props.manufacturer.toLowerCase()) ||
              (port.serialNumber && port.serialNumber == props.serialNumber)
            ) name = port.path;
        });

        if (!name) _this.onPortNotFound(ports);
        else openByName(name, props.baud);
      });
    };

  };

  provide(exports);
});
