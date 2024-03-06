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

///////////////////////////////////////////////////
// Temperature Tracking vs Time

    var tempTime = µ('#tempTime');

    //create Traces for current and commanded temperatures
    var crnTmp = tempTime.addTrace('#F00');
    var cmdTmp = tempTime.addTrace('#00F');
    var redTrace = tempTime.addTrace('#0F0');

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
    var graphTime = 20000;
    var reportFreq = 100;

    //
    crnTmp.limits.size = 60 * reportFreq;
    cmdTmp.limits.size = 60 * reportFreq;

    //set graphing ranges for the temperature traces
    crnTmp.setRanges({y: {
      min: 0,
      max: 60,
    }});
    cmdTmp.setRanges({y: {
      min: 0,
      max: 60,
    }});


    //make it so the dropdown in the topbar controls the timespan on the graph
    µ('#timeRange').onchange = (e)=>{
      console.log(e.target.value);
      graphTime = parseInt(e.target.value);
    }

    //invert the y axis for graphing, and set the traceWidth
    tempTime.params.y.flip = true;
    tempTime.traceWidth = 2;
    tempTime.gridColor = "rgba(0,0,0,0)";

    var info = µ('.floater')[0];
    var main = tempTime.main;

    µ('body')[0].addEventListener('mousemove',(e)=>{
      if(e.target == tempTime){
        var scaledX = (e.offsetX) / main.clientWidth;
        let crn = crnTmp.scaled;
        let search = crn.length - 1;
        while (crn.length && crn[search].x < scaledX && search > 0) search--;
        if(search < crn.length -1){
          info.style.display = 'block';
          info.style.bottom = (window.innerHeight - e.clientY + 10)+'px';
          info.style.left = `calc(${e.clientX}px - 3.5em)`;
          var time = new Date(crnTmp[search].x);
          var set = cmdTmp.find(pt=>pt.x == crnTmp[search].x);
          µ('#grTm').textContent = time.toLocaleTimeString('en-GB');
          µ('#actual').textContent = Math.round(crnTmp[search].y*100)/100;
          µ('#intended').textContent = Math.round(set.y*100)/100;
        } else {
          info.style.display = 'none';
        }
      } else {
        info.style.display = 'none';
      }
    });

    tempTime.customFGDraw = ()=>{
      // var ctx = tempTime.ctx;
      //
      // var wid = tempTime.main.width;
      // var hgt = tempTime.main.height;
      //
      // ctx.fillStyle = "#000";
      // ctx.font = "15px monospace";
      // ctx.textAlign = "center";
      //
      // var minutes = graphTime / 60000;
      // var divTime = minutes / tempTime.params.x.divs;
      //
      // for (var i = 1; i <= tempTime.params.x.divs - 1; i++) {
      //   ctx.fillText(Math.round((minutes-i*divTime)*10)/10, i * wid / tempTime.params.x.divs, hgt - 10);
      // }
      //
      // ctx.font = "15px Verdana";
      // ctx.fillText("Time (minutes)", wid/2, hgt - 30)
      //
      // ctx.font = "15px monospace";
      //
      // var maxTemp = cmdTmp.limits.y.max;
      // var minTemp = cmdTmp.limits.y.min;
      // var tempDiv = (maxTemp - minTemp) / tempTime.params.y.divs;
      // for (var i = 1; i <= tempTime.params.y.divs - 1; i++) {
      //   ctx.fillText(Math.round(maxTemp-i*tempDiv), wid - 30, i * hgt / tempTime.params.y.divs + 5);
      // }
      //
      // ctx.font = "15px Verdana";
      // ctx.fillText("Temp (°C)", wid - 50, 20)
    }

    setTimeout(()=>{tempTime.draw(),console.log("drawing")},500);

// // Once the controller is ready, enable some controls, start the temperature monitoring
// µ('input').forEach(item => item.disabled = false);
// µ('input[name="mode"]').forEach(item => {
//     µ(`.ctrol.${item.id} div input`).forEach(ip => ip.disabled = !item.checked);
// });
//
// µ('.ctrol.auto .go')[0].onclick = ()=>{
//   //tempControl.preheat();
//   var content = "TIME,IR_COUNTS,TEMP,RED_COUNTS\n";
//   for(let i=0; i<crnTmp.length; i++){
//     content+=`${crnTmp.x},${crnTmp.y},${cmdTmp.y},${redTrace.y}\n`
//   }
//   console.log(filePath.value+baseName.value);
//   fs.writeFile(filePath.value+'/'+baseName.value, content, err => {
//     if (err) {
//       console.error(err);
//     } else {
//       // file written successfully
//       console.log('success');
//     }
//   });
// }
//
// SetPath.onclick = ()=>{
//   openDialog('showOpenDialog',{
//     title: 'Select the File Path to save',
//     defaultPath: filePath.value,
//     buttonLabel: 'Set Filepath',
//     properties:["openDirectory"]
//   }).then(path => {
//     console.log(path);
//     if(!path.canceled){
//       filePath.value = path.filePaths.toString();
//     }
//
//   }).catch(err => {
//       console.log(err)
//   });
// }

    tempControl.onready = ()=>{
      // µ('#notes').textContent = 'Controller Ready';
      //
      // µ('input').forEach(item => item.disabled = false);
      // µ('input[name="mode"]').forEach(item => {
      //     µ(`.ctrol.${item.id} div input`).forEach(ip => ip.disabled = !item.checked);
      // });

      tempControl.on('note', msg=>{
        µ('#notes').textContent = msg;
      })

      tempControl.on('setpointChanged',(temp)=>{
        if(parseFloat(temp)) µ('#cmd').textContent =  Math.round(temp * 100)/100;
        else µ('#cmd').textContent = temp;
      })

      var prevMin = 0;
      var prevMax = 0;

      var vals = [261,293,329,392,440];

      tempControl.on('envelope', cnt=>{
        cnt = cnt;
        tempTime.clear();
        //audio.left.changeFrequency(cnt,20);
        var bin = Math.min(4,Math.max(0,Math.floor(cnt/20)));
        console.log(cnt);
        console.log(vals[Math.floor(cnt/20)]);
        audio.left.setFrequency(vals[bin]);
        audio.right.setFrequency(vals[bin]/2);
        crnTmp.add({x: Date.now(), y: cnt});
        //else if(cnt != crnTmp[0].y) crnTmp[0].x = Date.now();
        let recent = crnTmp.filter(val=>val.x>Date.now()-graphTime);
        let min = recent.reduce((acc,val)=>Math.min(acc,val.y),1000000);
        let max = recent.reduce((acc,val)=>Math.max(acc,val.y),0);
        crnTmp.setRanges({x:{
          min: Date.now() - graphTime,
          max: Date.now(),
        },
        y:{
          min: 0,
          max: 100,
        }});
        tempTime.draw();
      });

      tempControl.on('redCount', cnt=>{
        tempTime.clear();
        redTrace.add({x: Date.now(), y: cnt});
        let recent = redTrace.filter(val=>val.x>Date.now()-graphTime);
        let min = recent.reduce((acc,val)=>Math.min(acc,val.y),1000000);
        let max = recent.reduce((acc,val)=>Math.max(acc,val.y),0);
        redTrace.setRanges({x:{
          min: Date.now() - graphTime,
          max: Date.now(),
        },
        y:{
          min: min-(max-min)/4,
          max: max+(max-min)/4,
        }});
        tempTime.draw();
      });

      tempControl.on('temp', tmp=>{
        tempTime.clear();
        cmdTmp.add({x: Date.now(), y: tmp});
        cmdTmp.setRanges({x:{
          min: Date.now() - graphTime,
          max: Date.now(),
        }});
        µ('#current').textContent =  Math.round(tmp * 100)/100;
        //tempTime.draw();
      });

      /*tempControl.scheduleReport((temp)=>{
        crnTmp.add({x: Date.now(), y: temp});
        if(tempControl.setpoint != null) cmdTmp.add({x: Date.now(), y: tempControl.setpoint});
        tempTime.clear();
        crnTmp.setRanges({x:{
          min: Date.now() - graphTime,
          max: Date.now(),
        }});

        cmdTmp.setRanges({x:{
          min: Date.now() - graphTime,
          max: Date.now(),
        }});

        tempTime.draw();

        µ('#current').textContent =  Math.round(temp * 100)/100;
      }, reportFreq);*/


      // µ('#file').onchange = (e)=>{
      //   if(e.target.files.length){
      //     const reader = new FileReader();
      //     reader.addEventListener('load', (event) => {
      //       var lines = event.target.result.split('\n').map(item => item.split(',')).filter(pt=>Date.parse(pt[1]));
      //       lines.forEach((item, i) => {
      //         item[1] = Date.parse(item[1]);
      //       });
      //
      //       µ('#notes').textContent = 'File Loaded. Press start to continue.';
      //       tempControl.loadData(lines);
      //     });
      //     reader.readAsText(e.target.files[0]);
      //     µ('#notes').textContent = 'Loading file.';
      //   }
      // }

      // µ('.ctrol.manual .go')[0].onclick = ()=>{
      //   console.log("setting");
      //   tempControl.set(parseFloat(µ('#manCmd').value));
      // }

      // µ('.ctrol.manual .stop')[0].onclick = ()=>{
      //   tempControl.disable();
      //   //µ('#cmd').textContent =  'NONE';
      //   µ('#notes').textContent = 'Temperature control stopped.';
      // }



      // µ('.ctrol.auto .stop')[0].onclick = ()=>{
      //   tempControl.stop();
      // }
    }

    document.onkeypress = (e)=> {

    };
  };

  provide(exports);
});
