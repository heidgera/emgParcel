'use strict';

var obtains = [
  './src/dualGraph.js',
  './src/controller.js',
  'fs',
  'µ/audio.js'
];

var electron = require('electron');

//console.log(electron);

var openDialog = (method, config)=>{return electron.ipcRenderer.invoke('dialog', method, config)};

obtain(obtains, ({Graph}, { TempControl }, fs, {audio})=> {

  exports.app = {};

  console.log("starting");

  var config = window.config;

  exports.app.start = ()=> {

    console.log('started');

    var mouse = {x:0, y:0};

    var fps = 50;
    var inUse = false;
    var userTimeout = 0;
    var goodSignal = 0;
    var lastGood = 0;

///////////////////////////////////////////////////
// Temperature Tracking vs Time

    var tempTime = µ('#tempTime');

    //create Traces for current and commanded temperatures
    var crnTmp = tempTime.addTrace('#FF5F1B');
    tempTime.traceWidth = 8;

    //create the controller object
    console.log(config);
    var tempControl = new TempControl(config.io);

    //start the program with the controls disabled
    // µ('input').forEach(item => item.disabled = true);
    //
    // //make the radio buttons toggle which controls are active
    // µ('input[name="mode"]').forEach(item => {
    //   item.onchange = ()=>{
    //     µ(`.ctrol div input`).forEach(ip => ip.disabled = true);
    //     µ(`.ctrol.${item.id} div input`).forEach(ip => ip.disabled = false);
    //
    //   }
    // });
    //
    // var note = (msg)=>{
    //   µ('#notes').textContent = msg;
    // }

    // set warning flags for if the device isn't connected.
    // tempControl.onPortNotFound = ()=>{
    //   note('Please connect the apparatus.');
    // }
    //
    // if(tempControl.portNotFound) note('Please connect the apparatus.');

    //initial settings for the temperature graph
    var graphTime = 10000;
    var reportFreq = 100;

    //
    crnTmp.limits.size = 60 * reportFreq;

    //set graphing ranges for the temperature traces
    crnTmp.setRanges({y: {
      min: -5,
      max: 55,
    }});


    // //make it so the dropdown in the topbar controls the timespan on the graph
    // µ('#timeRange').onchange = (e)=>{
    //   console.log(e.target.value);
    //   graphTime = parseInt(e.target.value);
    // }

    //invert the y axis for graphing, and set the traceWidth
    tempTime.params.y.flip = true;
    tempTime.gridColor = "rgba(0,0,0,0)";

    var info = µ('.floater')[0];
    var main = tempTime.main;

    tempTime.customFGDraw = ()=>{
    }

    var subDivs = 10;


    tempTime.customBGDraw = ()=>{
      var divsPerSec = 5;
      var secDiv = graphTime/1000;
      var divs = divsPerSec*secDiv;
      var ctx = tempTime.ctx;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#005875";

      var wid = tempTime.main.width;
      var hgt = tempTime.main.height;

      var bigDiv = (graphTime/secDiv);
      var xOff = (Date.now()%bigDiv)/bigDiv * wid/secDiv;
      var spc = wid/divs;

      var totalRange = crnTmp.limits.y.max-crnTmp.limits.y.min;
      var pixPerRange = hgt/totalRange;
      var pixToZero = pixPerRange*crnTmp.limits.y.max;
      var yOff = pixToZero % spc;

      for (var i = 0; i <= graphTime/1000; i++) {
        ctx.lineWidth = 1;
        for (var j = 0; j <= divsPerSec; j++) {
          ctx.beginPath();
          ctx.moveTo(i*divsPerSec*spc +j * spc-xOff, 0);
          ctx.lineTo(i*divsPerSec*spc + j * spc-xOff, hgt);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(i*divsPerSec*spc-xOff, pixToZero-spc/2);
        ctx.lineTo(i*divsPerSec*spc-xOff, pixToZero+spc/2);
        ctx.closePath();
        ctx.stroke();
      }



      for (var i = 0; i <= divs; i++) {
        ctx.beginPath();
        if(Math.abs((i)*spc-pixToZero) <= spc/2) ctx.lineWidth = 5;
        else ctx.lineWidth = 1;
        ctx.moveTo(0, i * spc + yOff);
        ctx.lineTo(wid, i * spc + yOff);
        ctx.closePath();
        ctx.stroke();
      }
    }

    setTimeout(()=>{tempTime.draw(),console.log("drawing")},500);

    var testInt = setInterval(()=>{
      var osc = (Date.now()/4000.)*Math.PI;
      tempControl.emit("envelope",Math.max(Math.cos(osc)*30+20+Math.sin(Date.now()/200)*10+Math.cos(Date.now()/100)*5,0));
    },20);

    var prevMin = 0;
    var prevMax = 0;

    var vals = [261,293,329,392,440];

    tempControl.on('envelope', cnt=>{
      cnt = cnt;
      tempTime.clear();
      //audio.left.changeFrequency(cnt,20);
      var bin = Math.min(4,Math.max(0,Math.floor(cnt/10)));
      // console.log(cnt);
      // console.log(vals[Math.floor(cnt/20)]);
      if(cnt && inUse && goodSignal){
        audio.left.unmute();
        audio.right.unmute();
        audio.left.setFrequency(vals[bin]);
        audio.right.setFrequency(vals[bin]/2);
      } else {
        audio.left.mute();
        audio.right.mute();
      }

      audio.left.setFrequency(vals[bin]);
      audio.right.setFrequency(vals[bin]/2);
      if(goodSignal) crnTmp.add({x: Date.now(), y: cnt});
      else crnTmp.add({x: Date.now(), y: 0});
      //else if(cnt != crnTmp[0].y) crnTmp[0].x = Date.now();
      let recent = crnTmp.filter(val=>val.x>Date.now()-graphTime);
      let min = recent.reduce((acc,val)=>Math.min(acc,val.y),1000000);
      let max = recent.reduce((acc,val)=>Math.max(acc,val.y),0);
      crnTmp.setRanges({x:{
        min: Date.now() - graphTime,
        max: Date.now(),
      }});
      tempTime.draw();
    });


    var showAttract = ()=>{
      console.log("checking time");
      if(lastGood + 10000 > Date.now()) userTimeout = setTimeout(showAttract, 10000 - (Date.now()-lastGood));
      else {
        inUse = false;
        Attract.classList.add('show');
      }
    }

    tempControl.on('goodSignal', good=>{
      goodSignal = good;
      if(good) lastGood = Date.now();
    });

    tempControl.onready = ()=>{
      console.log("Clear");
      clearInterval(testInt);
    }

    var countdown = (which)=>{
      µ(".count",Wait)[which].classList.add('flip');
      setTimeout(()=>{
        µ(".count",Wait)[which].classList.remove('flip');
      }, 10);

      setTimeout(()=>{
        if(which<2) countdown(which+1);
        else {
          Wait.classList.remove('show');
          userTimeout = setTimeout(showAttract, 10000);
        }
      }, 1000);
    }

    document.onkeydown = (e)=> {
      if(e.key == ' ' && !inUse){
        inUse = true;
        Attract.classList.remove('show');
        setTimeout(()=>{
          Wait.classList.add('show');
          µ(".count",Wait)[0].classList.add('flip');
          setTimeout(()=>{
            countdown(0);
          },500);
        },500);
      }
    };
  };

  provide(exports);
});
