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


const hello_world = new Uint8Array([
   0x20, 0x87, 0x02, 0x20, 0xA6, 0x02, 0x60, 0xA9, 0xAF, 0x85, 0x02, 0xA9, 0x02, 0x85, 0x03, 0xA0,
   0x00, 0xB1, 0x02, 0xE6, 0x02, 0xD0, 0x02, 0xE6, 0x03, 0xC9, 0x00, 0xD0, 0x01, 0x60, 0x85, 0x04,
   0x20, 0xA9, 0x02, 0x4C, 0x8F, 0x02, 0x4C, 0x1F, 0xFF, 0xA5, 0x04, 0x20, 0xEF, 0xFF, 0x60, 0x0D,
   0x0D, 0x48, 0x45, 0x4C, 0x4C, 0x4F, 0x20, 0x57, 0x4F, 0x52, 0x4C, 0x44, 0x20, 0x46, 0x52, 0x4F,
   0x4D, 0x20, 0x4B, 0x49, 0x43, 0x4B, 0x2D, 0x43, 0x0D, 0x0D, 0x00
]);

function rset(s, len) {
   return " ".repeat(len - s.length) + s;
}

function lset(s, len) {
   return (s + " ".repeat(15)).substring(0, len);
}

class SDCard {
   constructor() {

      this.root = {
         "ASOFT": {},
         "EMPTYDIR": {},
         "LONGDIR": {
            "12345678901234567890123456789012#061000": stringToUint8Array("THIS IS A LONG FILE NAME\r"),
         },
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

      this.files = this.root;

      // add some big files
      this.initcard();
   }

   async initcard() {
      // E000 cold start, E2B3 warm start, EFEC run, CALL -151 or reset to exit
      this.files["BASIC#06E000"]    = await fetchBytes("sdcard_image/BASIC.bin");
      this.files["STARTREK#F10300"] = await fetchBytes("sdcard_image/STARTREK.bin");
      this.files["CIAO.BAS#F10800"] = await fetchBytes("sdcard_image/CIAO.BAS.bin");
      this.files["ASOFT"]["APPLESOFT-SD#066000"] = await fetchBytes("sdcard_image/ASOFT/applesoft-lite-sdcard.bin");
      this.files["ASOFT"]["LEMO#F80801"] = await fetchBytes("sdcard_image/ASOFT/LEMO.bin");
      this.files["ASOFT"]["HELLO#F80801"] = await fetchBytes("sdcard_image/ASOFT/HELLO.bin");
   }

   // splits filename into { path, fileName } as in .ino
   split_path(fullpath) {
      let x = fullpath.lastIndexOf("/");
      let path, fileName;

      if(x == -1) {
         path = "";
         fileName = fullpath;
      }
      else {
         if(x==0) path = "/";
         else     path = fullpath.substring(0,x);
         fileName = fullpath.substring(x+1);
      }
      return { path, fileName };
   }

   // returns the directory pointed by path ord undefined if not found or if file
   getDir(path) {
      //this.debug(`getdir: '${path}'`);
      let names = path.split("/");
      let cd = path.startsWith("/") ? this.root : this.getCurrentDir();
      for(let t=0; t<names.length; t++) {
         let name = names[t];
         if(name != "") {
            let newdir = cd[name];
            if(newdir == undefined) return undefined;
            if(newdir.length !== undefined) return undefined;
            cd = cd[name];
         }
      }
      return cd;
   }

   getCurrentDir() {
      return this.files;
   }

   isDirectory(fullpath) {
      let file = this.readFile(fullpath);
      if(file === undefined) throw `${fullpath} not found`;
      if(file.length === undefined) return true;
      else return false;
   }

   getPrintableDir(fullpath) {
      let cd;

      if(fullpath == "") {
         cd = this.getCurrentDir();
      }
      else if(fullpath == "/") {
         cd = this.root;
      }
      else {
         let { path, fileName } = this.split_path(fullpath);
         let dir = this.getDir(path);
         if(dir === undefined) return undefined;
         if(dir[fileName] == undefined) return undefined;
         if(dir[fileName].length !== undefined) return undefined;
         cd = dir[fileName];
      }

      let entries = Object.keys(cd);
      let result = [];
      // dirs first
      entries.forEach(e=>{
         if(cd[e].length === undefined) {
            result.push({
               size: "(DIR)",
               name: e,
               shortname: e,
               type: "",
               address: ""
            });
         }
      });
      // then files
      entries.forEach(e=>{
         if(cd[e].length !== undefined) {
            let size = cd[e].length.toString();
            let s = (e+"#").split("#");
            let type = s[1].substring(0, 2);
            let address = s[1].substring(2);
            if(address.length > 0) address = "$" + address;
                 if(type == "06") type = "BIN";
            else if(type == "F1") type = "BAS";
            else if(type == "F8") type = "ASB";
            else if(type.length>0) type = "#" + type;
            result.push({
               size: rset(size, 5),
               name: e,
               shortname: s[0],
               type,
               address
            });
         }
      });
      return result;
   }

   exist(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      return dir[fileName] !== undefined;
   }

   matchname(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);      
      if(dir === undefined) return { list: [], match: undefined };
      let list = Object.keys(dir);
      let match = list.filter(e=>e.startsWith(fileName)).shift();
      if(match !== undefined) {
              if(path == "")  match = match;
         else if(path == "/") match = path+match;
         else                 match = path + "/" + match;      
      }
      return { list, match };
   }

   readFile(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return undefined;
      return dir[fileName];
   }

   writeFile(fullpath, data) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      dir[fileName] = data;
      return true;
   }

   removefile(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      delete dir[fileName];
      return true;
   }

   rmdir(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      delete dir[fileName];
      return true;
   }

   mkdir(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      dir[fileName] = {};
      return true;
   }

   chdir_noargs() {
      this.files = this.root;
      return true;
   }

   chdir(fullpath) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      if(dir[fileName] == undefined) return false;
      if(dir[fileName].length != undefined) return false;
      this.files = dir[fileName];
      return true;
   }

   isDirEmpty(dirname) {
      let dir = this.getDir(dirname);
      let subfiles = Object.keys(dir);
      return subfiles.length == 0;
   }

   download(fullpath) {
      let { match } = this.matchname(fullpath);
      let file = this.readFile(match);
      if(file !== undefined) {
         let bytes = new Uint8Array(file);
         let { fileName } = this.split_path(match);
         let blob = new Blob([bytes], {type: "application/octet-stream"});
         saveAs(blob, fileName);
         console.log(`downloaded "${fileName}"`);
      } else {
         console.log(`? file not found`);
      }
   }
}

/*
https://github.com/txgx42/applesoft-lite
(function() {
   let VARTAB = hex(mem_read_word(0x0069),4);
   let TXTTAB = hex(mem_read_word(0x0067),4);
   let PRGEND = hex(mem_read_word(0x00AF),4);
   let MEMSIZ = hex(mem_read_word(0x0073),4);
   console.log({VARTAB, TXTTAB, PRGEND, MEMSIZ})
})();
*/

// =====================================================================================
// =====================================================================================
// =====================================================================================
// =====================================================================================
// =====================================================================================


function deepEqual(object1, object2) {
   function isObject(object) {
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

function sdcard_test() {
   let sd = new SDCard();
   console.assert( deepEqual( sd.split_path("root/myfolder/pluto"), { path: "root/myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("myfolder/pluto"), { path: "myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/myfolder/pluto"), { path: "/myfolder", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("pluto"), { path: "", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/pluto"), { path: "/", fileName: "pluto" }));
   console.assert( deepEqual( sd.split_path("/"), { path: "/", fileName: "" }));
   console.assert( deepEqual( sd.split_path(""), { path: "", fileName: "" }));

}
