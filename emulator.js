"use strict";

// TODO isolate TMS9918 from video.js
// TODO ACI emulation
// TODO experimental SID
// TODO experimental TMS9918
// TODO experimental VIA + SD card

// global helper functions
let mem_read, mem_write;

let stopped = false; // allows to stop/resume the emulation
let frames = 0;
let averageFrameTime = 0;
let end_of_frame_hook = undefined;

let options = {
   load: undefined
};

let apple1keyboard = new Apple1Keyboard();

let last_timestamp = 0;
function oneFrame(timestamp) {
   let stamp = timestamp == undefined ? last_timestamp : timestamp;
   let usec = (stamp - last_timestamp)*1000;
   last_timestamp = stamp;

   if(usec > 100000) usec = 100000;   

   apple1.exec_us(usec);

   averageFrameTime = averageFrameTime * 0.992 + usec * 0.008;

   if(!stopped) requestAnimationFrame(oneFrame);
}

function main() {

   // publish gloabally helper functions
   mem_read  = apple1.peek;
   mem_write = apple1.poke;

   // initialize the wasm machine
   apple1.init();

   parseQueryStringCommands();

   // program/rom autoload defined in autoload.js
   if(autoload !== undefined) {
      autoload.forEach((e,i)=>rom_load(i,e));
   }

   // starts drawing frames
   oneFrame();
}
