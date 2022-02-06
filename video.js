
let aspect = 1.5;

// good values for CRT PAL
let SCREEN_W = 320;
let SCREEN_H = 192;

function calculateGeometry() {
   calculateGeometry_apple1();
   calculateGeometry_tms9918();
}

function calculateGeometry_apple1() {
   // canvas is the outer canvas where the aspect ratio is corrected
   let canvas = document.getElementById("canvas");
   canvas.width  = SCREEN_W * 2;
   canvas.height = SCREEN_H * 2;
}

/**************************************************/

let apple1_canvas = document.getElementById("canvas");
let apple1_context = apple1_canvas.getContext('2d');
let apple1_imagedata = apple1_context.createImageData(SCREEN_W*2, SCREEN_H*2);
let imagedata_data = new Uint32Array(apple1_imagedata.data.buffer);

function apple1_screen_update(cursor_on) {
   // console.log("apple1 display");

   let ptr0 = 0;
   let ptr1 = 0;
   let ptr2 = SCREEN_W*2;

   let old_char = display[cursor_y*40+cursor_x];
   if(cursor_on) display[cursor_y*40+cursor_x] = 0; // '@'

   for(let row=0;row<24;row++) {
      for(let y=0;y<8;y++) {
         for(let col=0;col<40;col++) {
            let ch = display[row*40+col] & 63;
            let line = charset[ch*8 + y];
            for(let x=7;x>=0;x--) {
               let pixel = line & (1 << x) ? 0xffffffff : 0xff000000 ;                  
               imagedata_data[ptr1++] = pixel;
               imagedata_data[ptr1++] = pixel;
               imagedata_data[ptr2++] = pixel;
               imagedata_data[ptr2++] = pixel;
               ptr0++;
            }
         }
         ptr1 += SCREEN_W*2;
         ptr2 += SCREEN_W*2;
      }
   }

   // restore character under cursor
   display[cursor_y*40+cursor_x] = old_char;

   // m6561_imagedata.data.set(imagedata_buf8);
   apple1_context.putImageData(apple1_imagedata, 0, 0);

   frames++;
   if(end_of_frame_hook !== undefined) end_of_frame_hook();
}
