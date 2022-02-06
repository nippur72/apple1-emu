// called directly from apple1.h/_apple1_tick()
//
function apple1_read_keyboard_port(address) {
   // console.log(`read address ${hex(address,4)}`);
   if(address == 0xd010) {
      // D010 KEYBOARD DATA
      let key = apple1keyboard.key_pressed_ascii;
      let data = String.fromCharCode(key).toUpperCase().charCodeAt(0) | 0x80;
      apple1keyboard.key_pressed_ascii = -1;
      //console.log(`read key ${hex(data,2)}`);
      return data;
   }
   else if(address == 0xd011) {
      // D011 KEYBOARD CR
      let status = apple1keyboard.key_pressed_ascii == -1 ? 0x00 : 0xFF;
      //if(status == 0xFF) console.log(`read key status ${hex(status,2)}`);
      return status;
   }
}

// called directly from apple1.h/_apple1_tick()
//
function apple1_write_display_port(address, data) {
   //console.log(`write address ${hex(address,4)} with data ${hex(data,2)}`);
   if(address == 0xd012) {
      // D012 DSP DATA
      display_receivechar(data);
   }
}

let display = new Uint8Array(40*24).fill(32);

let cursor_x = 0;
let cursor_y = 0;

function display_receivechar(data) {
   if(data == -1) {
      // special code to clear the screen
      display = new Uint8Array(40*24).fill(32);
      cursor_x = 0;
      cursor_y = 0;
      return;
   }

   if(data == 0x0d || data == 0x8d) {
      cursor_x = 0;
      cursor_y++;
   }
   else {
      // fix datat to charset rom
      data &= 127;
      if(data >= 96 )    data -= 32;
      else if(data < 32) data += 32;

      display[cursor_y*40+cursor_x] = data;
      cursor_x++;
      if(cursor_x >= 40) {
         cursor_x = 0;
         cursor_y++;
      }
   }

   if(cursor_y >= 24) {
      cursor_y = 23;
      // scroll display
      for(let r=0;r<23;r++) {
         for(let c=0;c<40;c++) {
            display[r*40+c] = display[(r+1)*40+c];
         }
      }
      for(let c=0;c<40;c++) display[23*40+c] = 32;
   }
}
