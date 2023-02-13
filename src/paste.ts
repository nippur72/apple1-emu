import { apple1keyboard } from "./keyboard";

export function paste(s: string) { 
   function paste_char() {
      if(data.length == 0 || counter > 32) return;
      if(apple1keyboard.key_pressed_ascii == -1) {
         let k = data.shift()!;
         apple1keyboard.keyboard_presskey(k);         
         counter = 0;
         if(k == 0x0D) setTimeout(paste_char, 500);
         else          setTimeout(paste_char, 16);
      }
      else {
         counter++;
         setTimeout(paste_char, 16);
      }
   }

   let counter = 0;  

   let data = s.split("").map(c=>c.charCodeAt(0)).map(e=>e==0x0A ? 0x0D : e);
   paste_char();
}