// TEST SUITE DA ESEGUIRE SU SCHEDA SDCARD VUOTA

/*
paste(`
*** CREA DIRECTORY NIDIFICATE E CI VA DENTRO
MKDIR PIPPO
CD PIPPO
MKDIR PLUTO
CD PLUTO
MKDIR TOPOLINO
CD TOPOLINO

*** SCRIVE FILE NELLE NIDIFICATE
WRITE FILETOPO0 FF00 FFFF
WRITE /PIPPO/PLUTO/TOPOLINO/FILETOPO1 FF00 FFFF
WRITE /PIPPO/PLUTO/FILEPLUTO1 FF00 FFFF
WRITE /PIPPO/FILEPIPPO1 FF00 FFFF
WRITE /FILEROOT1 FF00 FFFF
CD /
WRITE FILEROOT2 FF00 FFFF
CD /PIPPO
WRITE FILEPIPPO2 FF00 FFFF
CD /PIPPO/PLUTO
WRITE FILEPLUTO2 FF00 FFFF
CD /PIPPO/PLUTO/TOPOLINO
WRITE FILETOPO2 FF00 FFFF
`)
*/


// =====================================================================================
// =====================================================================================
// =====================================================================================
// =====================================================================================
// =====================================================================================


function deepEqual(object1: any, object2: any) {
   function isObject(object: any) {
      return object != null && typeof object === 'object';
   }
   const keys1 = Object.keys(object1);
   const keys2 = Object.keys(object2);
   if (keys1.length !== keys2.length) {
      return false;
   }
   for (const key of keys1) {
      const val1 = object1[key];
      const val2 = object2[key];
      const areObjects = isObject(val1) && isObject(val2);
      if (
         areObjects && !deepEqual(val1, val2) ||
         !areObjects && val1 !== val2
      ) {
         return false;
      }
   }
   return true;
}

import { SDCard } from "./sdcard";

export function sdcard_test() {
   let sd = new SDCard();
   console.assert( deepEqual( sd.split_path("root/myfolder/pluto"), { path: "root/myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("myfolder/pluto"), { path: "myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/myfolder/pluto"), { path: "/myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("pluto"), { path: "", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/pluto"), { path: "/", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/"), { path: "/", fileName: "" }));
   console.assert( deepEqual( sd.split_path(""), { path: "", fileName: "" }));
}

/*
https://github.com/txgx42/applesoft-lite
(function() {
   let VARTAB  = hex(mem_read_word(0x0069),4);
   let TXTTAB  = hex(mem_read_word(0x0067),4);
   let PRGEND  = hex(mem_read_word(0x00AF),4);
   let MEMSIZ  = hex(mem_read_word(0x0073),4);
   let TIMEOUT = hex(mem_read(0x0003),2);
   let TIMEOUT_MAX = hex(mem_read_word(0x0004),4);
   let TIMEOUT_CNT = hex(mem_read_word(0x0006),4);
   let TIMEOUT_RANGE = hex(mem_read_word(0x0014),4);

   console.log({VARTAB, TXTTAB, PRGEND, MEMSIZ});
   console.log({TIMEOUT, TIMEOUT_MAX, TIMEOUT_CNT, TIMEOUT_RANGE});
})();

function xx(p) {
   function getb() {
      let rom = [];
      for(let t=0x0;t<0xffff;t++) rom.push(mem_read(t));
      return rom;
   }
   if(p==1) this.z1 = getb();
   if(p==2) this.z2 = getb();
   if(p==3) {
      let z1 = this.z1;
      let z2 = this.z2;
      for(let t=0;t<z1.length;t++) if(z1[t]!=z2[t]) console.log(`${hex(t,4)}: ${hex(z1[t],2)} ${hex(z2[t],2)}`);
   }
   if(p==4) {
      for(let t=0;t<z1.length;t++) if(z1[t]!=z2[t]) mem_write(t,z1[t]);
   }
}
*/
