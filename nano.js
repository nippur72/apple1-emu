/*
   *** Notes about SD CARD emulation ***

   The system emulates the "P-LAB SD CARD interface" which is made
   of a MOS6522 VIA chip that interacts with an Arduino NANO MCU which in turn 
   is interfaced to an SD card adapter.

   On the emulator the VIA chip is ticked within the apple1_tick() (C/WASM side).
   Pins from PA and PB ports of the VIA are read/written to the "nano.h" chip 
   which is also ticked but at a rate slower than the CPU.

   The "nano.h" emulates the "sdcard.ino" side, but it does it with a state machine
   because the tick() function has to return immediately and can't be hold in the wait 
   loops of the protocol. Due the complex nature of the state machine, the "nano.h"
   only handles the low-level byte trasfer, and calls JavaScript (nano.js) for the
   high-level functions on the protocol.

   Nano.h calls the following JavaScript event-like functions:
   - nano_byte_received(data)
      when a byte has been received from the Apple-1. 
      Must return  0 if next byte has to be received
      Must return 10 if next byte has to be transmitted
   - nano_byte_sent()
      when a byte has been sent to the Apple-1
      Must return  0 if next byte has to be received
      Must return 10 if next byte has to be transmitted
   - nano_timeout()
      when the interface goes timeout
      Put in receive mode for next byte

   The JavaScript side ("nano.js") responds to the above events implementing the
   protocol with another state machine. When sending a byte, the JavaScript side
   calls "nano_next_byte_to_send()" which writes directly into "nano.data".

*/

function stringToArray(s) {
   return s.split("").map(e=>e.charCodeAt(0));
}

function stringToUint8Array(s) {
   return new Uint8Array(stringToArray(s));
}

function arrayToString(a) {
   return a.map(e=>String.fromCharCode(e)).join("");
}

function nano_byte_received(data) { 
   return nano.byte_received(data); 
}

function nano_byte_sent(data) {
   return nano.byte_sent(data);
}

function nano_timeout(nano_state) {
   nano.timeout(nano_state);
}

const CMD_READ  =  0;
const CMD_WRITE =  1;
const CMD_DIR   =  2;
const CMD_TIME  =  3;
const CMD_LOAD  =  4;
const CMD_RUN   =  5;
const CMD_SAVE  =  6;
const CMD_TYPE  =  7;
const CMD_DUMP  =  8;
const CMD_JMP   =  9;
const CMD_BAS   = 10;
const CMD_DEL   = 11;
const CMD_LS    = 12;
const CMD_CD    = 13;
const CMD_MKDIR = 14;
const CMD_RMDIR = 15;
const CMD_EXIT  = 16;
const CMD_PWD   = 19;
const CMD_TEST  = 20;

const OK_RESPONSE  = 0x00;
const ERR_RESPONSE = 0xFF;

class Nano {
   constructor() {
      this.sdcard = new SDCard();
      this.reset();
      this.cd_path = "";
   }

   reset() {
      // also called after TIMEOUT
      this.state = "idle";
      this.state_after_send = "";
      this.data = 0;
      this.receive_buffer = [];
      this.send_buffer    = [];
      this.bytesleft = 0;
      this.filename = "";
   }

   // pushes a string in the send buffer
   send_string(s) {
      this.send_buffer.push(...stringToArray(s));
   }

   // pops a string from the receive buffer
   pop_string() {
      let s = arrayToString(this.receive_buffer);
      this.receive_buffer = [];
      return s;
   }

   get_cd_path() {
      if(this.cd_path == "") return "/";
      else return this.cd_path;
   }

   debug(m) {
      console.log(`nano: ${m}`);
   }

   // event called by WASM when a byte is received
   byte_received(data) {
      //console.log(`received `, data);
      this.data = data;
      this.receive_buffer.push(this.data);
      return this.step();
   }

   // event called by WASM when a byte is sent
   byte_sent(data) {
      //console.log(`nano byte sent ${data}`);
      return this.step();
   }

   // step the state machine
   step() {
      if(this.state == "idle") {
         // parse command
         let cmd = this.receive_buffer.shift();
         this.cmd = cmd;
         //this.debug(`cmd: ${cmd}`);
         if(cmd == CMD_READ) {
            this.debug("read command");
            // receive string from cpu
            // open file
            // if ok: put [0x00, file_size, file_data] in send buffer
            // else:  put [0x0FF,string error message] in send buffer
            // goto idle
            this.state = "read.filename";
         }
         else if(cmd == CMD_WRITE) {
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
         else if(cmd == CMD_DIR || cmd == CMD_LS) {
            // dir command
            this.debug("dir command");
            this.state = "dir.filename";
         }
         else if(cmd == CMD_DEL) {
            // del command
            this.debug("del command");
            this.state = "del.filename";
         }
         else if(cmd == CMD_MKDIR) {
            // mkdir command
            this.debug("mkdir command");
            this.state = "mkdir.filename";
         }
         else if(cmd == CMD_RMDIR) {
            // rmdir command
            this.debug("rmdir command");
            this.state = "rmdir.filename";
         }
         else if(cmd == CMD_CD) {
            // rmdir command
            this.debug("cd command");
            this.state = "chdir.filename";
         }
         else if(cmd == CMD_PWD) {
            // rmdir command
            this.debug("pwd command");
            this.send_string(this.get_cd_path());
            this.send_buffer.push(0);
            this.state = "send";
            this.state_after_send = "idle";            
         }
         else if(cmd == CMD_TEST) {
            // rmdir command
            this.debug("test command");
            this.state = "test.receivebyte";
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
            let file_ok = this.sdcard.exist(filename);
            if(file_ok) {
               if(this.sdcard.isDirectory(filename)) {
                  this.send_buffer.push(ERR_RESPONSE);
                  this.send_buffer.push(...stringToArray("?CAN'T OPEN FILE\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  let file = this.sdcard.readFile(filename);
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
               this.send_buffer.push(ERR_RESPONSE);
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
            let file_ok = !this.sdcard.exist(filename);
            if(file_ok) {
               this.debug("ok, file does not exist");
               this.filename = filename;
               this.send_buffer.push(OK_RESPONSE);
               this.state = "send";
               this.state_after_send = "write.filesize";
            }
            else {
               this.send_buffer.push(ERR_RESPONSE);
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
               this.sdcard.writeFile(this.filename, this.receive_buffer);
               this.receive_buffer = [];
               this.send_buffer.push(OK_RESPONSE);
               this.state = "send";
               this.state_after_send = "idle";
            }
            else {
               this.send_buffer.push(ERR_RESPONSE);
               this.send_buffer.push(...stringToArray("?CAN'T WRITE FILE\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "dir.filename") {
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let dirname = this.pop_string();
            this.debug(`filename received: "${dirname}"`);

            let entries = this.sdcard.getPrintableDir(dirname);
            if(entries == undefined) {
               this.send_buffer.push(...stringToArray("?DIR NOT FOUND\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
            else {
               let dir_formatted;

               if(this.cmd==CMD_LS) dir_formatted = entries.map(e=>`${e.size} ${e.name}`).join("\r");
               else                 dir_formatted = entries.map(e=>`${lset(e.name,15)} ${e.size}`).join("\r");

               this.send_string(dir_formatted);
               this.send_buffer.push(0);
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "del.filename") {         
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let filename = this.pop_string();
            this.debug(`filename received: "${filename}"`);

            // seeks for file
            let file_exist = this.sdcard.exist(filename);
            if(file_exist) {
               if(this.sdcard.isDirectory(filename)) {
                  this.send_buffer.push(...stringToArray("?CAN'T DELETE FILE\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  this.sdcard.removefile(filename);
                  this.send_buffer.push(...stringToArray(filename));
                  this.send_buffer.push(...stringToArray(" DELETED\0")); // file data
                  this.state = "send";
                  this.state_after_send = "idle";
               }
            }
            else {               
               this.send_buffer.push(...stringToArray("?FILE NOT FOUND\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "rmdir.filename") {
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let dirname = arrayToString(this.receive_buffer);
            this.receive_buffer = [];
            this.debug(`filename received: "${dirname}"`);

            let dir_exist = this.sdcard.exist(dirname);
            if(dir_exist) {
               if(!this.sdcard.isDirectory(dirname)) {
                  this.send_buffer.push(...stringToArray("?NOT A DIRECTORY\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else if(!this.sdcard.isDirEmpty(dirname)) {
                  this.send_buffer.push(...stringToArray("?DIR NOT EMPTY\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  this.sdcard.rmdir(dirname);
                  this.send_buffer.push(...stringToArray(dirname));
                  this.send_buffer.push(...stringToArray(" (DIR) REMOVED\0"));
                  this.state = "send";
                  this.state_after_send = "idle";
               }
            }
            else {
               this.send_buffer.push(...stringToArray("?DIR NOT FOUND\0"));
               this.state = "send";
               this.state_after_send = "idle";
            }
         }
      }
      else if(this.state == "mkdir.filename") {
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let dirname = arrayToString(this.receive_buffer);
            this.receive_buffer = [];
            this.debug(`filename received: "${dirname}"`);

            // seeks for file
            let dir_exist = this.sdcard.exist(dirname);
            if(dir_exist) {
               this.send_string("?DIR ALREADY EXISTS\0");
               this.state = "send";
               this.state_after_send = "idle";
            }
            else {
               let create_dir_ok = this.sdcard.mkdir(dirname);
               if(!create_dir_ok) {
                  this.send_string("?CAN'T MAKE DIR\0");
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  this.send_string(dirname);
                  this.send_string(" (DIR) CREATED\0");
                  this.state = "send";
                  this.state_after_send = "idle";
               }
            }
         }
      }
      else if(this.state == "chdir.filename") {
         if(this.data == 0) {
            this.receive_buffer.pop(); // remove 0x00
            let dirname = this.pop_string();
            this.debug(`dirname received: "${dirname}"`);

            let parent = function(fullpath) {               
               let s = fullpath.split("/");
               s.pop();               
               if(s.length <= 1) return "/";               
               return s.join("/");                
            }
          
            if(dirname == "..") {
               dirname = parent(this.cd_path);               
            }

            if(dirname=="") {
               // does nothing, simply prints current working directory
               this.debug("CD without arguments, does nothing");               
               this.send_buffer.push(OK_RESPONSE);
               this.state = "send";
               this.state_after_send = "idle";
            }
            else if(dirname == "/") {
               // moves to root /
               this.debug("CD with root argument, moving to root");
               this.sdcard.chdir_noargs();
               this.cd_path = "";               
               this.send_buffer.push(OK_RESPONSE);
               this.state = "send";
               this.state_after_send = "idle";
            }
            else {
               this.debug("CD with dirname argument");
               if(this.sdcard.chdir(dirname)) {
                  this.debug("CD success");
                  this.cd_path = dirname.startsWith("/") ? dirname : `${this.cd_path}/${dirname}`;                  
                  this.send_buffer.push(OK_RESPONSE);
                  this.state = "send";
                  this.state_after_send = "idle";
               }
               else {
                  console.log("CD failed");
                  if(!this.sdcard.exist(dirname)) {
                     this.debug("?DIR NOT FOUND");
                     this.send_buffer.push(ERR_RESPONSE);
                     this.send_string("?DIR NOT FOUND\0");
                     this.state = "send";
                     this.state_after_send = "idle";
                  }
                  else {
                     if(!this.sdcard.isDirectory(dirname)) {
                        this.debug("?NOT A DIRECTORY");
                        this.send_buffer.push(ERR_RESPONSE);
                        this.send_string("?NOT A DIRECTORY\0");
                        this.state = "send";
                        this.state_after_send = "idle";
                     }
                     else {
                        this.debug("?CAN'T CHANGE DIR");
                        this.send_buffer.push(ERR_RESPONSE);
                        this.send_string("?CAN'T CHANGE DIR\0");
                        this.state = "send";
                        this.state_after_send = "idle";
                     }
                  }
               }
            }
         }
      }
      else if(this.state == "test.receivebyte") {
         let data = this.receive_buffer.pop();
         data ^= 0xFF;
         this.send_buffer.push(data);
         this.state = "send";
         this.state_after_send = "test.receivebyte";
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
   
   timeout(nano_state) {
      //console.log(`nano timeout ${nano_state}, debug1=${hex(mem_read(0xe0))}`);
      //apple1.print_pc();
      this.reset();
   }   
}

