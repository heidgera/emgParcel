'use strict';

var obtains = [
  './src/dualGraph.js',
  './src/controller.js',
  'fs',
  'µ/audio.js',
  'µ/utilities.js',
  'child_process'
];

var electron = require('electron');
const { get } = require('https');

var openDialog = (method, config)=>{return electron.ipcRenderer.invoke('dialog', method, config)};

obtain(obtains, ({Graph}, { TempControl }, fs, {audio}, {averager}, execSync)=> {

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
    var smooth = new averager(10);
    var goodAve = new averager(100);

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
      max: 70,
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
      var ctx = tempTime.ctx;
      ctx.fillStyle = "#ff0000";
      for(var i=0; i<ps.length; i++){
        ctx.beginPath();
        ctx.rect(i*2, tempTime.main.height, 2, -1000*ps[i]);
        ctx.fill();
      }
      ctx.fillStyle = "#00ff00";
      for(var i=0; i<filtered.length; i++){
        ctx.beginPath();
        ctx.rect(i*2, tempTime.main.height/2, 2, -1000*filtered[i]);
        ctx.fill();
      }
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
      tempControl.emit("rawEMG",Math.max(Math.cos(osc)*30+20+Math.sin(Date.now()/200)*10+Math.cos(Date.now()/100)*5,0));
      tempControl.emit("goodSignal",1);
    },10);

    var prevMin = 0;
    var prevMax = 0;

    var vals = [261,293,329,392,440];

    tempControl.on('envelope', cnt=>{
      cnt = smooth.addSample(cnt);
      //console.log(cnt);
      tempTime.clear();
      //audio.left.changeFrequency(cnt,20);
      var bin = Math.min(4,Math.max(0,Math.floor(cnt/12)));
      // console.log(cnt);
      // console.log(vals[Math.floor(cnt/20)]);
      if(inUse){
        audio.left.unmute();
        audio.right.unmute();
        audio.left.setFrequency(vals[bin]);
        audio.right.setFrequency(vals[bin]);
      } else {
        audio.left.mute();
        audio.right.mute();
      }

      audio.left.setFrequency(vals[bin]);
      audio.right.setFrequency(vals[bin]);
      crnTmp.add({x: Date.now(), y: cnt});
      //else crnTmp.add({x: Date.now(), y: 0});
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

    var bufferSize = 512;
    const fft = new FFT(bufferSize, sampleRate);
    var emgSample = new Array(bufferSize).fill(0);
    var sampleRate = 500;

    var spikes = [];

    function getSpectralPower(signal) {
      const N = signal.length;
      // Apply windowing function (e.g., Hamming)
      const windowedSignal = applyHammingWindow(signal);
      
      fft.forward(windowedSignal);
      return(fft.spectrum);
    }
    
    function applyHammingWindow(signal) {
        const N = signal.length;
        const windowedSignal = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            windowedSignal[i] = signal[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1)));
        }
        return windowedSignal;
    }

    //var count =0;

    function getPowerAtFrequency(ps, frequency, windowSize){
      const frequencyResolution = sampleRate / ps.length;
      const index = Math.round(frequency / frequencyResolution);

      var tot = 0;
      for(var i=0; i<ps.length; i++){
        var dieoff = Math.pow(windowSize - Math.abs(index-i)/windowSize, 2);
        if(Math.abs(index-i)<windowSize) tot+=ps[i]*dieoff;
      }
    
      return tot;
    }

    function getPowerInWindow(ps, frequency, windowSize){
      const frequencyResolution = sampleRate / ps.length;
      const index = Math.round(frequency / frequencyResolution);

      var tot = 0;
      for(var i=0; i<ps.length; i++){
        if(Math.abs(index-i)<windowSize) tot+=ps[i];
      }
    
      return tot;
    }


    var count =0;
    var ps = getSpectralPower(emgSample);
    var filtered = ps.slice();

    function getStandardDeviation (array) {
      const n = array.length
      const mean = array.reduce((a, b) => a + b) / n
      return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    }

    setInterval(()=>{
      spikes.length = 0;
      ps = getSpectralPower(emgSample).slice(20);
      var totVal = ps.reduce((acc,cur)=>acc+cur);
      var ave = totVal/ps.length;

      var sigma = getStandardDeviation(ps);
      var prev = 0;
      for(let i=0; i<ps.length; i++){
        if(ps[i]-ave>sigma*3 && i){ //12 works well
          spikes.push(i);
        } 
      }

      filtered = ps.slice();

      var garbage = 0;
      var doRange = 5;//dieoff range
      var doFunc = which=>Math.pow(Math.abs(doRange - which)/doRange,1/2);
      for(let i=0; i<spikes.length; i++){
        filtered[spikes[i]] = 0;
        for(let j=1; j<doRange; j++){
          if(spikes[i]-j>=0) filtered[spikes[i]-j] -= filtered[spikes[i]-j]*doFunc(j);
          if(spikes[i]+j<ps.length-1) filtered[spikes[i]+j] -= filtered[spikes[i]+j]*doFunc(j);
        }
        garbage += getPowerAtFrequency(ps,spikes[i]*(sampleRate/ps.length),3);
      }

      let quar = 0;
      let sig = filtered.reduce((acc,cur)=>acc+cur);
      let fSigma = getStandardDeviation(filtered);

      // let gdChk = goodAve.addSample(sig);

      // console.log(`filtered sigma:${fSigma}
      //               total:${sig}
      //               goodCheck: ${gdChk}
      //               dev/ave:${filtered * fSigma / sig}
      //               prefilt sig/sig:${sigma/fSigma}`);

      tempControl.emit('envelope', 50*filtered.reduce((acc,cur)=>acc+cur));
      tempControl.emit('goodSignal', sigma/fSigma < 3);
      count = 0;
    },50);


    tempControl.on('rawEMG', cnt=>{
      //console.log(cnt);
      count++;
      emgSample.push(cnt/1024.);
      if(emgSample.length >bufferSize) emgSample.shift();
    });

    tempControl.onPortNotFound = ()=>{
      setTimeout(()=>{
        tempControl.connect();
      },5000);
    }

    tempControl.onClose = ()=>{
      tempControl.connect();
    }

    var showAttract = ()=>{
      //console.log("checking time");
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
          userTimeout = setTimeout(showAttract, 30000);
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
      } else if(e.key === "Escape"){
        //electronApp.quit();
        require('child_process').execSync('sudo systemctl stop electron');
      } else if (e.key === "~"){
        require('child_process').execSync('sudo systemctl restart electron');
      }
    };
  };

  provide(exports);
});
