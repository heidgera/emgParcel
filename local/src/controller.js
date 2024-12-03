obtain(['µ/serialParser.js', 'µ/events.js', 'µ/utilities.js'], ({ serialParser }, {Emitter}, utils)=> {
  const TEMP_REPORT = 1;
  const ENVELOPE = 2;
  const EMG_RAW = 3;
  const SIGGOOD = 4;
  const TEMP = 5;
  const IR_COUNT = 6;
  const RED_COUNT = 7;
  const READY = 127;

  class TempControl extends Emitter{
    constructor(conf) {
      super();
      var _this = this;
      var parser = new serialParser();

      var resistance = 250;
      var scale = 1024/5.;
      var minVal = .004 * resistance * scale;
      var maxVal = .02 * resistance * scale;

      var currentTemp = 25;
      var commandedTemp = null;
      var initialTemp = 25;

      var dataset = null;

      var preheating = false;
      var dataTO = null;
      var midTO = null;

      Object.defineProperty(this, 'temperature', { get: ()=>currentTemp });
      Object.defineProperty(this, 'setpoint', {
        get: ()=>commandedTemp,
       });

      _this.config = {
        units: 'c',
        scale: 1024/5.,
      };

      _this.loadData = (data)=>{
        dataset = data;
      }

      _this.preheat = ()=>{
        if(dataset){
          initialTemp = dataset[0][2];
          preheating = true;
          _this.set(initialTemp);
          _this.emit('note','Adjusting to initial temperature.');
        } else {
          _this.emit('note','Load dataset first.');
        }
      }

      _this.run = (index = 0)=>{
        if(dataset != null){
          _this.set(parseFloat(dataset[index][2]));
          if(index < dataset.length - 1){
            midTO = setTimeout(()=>{
              _this.set((parseFloat(dataset[index][2]) + parseFloat(dataset[index + 1][2]))/2);
            }, (dataset[index + 1][1] - dataset[index][1])/2);
            dataTO = setTimeout(()=>{
              _this.run(index + 1);
            }, (dataset[index + 1][1] - dataset[index][1]));
          } else _this.emit('complete',1);
        }
      }

      _this.stop = ()=>{
        clearTimeout(dataTO);
        clearTimeout(midTO);
        _this.disable();
      }

      // parser.on(SET_TEMP, (data)=> {
      //   //acknowledge
      //   console.log('set temperature');
      //   //_this.emit('digitalRead', data[0], data[1]);
      // });

      parser.on(TEMP, (data)=> {
        var raw =  (data[0] << 14)+(data[1] << 7) + data[2];
        //console.log(raw/100);
        _this.emit('temp', raw/100);
      });

      parser.on(ENVELOPE, (data)=> {
        var raw =  data[0];
        //console.log(raw);
        _this.emit('envelope', raw);
      });

      parser.on(SIGGOOD, (data)=> {
        var raw =  data[0];
        //console.log(raw);
        _this.emit('goodSignal', raw);
      });

      parser.on(RED_COUNT, (data)=> {
        var raw =  (data[0] << 14)+(data[1] << 7) + data[2];
        //console.log(raw);
        _this.emit('redCount', raw);
      });

      // parser.on(TEMP_READ, (data)=> {
      //   var raw =  (data[0] << 7) + data[1];
      //   var temp = utils.map(raw, minVal, maxVal, -50, 150);
      //   if(_this.config.units == 'f') temp = 32 + 9 * temp / 5;
      //   _this.emit('data', temp);
      //   currentTemp = temp;
      //   if(preheating && Math.abs(initialTemp - temp) < .5){
      //     preheating = false;
      //     _this.emit('preheated', temp);
      //   }
      // });

      var readyInt;

      parser.on(READY, ()=> {
        console.log("Got the ready signal");
        if (!_this.ready) {
          console.log('Controller ready');
          clearInterval(readyInt);
          _this.ready = true;
          _this.emit('ready');
        }
      });

      _this.setUnits = (unit)=>{
        if(unit == 'c' || unit == 'f'){
          _this.config.units = unit;
        }
      }

      _this.set = (temp)=> {
        if(_this.config.units == 'f') temp = 5 * (temp - 32) / 9;
        console.log(temp);
        if(temp > -50 && temp < 150){
          var raw = Math.floor(utils.map(temp, -50, 150, minVal, maxVal));
          console.log(raw);
          parser.sendPacket([1, SET_TEMP, (raw >> 7) & 127, raw & 127]);
          commandedTemp = temp;
          _this.emit('setpointChanged', temp);
        } else {
          _this.emit('error', {code: 1, details:'Temperature out of bounds of apparatus'});
        }
      };

      _this.read = ()=>{
        parser.sendPacket([1, TEMP_READ]);
      }

      _this.disable = ()=>{
        parser.sendPacket([1, DISABLE]);
        commandedTemp = null;
        _this.emit('setpointChanged','NONE');
      }

      _this.scheduleReport = (cb, interval)=> {
        _this.on('data', cb);

        _this.whenReady(()=> {
          parser.sendPacket([1, TEMP_REPORT, (interval >> 7) & 127, interval & 127]);
        });

      };

      _this.customData = (dataArray)=> {
        parser.sendPacket(dataArray);
      };

      _this.whenReady = (cb)=> {
        if (_this.ready) {
          cb();
        } else {
          this.on('ready', cb);
        }
      };

      _this.on('preheated',()=>{
        _this.run();
        _this.emit('note','Dataset running.');
      });

      parser.onOpen = ()=> {
        parser.sendPacket([127, READY]);
      };

      _this.onClose = ()=>{};

      parser.onClose = ()=> {
        setTimeout(()=>{
          _this.onClose();
        },2000);
      };

      _this.onPortNotFound = ()=>{};

      _this.portNotFound = false;

      parser.serial.onPortNotFound = ()=>{
        _this.portNotFound = true;
        _this.onPortNotFound();
      }

      _this.connect = ()=>{
        if (conf.name) parser.setup({ name: conf.name, baud: 115200 });
        else if (conf.manufacturer) parser.setup({ manufacturer: conf.manufacturer, baud: 115200 });
      }

      _this.connect();

    }

    set onready(cb) {
      //this.on_load = val;
      if (this.ready) {
        cb();
      } else {
        this.on('ready', cb);
      }
    }
  };

  exports.TempControl = TempControl;
  console.log('finished controller');
  provide(exports);
});
