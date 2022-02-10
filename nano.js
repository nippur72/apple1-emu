function stringToArray(s) {
   return s.split("").map(e=>e.charCodeAt(0));
}

function stringToUint8Array(s) {
   return new Uint8Array(stringToArray(s));
}

function arrayToString(a) {
   return a.map(e=>String.fromCharCode(e)).join("");
}

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

class SDCard {
   constructor() {
      this.current_dir = "";

      this.files = {
         "HELLO": hello_world,
         "TEST.TXT": stringToUint8Array("THIS IS A TEST\r"),
         "JUNK": {},
         "JUNK/JUNK1": stringToUint8Array("JUNK FILE 1\r"),
         "JUNK/JUNK2": stringToUint8Array("JUNK FILE 2\r"),
         "JUNK/JUNK3": stringToUint8Array("JUNK FILE 3\r"),         
      };

      // add some big files
      this.initcard();
   }

   async initcard() {
      // E000 cold start, E2B3 warm start, EFEC run, CALL -151 or reset to exit
      this.files["BASIC"]    = await fetchBytes("sdcard_image/BASIC.bin");
      this.files["STARTREK"] = await fetchBytes("sdcard_image/STARTREK.bin");
      this.files["CIAO.BAS"] = await fetchBytes("sdcard_image/CIAO.BAS.bin");
   }

   pathname(filename) {
      return this.current_dir + filename;
   }

   isDirectory(entry) {
      let fullname = this.pathname(entry);      
      let file = this.files[fullname];
      if(file.length === undefined) return true;
      else return false;
   }

   dir(/*entry*/) {
      //let fullname = this.pathname(entry);
      //const files = Object.keys(this.files).filter(e=>e.startsWith(fullname));
      const entries = Object.keys(this.files);
      let result = [];
      // dirs first
      entries.forEach(e=>{ 
         if(this.isDirectory(e)) {
            result.push({size: "(DIR)", name: e});  
         }
      });
      // then files
      entries.forEach(e=>{ 
         if(!this.isDirectory(e)) {
            let size = this.files[e].length.toString();
            result.push({size: rset(size, 5), name: e});  
         }
      });
      console.log(result);
      return result;
   }

   exists(entry) {
      let fullname = this.pathname(entry);
      const files = Object.keys(this.files);
      return files.includes(fullname);
   }

   readfile(entry) {
      let fullname = this.pathname(entry);
      return this.files[fullname];
   }

   writefile(filename, data) {
      let fullname = this.pathname(filename);
      this.files[fullname] = data;
   }
}

function nano_byte_received(data) { 
   return nano.byte_received(data); 
}

function nano_byte_sent() { 
   return nano.byte_sent(); 
}

function nano_timeout() {
   nano.timeout();
}

class Nano {
   constructor() {
      this.sdcard = new SDCard();
      this.reset();
   }

   debug(m) {
      console.log(`nano: ${m}`);
   }

   reset() {
      this.state = "idle";
      this.state_after_send = "";
      this.data = 0;
      this.receive_buffer = [];
      this.send_buffer    = [];
      this.bytesleft = 0;
      this.filename = "";
   }

   byte_received(data) {
      //console.log(`received `, data);
      this.data = data;
      this.receive_buffer.push(this.data);
      return this.step();
   }

   byte_sent() {
      //console.log(`nano byte sent`);      
      return this.step();
   }

   // step the state machine
   step() {
      if(this.state == "idle") {
         // parse command
         let cmd = this.receive_buffer.shift();
         if(cmd == 0) {
            this.debug("read command");
            // receive string from cpu
            // open file
            // if ok: put [0x00, file_size, file_data] in send buffer
            // else:  put [0x0FF,string error message] in send buffer
            // goto idle
            this.state = "read.filename";
         }
         else if(cmd == 1) {
            this.debug("write command");
            // receive string from cpu
            // create file
            // if ok put [0x00] in send buffer
            // else put [0x0FF,string error message] in send buffer
            // receive file size
            // receive file data
            // if ok put [0x00] in send buffer
            // else put [0x0FF,string error message] in send buffer
            // goto idle
            this.state = "write.filename";
         }
         else if(cmd == 2) {
            // dir command
            this.debug("dir command");
            let entries = this.sdcard.dir();
            let dir = entries.map(e=>`${e.size} ${e.name}`).join("\r");
            this.send_buffer.push(...stringToArray(dir));
            this.send_buffer.push(0);
            this.state = "send";
            this.state_after_send = "idle";
         }
      }
      else if(this.state == "send") {
         //console.log(this.send_buffer);
         if(this.send_buffer.length == 0) {            
            // send ended, go in idle mode
            this.state = this.state_after_send;
            return 0; 
         }
         else {
            apple1.nano_next_byte_to_send(this.send_buffer.shift());
            return 10;   
         }
      }
      else if(this.state == "read.filename") {         
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let filename = arrayToString(this.receive_buffer);
            this.receive_buffer = [];
            this.debug(`filename received: "${filename}"`);

            // seeks for file
            let file_ok = this.sdcard.exists(filename);
            if(file_ok) {
               if(this.sdcard.isDirectory(filename)) {
                  this.send_buffer.push(0xFF); // ERR_RESPONSE
                  this.send_buffer.push(...stringToArray("?CAN'T OPEN FILE\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  let file = this.sdcard.readfile(filename);
                  this.debug("file read ok");
                  this.send_buffer.push(0); // OK_RESPONSE
                  this.send_buffer.push((file.length>>0) & 0xFF); // file size low byte
                  this.send_buffer.push((file.length>>8) & 0xFF); // file size high byte
                  this.send_buffer.push(...file); // file data
                  this.state = "send";
                  this.state_after_send = "idle";
               }
            }
            else {
               this.send_buffer.push(0xFF); // ERR_RESPONSE
               this.send_buffer.push(...stringToArray("?FILE NOT FOUND\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "write.filename") {         
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let filename = arrayToString(this.receive_buffer);
            this.receive_buffer = [];
            this.debug(`filename received: "${filename}"`);
            // create file
            let file_ok = !this.sdcard.exists(filename);
            if(file_ok) {
               this.debug("ok, file does not exist");
               this.filename = filename;
               this.send_buffer.push(0x00); // OK_RESPONSE
               this.state = "send";
               this.state_after_send = "write.filesize";
            }
            else {
               this.send_buffer.push(0xFF); // ERR_RESPONSE
               this.send_buffer.push(...stringToArray("?ALREADY EXISTS\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "write.filesize") {
         if(this.receive_buffer.length == 2) {
            let size = this.receive_buffer.shift() + this.receive_buffer.shift()*256;
            this.debug(`filesize received: ${size}`);
            this.bytesleft = size;
            this.state = "write.filedata";
         }
      }
      else if(this.state == "write.filedata") {
         if(this.receive_buffer.length == this.bytesleft) {
            let file_ok = true;
            if(file_ok) {
               this.debug(`file data received`);
               this.sdcard.writefile(this.filename, this.receive_buffer);
               this.receive_buffer = [];
               this.send_buffer.push(0); // OK_RESPONSE
               this.state = "send";
               this.state_after_send = "idle";
            }
            else {
               this.send_buffer.push(0xFF); // ERR_RESPONSE
               this.send_buffer.push(...stringToArray("?CAN'T WRITE FILE\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else throw `invalid state ${this.state}`;

      if(this.send_buffer.length > 0) {
         apple1.nano_next_byte_to_send(this.send_buffer.shift());
         return 10;
      }
      else {
         return 0;
      }
   }   
   
   timeout() {
      console.log(`nano timeout`);
      this.reset();
   }   
}

