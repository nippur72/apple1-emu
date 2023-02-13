import { fetchProgram, goFullScreen, onResize, parseQueryStringCommands } from "./browser";
import { apple1 } from "./emscripten_wrapper";
import { paste } from "./paste";
import { calculateGeometry } from "./video";

// TODO ACI emulation
// TODO experimental SID
// TODO display fast speed

let stopped = false; // allows to stop/resume the emulation
let averageFrameTime = 0;

let last_timestamp = 0;
function oneFrame(timestamp: number | undefined) {
   let stamp = timestamp == undefined ? last_timestamp : timestamp;
   let usec = (stamp - last_timestamp)*1000;
   last_timestamp = stamp;

   if(usec > 100000) usec = 100000;   

   apple1.exec_us(usec);

   averageFrameTime = averageFrameTime * 0.992 + usec * 0.008;

   if(!stopped) requestAnimationFrame(oneFrame);
}

export function emulator_main() {

   // publish gloabally helper functions
   // mem_read  = apple1.peek;
   // mem_write = apple1.poke;

   // initialize the wasm machine
   apple1.init();

   parseQueryStringCommands();

   // program/rom autoload defined in autoload.js
   // if(autoload !== undefined) {
   //    autoload.forEach((e,i)=>rom_load(i,e));
   // }

   // load sdcard emulation software
   fetchProgram("sdcard.prg").then(()=>setTimeout(()=>paste("8000R\r"), 2500));

   window.addEventListener("resize", onResize);
   window.addEventListener("dblclick", goFullScreen);

   onResize();
   calculateGeometry();

   // starts drawing frames
   oneFrame(undefined);
}

