let tms9928_SCREEN_W = 342;
let tms9928_SCREEN_H = 262;
let tms9928_CANVAS_W = 342;
let tms9928_CANVAS_H = 262;

let tms_counter = 0;
let tms9928_canvas = document.getElementById("canvas_tms9928");
let tms9928_context = tms9928_canvas.getContext('2d');
let tms9928_imagedata = tms9928_context.createImageData(tms9928_SCREEN_W*2, tms9928_SCREEN_H*2);
let tms9928_imagedata_data = new Uint32Array(tms9928_imagedata.data.buffer);

function calculateGeometry_tms9928() {
   // canvas is the outer canvas where the aspect ratio is corrected
   let tms9928_canvas = document.getElementById("canvas_tms9928");
   tms9928_canvas.width  = tms9928_CANVAS_W * 2;
   tms9928_canvas.height = tms9928_CANVAS_H * 2;

   // disable TMS9928 screen
   let screen = document.getElementById("screen_tms9928");
   screen.style.display = visible_screen == "tms9928" ? "block" : "none";
}

// called back by WASM at the end of each video frame
function tms9928_screen_update(ptr) {
   let start = ptr / wasm_instance.HEAPU32.BYTES_PER_ELEMENT;
   let size = tms9928_SCREEN_W*tms9928_SCREEN_H;
   let buffer = wasm_instance.HEAPU32.subarray(start,start+size);

   let ptr0 = 0;
   let ptr1 = 0;
   let ptr2 = tms9928_SCREEN_W*2;

   for(let y=0;y<tms9928_SCREEN_H;y++) {
      for(let x=0;x<tms9928_SCREEN_W;x++) {
         let pixel = buffer[ptr0];
         if(x==20) pixel = 0x88C3F2A1;
         tms9928_imagedata_data[ptr1++] = pixel;
         tms9928_imagedata_data[ptr1++] = pixel;
         tms9928_imagedata_data[ptr2++] = pixel;
         tms9928_imagedata_data[ptr2++] = pixel;
         ptr0++;
      }
      ptr1 += tms9928_SCREEN_W*2;
      ptr2 += tms9928_SCREEN_W*2;
   }

   tms9928_context.putImageData(tms9928_imagedata, 0, 0);

   tms_counter++;
   if(tms_counter % 64 == 0) console.log("tms");
}
