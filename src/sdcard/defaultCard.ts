import { rset, lset, stringToUint8Array } from "./string_utils";

import { ISDCard } from "./sdcard";

export function default_card(): ISDCard {

   // the hello world program
   const hello_world = new Uint8Array([
      0x20, 0x87, 0x02, 0x20, 0xA6, 0x02, 0x60, 0xA9, 0xAF, 0x85, 0x02, 0xA9, 0x02, 0x85, 0x03, 0xA0,
      0x00, 0xB1, 0x02, 0xE6, 0x02, 0xD0, 0x02, 0xE6, 0x03, 0xC9, 0x00, 0xD0, 0x01, 0x60, 0x85, 0x04,
      0x20, 0xA9, 0x02, 0x4C, 0x8F, 0x02, 0x4C, 0x1F, 0xFF, 0xA5, 0x04, 0x20, 0xEF, 0xFF, 0x60, 0x0D,
      0x0D, 0x48, 0x45, 0x4C, 0x4C, 0x4F, 0x20, 0x57, 0x4F, 0x52, 0x4C, 0x44, 0x20, 0x46, 0x52, 0x4F,
      0x4D, 0x20, 0x4B, 0x49, 0x43, 0x4B, 0x2D, 0x43, 0x0D, 0x0D, 0x00
   ]);

   // a directory with long file names
   let long_dir: {[key:string]: Uint8Array} = {};
   for(let t=50;t<255;t++) {
      let fn = `FILE-000-${'A'.repeat(t)}#060280`;
      fn = fn.replace("000", rset(fn.length,3,"0"));
      long_dir[fn] = new Uint8Array([ 0x80, 0x81, 0x82, 0x83 ]);
   }

   let card = {
      "ASOFT": {},
      "EMPTYDIR": {},
      "LONGDIR": long_dir,
      "HELP": {
         "COMMANDS.TXT": stringToUint8Array("*** HELP OF COMMANDS ***\rBLA BLA ...\r"),
         "DIR.TXT":      stringToUint8Array("HELP FILE OF DIR\r"),
         "LOAD.TXT":     stringToUint8Array("HELP FILE OF LOAD\r"),
      },
      "BIG":      stringToUint8Array("*-JUNK-*".repeat(2048)),
      "HELLO":    hello_world,
      "TEST.TXT": stringToUint8Array("THIS IS A TEST\r"),
      "JUNK": {
         "JUNK1": stringToUint8Array("*** JUNK FILE 1\r"),
         "JUNK2": stringToUint8Array("*** JUNK FILE 2\r"),
         "JUNKDIR": {
            "TEST.TXT": stringToUint8Array("THIS IS A TEST OF A FILE WITHIN A DIR\r"),
            "EMPTYDIR": {},
         },
      },
   };

   return card;
}
