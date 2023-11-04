import { saveAs } from "file-saver";
import { encode } from "wav-encoder";

interface ProbeData {
   ticks:  number;
   DIN:    number;
   CLKIN:  number;
   DOUT:   number;
   CLKOUT: number;
   ATNOUT: number;
}
 
let probe_data: ProbeData[] = [];

const record_probe = false;
 
export function probe(ticks: number, DIN: number, CLKIN: number, DOUT: number, CLKOUT: number, ATNOUT: number) {
   if(record_probe) {
      probe_data.push( {ticks, DIN, CLKIN, DOUT, CLKOUT, ATNOUT} );
   }
}
 
export function probe_off() {
   probe_data.push({
      ticks: probe_data[probe_data.length - 1].ticks+1,
      DIN:    0,
      CLKIN:  0,
      DOUT:   0,
      CLKOUT: 0,
      ATNOUT: 0,   
   }); 

   let ch = data_to_wav(probe_data);
   save_wav(ch);
}

function sample(n: number) {
   if(n==0) return 0 + Math.random() * 0.05;
   else return 0.75 + Math.random() * 0.05;
}

interface Channels {
   DIN:    number[],
   CLKIN:  number[],
   DOUT:   number[],
   CLKOUT: number[],
   ATNOUT: number[],
}

function data_to_wav(probe_data:ProbeData[]) {
   let channels:Channels = {
      DIN:    [],
      CLKIN:  [],
      DOUT:   [],
      CLKOUT: [],
      ATNOUT: [],
   } 
   
   for(let t=0;t<probe_data.length-1;t++) {      
      let curr_tick = probe_data[t+1].ticks-1;
      let last_tick = probe_data[t].ticks
      let nticks = curr_tick - last_tick;
      let e = probe_data[t];      
      for(let t=0; t<=nticks; t++) {
         channels.DIN   .push( sample(e.DIN   ) );
         channels.CLKIN .push( sample(e.CLKIN ) );
         channels.DOUT  .push( sample(e.DOUT  ) );
         channels.CLKOUT.push( sample(e.CLKOUT) );
         channels.ATNOUT.push( sample(e.ATNOUT) );
      }      
   };  

   return channels; 
}

function save_wav(channels:Channels) {
   const wavData = {
      sampleRate: 1000000,
      channelData: [ 
         new Float32Array(channels.ATNOUT),
         new Float32Array(channels.CLKOUT),
         new Float32Array(channels.DIN   ),
         new Float32Array(channels.CLKIN ),
         new Float32Array(channels.DOUT  ),
      ]
   };
   
   const buffer = encode.sync(wavData, { bitDepth: 16, float: false, symmetric: false});      

   let blob = new Blob([buffer], {type: "application/octet-stream"});   
   const fileName = "signals.wav";
   saveAs(blob, fileName);
}
