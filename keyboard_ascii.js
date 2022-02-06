
class Apple1Keyboard {

   constructor() {
      this.key_pressed_ascii = -1;       // no key pressed so far      
      this.install_keyboard();
   }

   install_keyboard() {
      document.onkeydown = this.browserKeyDown.bind(this);
   }

   keyboard_presskey(keyascii) {
      this.key_pressed_ascii = keyascii;    
      // console.log("pressed",keyascii);
   }

   // called from cpu I/O
   keyboard_read() {
      let data = this.key_pressed_ascii;
      this.key_pressed_ascii = -1;
      return data;
   }

   browserKeyDown(e) {

      // from Chrome 71 audio is suspended by default and must resume within an user-generated event
      // this.emulator.audio.resume();

      // *** special (non characters) keys ***

      // BREAK key resets the machine
      // TODO: do not erase ram

      if(e.code == "Pause") {
         apple1.reset();
         e.preventDefault();
         return;
      }

      if(e.code == "Home") {
         display_receivechar(-1); // force CLS
         e.preventDefault();
         return;
      }

      if(e.code == "PageUp" || e.code == "PageDown") {
         flip();
         e.preventDefault();
         return;
      }

      /*
      // ALT+Left is rewind tape
      if(e.code == "ArrowLeft" && e.altKey) {
         rewind_tape();
         e.preventDefault();
         return;
      }

      // ALT+Up or ALT+Down is stop tape
      if((e.code == "ArrowUp" && e.altKey) || (e.code == "ArrowDown" && e.altKey)) {
         stop_tape();
         e.preventDefault();
         return;
      }
      */

      // allow F-keys to perform their browser function
      if(e.code == "F1" ||
         e.code == "F2" ||
         e.code == "F3" ||
         e.code == "F4" ||
         e.code == "F5" ||
         e.code == "F6" ||
         e.code == "F7" ||
         e.code == "F8" ||
         e.code == "F9" ||
         e.code == "F10" ||
         e.code == "F11" ||
         e.code == "F12") {
         return;
      }

      // console.log(`e.key=${e.key} e.code=${e.code}`);

      let k = 0;

           if(e.code === 'Backspace')   k = 8;
      else if(e.code === 'Tab')         k = 9;
      else if(e.code === 'Enter')       k = 13;
      else if(e.code === 'NumpadEnter') k = 13;
      else if(e.code === 'Escape')      k = 27;
      else if(e.code === 'Delete')      k = 127;
      else if(e.code === 'ArrowLeft')   k = 8;   // CTRL H
      else if(e.code === 'ArrowRight')  k = 14;  // CTRL N
      else if(e.code === 'ArrowUp')     k = 15;  // CTRL O
      else if(e.code === 'ArrowDown')   k = 10;  // CTRL J
      else if(e.key === 'ù' || e.key === '§')  k = 10;
      else if(e.key === 'ò' || e.key === 'ç')  k = '@'.charCodeAt(0);
      else if(e.key === 'à' || e.key === '°')  k = '#'.charCodeAt(0);
      else if(e.key === 'è' || e.key === 'é')  k = '['.charCodeAt(0);

      // control codes
      if((e.ctrlKey || e.altKey)) {
         let key = e.key.toUpperCase();
              if(key == '0' || key == '@') k = 0;
         else if(key == 'A') k = 1;
         else if(key == 'B') k = 2;
         else if(key == 'C') k = 3;
         else if(key == 'D') k = 4;
         else if(key == 'E') k = 5;
         else if(key == 'F') k = 6;
         else if(key == 'G') k = 7;
         else if(key == 'H') k = 8;
         else if(key == 'I') k = 9;
         else if(key == 'J') k = 10;
         else if(key == 'K') k = 11;
         else if(key == 'L') k = 12;
         else if(key == 'M') k = 13;
         else if(key == 'N') k = 14;
         else if(key == 'O') k = 15;
         else if(key == 'P') k = 16;
         else if(key == 'Q') k = 17;
         else if(key == 'R') k = 18;
         else if(key == 'S') k = 19;
         else if(key == 'T') k = 20;
         else if(key == 'U') k = 21;
         else if(key == 'V') k = 22;
         else if(key == 'W') k = 23;
         else if(key == 'X') k = 24;
         else if(key == 'Y') k = 25;
         else if(key == 'Z') k = 26;
         else if(key == '[') k = 27;
         else if(key == '\\')k = 28;
         else if(key == ']') k = 29;
         else if(key == '^' || key == 'ì') k = 30;
         else if(key == '_' || key == '-') k = 31;
         else if(key == ',') k = '<'.charCodeAt(0);
         else if(key == '.') k = '>'.charCodeAt(0);
         else if(key == '8') k = '^'.charCodeAt(0);
         else if(key == '9') k = '_'.charCodeAt(0);
      }

      // normal keys
      if(k == 0 && e.key.length === 1) k = e.key.charCodeAt(0);

      if(k !== 0) {
         this.keyboard_presskey(k);
      }

      e.preventDefault();
   }
}




