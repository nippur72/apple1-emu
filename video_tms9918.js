let tms9928_SCREEN_W = 342;
let tms9928_SCREEN_H = 262;
let tms9928_WW = 342;
let tms9928_HH = 262;
let tms9928_emulation = false;

let tms_counter = 0;
let tms9928_canvas = document.getElementById("canvas_tms9928");
let tms9928_context = tms9928_canvas.getContext('2d');
let tms9928_imagedata = tms9928_context.getImageData(0, 0, tms9928_WW*2, tms9928_HH*2);
let tms9928_imagedata_buffer = new ArrayBuffer(tms9928_imagedata.data.length);
let tms9928_imagedata_buf8 = new Uint8ClampedArray(tms9928_imagedata_buffer);
let tms9928_imagedata_data = new Uint32Array(tms9928_imagedata_buffer);

function calculateGeometry_tms9918() {
   // canvas is the outer canvas where the aspect ratio is corrected
   let tms9928_canvas = document.getElementById("canvas_tms9928");
   tms9928_canvas.width  = tms9928_SCREEN_W * 2;
   tms9928_canvas.height = tms9928_SCREEN_H * 2;

   // screen is the inner canvas that contains the emulated PAL screen
   let tms9928_screenCanvas = document.createElement("canvas_tms9928");
   tms9928_screenCanvas.width  = tms9928_SCREEN_W * 2;
   tms9928_screenCanvas.height = tms9928_SCREEN_H * 2;

   // disable TMS9928 screen
   let screen_tms9928 = document.getElementById("screen_tms9928");
   screen_tms9928.style.display = tms9928_emulation ? "block" : "none";
}

// called back by WASM at the end of each video frame
function tms9928_screen_update(ptr) {
   let start = ptr / wasm_instance.HEAPU32.BYTES_PER_ELEMENT;
   let size = tms9928_WW*tms9928_HH;
   let buffer = wasm_instance.HEAPU32.subarray(start,start+size);

   let ptr0 = 0;
   let ptr1 = 0;
   let ptr2 = tms9928_WW*2;

   for(let y=0;y<tms9928_HH;y++) {
      for(let x=0;x<tms9928_WW;x++) {
         let pixel = buffer[ptr0];
         if(x==20) pixel = 0x88C3F2A1;
         tms9928_imagedata_data[ptr1++] = pixel;
         tms9928_imagedata_data[ptr1++] = pixel;
         tms9928_imagedata_data[ptr2++] = pixel;
         tms9928_imagedata_data[ptr2++] = pixel;
         ptr0++;
      }
      ptr1 += tms9928_WW*2;
      ptr2 += tms9928_WW*2;
   }

   tms9928_imagedata.data.set(tms9928_imagedata_buf8);
   tms9928_context.putImageData(tms9928_imagedata, 0, 0);

   frames++;
   if(end_of_frame_hook !== undefined) end_of_frame_hook();

   tms_counter++;
   if(tms_counter % 64 == 0) console.log("tms");
}
