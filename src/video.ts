import { apple1display } from "./bus";
import { charset } from "./signetics-charset";
import { calculateGeometry_tms9928 } from "./video_tms9928";

// good values for CRT PAL
let SCREEN_W = 320;
let SCREEN_H = 192;

let visible_screen = "apple1";

export function get_visible_screen() { return visible_screen };

export function flip() {
   visible_screen = (visible_screen == "apple1") ? "tms9928" : "apple1";
   calculateGeometry();
}

export function calculateGeometry() {
   calculateGeometry_apple1();
   calculateGeometry_tms9928();
}

function calculateGeometry_apple1() {
   // canvas is the outer canvas where the aspect ratio is corrected
   let canvas = document.getElementById("canvas_apple1") as HTMLCanvasElement;
   
   canvas.width  = SCREEN_W * 2;
   canvas.height = SCREEN_H * 2;
   
   let screen = document.getElementById("screen_apple1") as HTMLCanvasElement;
   screen.style.display = visible_screen == "apple1" ? "block" : "none";
}

/**************************************************/

let apple1_canvas = document.getElementById("canvas_apple1") as HTMLCanvasElement;
let apple1_context = apple1_canvas.getContext('2d') as CanvasRenderingContext2D;
let apple1_imagedata = apple1_context.createImageData(SCREEN_W*2, SCREEN_H*2);
let imagedata_data = new Uint32Array(apple1_imagedata.data.buffer);

export function apple1_screen_update(cursor_on: boolean) {
   // console.log("apple1 display");

   let ptr0 = 0;
   let ptr1 = 0;
   let ptr2 = SCREEN_W*2;

   let display = apple1display.display;
   let cursor_x = apple1display.cursor_x;
   let cursor_y = apple1display.cursor_y;

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

   // artifacts      
   ptr1 = 16+0;
   ptr2 = 16+SCREEN_W*2;
   for(let row=0;row<24;row++) {      
      for(let col=0;col<40;col+=2) {
                     
         let pixel = 0xff444444;                  
         imagedata_data[ptr1  ] = pixel;
         imagedata_data[ptr1+1] = pixel;
         imagedata_data[ptr2  ] = pixel;
         imagedata_data[ptr2+1] = pixel;                  

         ptr1+=16*2;
         ptr2+=16*2;
      }
      ptr1 += SCREEN_W*2*16 - 40*16;
      ptr2 += SCREEN_W*2*16 - 40*16;
   } 

   // restore character under cursor
   display[cursor_y*40+cursor_x] = old_char;

   // m6561_imagedata.data.set(imagedata_buf8);
   apple1_context.putImageData(apple1_imagedata, 0, 0);
}
