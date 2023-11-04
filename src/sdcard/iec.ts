import { hex } from "../bytes";
import { lset, stringToArray } from "../string_utils";
import { nano } from "./nano";

const debug = console.log;

/*
interface Channel {
   talk: number[];
   listen: number[];
   file: string;
}

let channels: Channel[] = [];
for(let i=0; i<16; i++) channels.push({
   talk: [],
   listen: [],
   file: ""
});
*/

let file_name: string = "";
let last_open: number = 0;
let last_device: number = 0;
let last_channel: number = -1;
let receive_buffer: number[] = [];
let send_buffer: number[] = [];
let is_talking = false;
let is_listening = false;

const debug_data = false;
const debug_commands = true;

export function iec_is_last_byte() {
   let is_last_byte = send_buffer.length < 2;
   //debug(`is last byte: ${is_last_byte}`);
   return is_last_byte;
}

export function iec_get_send_byte() {
   let byte = send_buffer.shift()||0;
   //debug(`get byte ${hex(byte)} remaining in buffer: ${send_buffer.length}`)
   return byte;
}      

export function iec_nothing_to_send() {
   return send_buffer.length == 0;
}

export function iec_sent_data_to_cpu(data: number, curr_tick: number) {
   if(debug_data) debug(`DATA TO CPU ${hex(data)} '${String.fromCharCode(data)}' @${curr_tick}`);
}

export function iec_received_data(data: number, curr_tick: number) {
   if(debug_data) debug(`DATA FROM CPU ${hex(data)} '${String.fromCharCode(data)}' @${curr_tick}`);
   receive_buffer.push(data);
}

export function iec_received_command_listen(device: number, curr_tick: number) {
   if(debug_commands) debug(`LISTEN ${device} @${curr_tick}`);
   last_device = device;
   if(device != 8) { 
      debug("not device 8, ignoring");
      is_listening = false;
      is_talking = false;      
      last_open = 0;
      return;
   }   
   is_listening = true;
   is_talking = false;      
}

export function iec_received_command_unlisten(curr_tick: number) {
   if(debug_commands) debug(`UNLISTEN @${curr_tick}`);
   if(last_device !== 8) {
      debug("not device 8, ignoring");
      return;
   }
   
   if(last_open == 0xF0) {
      file_name = receive_buffer.map(e=>String.fromCharCode(e)).join(""); 
   }
   if(last_open == 0x60) {
      let file = new Uint8Array(receive_buffer);
      debug(`writing "${file_name}" to disk (${file.length} bytes)`);
      if(!nano.sdcard.exist('/1541')) nano.sdcard.mkdir('/1541');
      nano.sdcard.writeFile(`/1541/${file_name}`, file);
      last_open = 0;
   }

   is_listening = false;
}

export function iec_received_command_talk(device: number, curr_tick: number) {
   if(debug_commands) debug(`TALK ${device} @${curr_tick}`);
   last_device = device;
   if(device != 8) {
      is_listening = false;
      is_talking = false;      
      last_open = 0;
      debug("not device 8, ignoring");
      return;
   }
   is_talking = true;
   is_listening = false;
}

export function iec_received_command_untalk(curr_tick: number) {
   if(debug_commands) debug(`UNTALK @${curr_tick}`);
   if(last_device !== 8) {
      debug("not device 8, ignoring");
      return;
   }
   last_open = 0;
   is_talking = false;
}

export function iec_received_command_open(channel: number, curr_tick: number) {
   if(debug_commands) debug(`OPEN ${channel} @${curr_tick}`);
   if(last_device !== 8) {
      debug("not device 8, ignoring");
      return;
   }
   last_open = 0x60;   
   last_channel = channel;
   receive_buffer = [];

   if(is_talking) {   
      
      let sdcard_name = "";
      let bytes: number[] | Uint8Array | undefined;
      
      if(channel == 15) {
         bytes = getStatusFile();
         sdcard_name = "<STATUS>";
      }
      else {
         // all other channels
         if(file_name.startsWith("$")) {
            let pattern = file_name.substring(1);
            bytes = getIecDirectoryFile(pattern);
            sdcard_name = "<DIRECTORY>";
         }
         else {
            sdcard_name = `/1541/${file_name}`;
            bytes = nano.sdcard.readFile(sdcard_name);            
         }
      }
                  
      if(bytes === undefined) {
         debug(`??? file ${sdcard_name} not found`);
         last_open = 0;
      }
      else {
         debug(`sending ${sdcard_name} (${bytes.length} bytes)`);
         send_buffer = [ ...bytes ];   
      }
   }
}

export function iec_received_command_close(channel: number, curr_tick: number) {
   if(debug_commands) debug(`CLOSE ${channel} @${curr_tick}`);
   if(last_device !== 8) {
      debug("not device 8, ignoring");
      return;
   }
   if(channel === 15 && file_name.length > 0) {
      debug(`received IEC command: ${file_name}`);
      receive_buffer = [];
   }
}

export function iec_received_command_fopen(channel: number, curr_tick: number) {
   if(debug_commands) debug(`FOPEN ${channel} @${curr_tick}`);
   if(last_device !== 8) {
      debug("not device 8, ignoring");
      return;
   }
   last_open = 0xF0;   
   last_channel = channel;
   receive_buffer = [];
}

const fake_directory = [
   0x01, 0x08,
         0x1f, 0x08, 0x00, 0x00, 0x12, 0x22, 0x41, 0x55, 0x54, 0x4f, 0x53, 0x54, 0x41, 0x52, 0x54,  
   0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x22, 0x20, 0x20, 0x20, 0x20, 0x32, 0x41, 0x00, 0x3f, 
   0x08, 0x06, 0x00, 0x20, 0x20, 0x20, 0x22, 0x49, 0x45, 0x43, 0x22, 0x20, 0x20, 0x20, 0x20, 0x20, 
   0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x50, 0x52, 0x47, 0x20, 0x20, 0x00, 0x5d, 
   0x08, 0x92, 0x02, 0x42, 0x4c, 0x4f, 0x43, 0x4b, 0x53, 0x20, 0x46, 0x52, 0x45, 0x45, 0x2e, 0x20, 
   0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00
];

function getIecDirectoryFile(pattern: string) {
   debug(`building directory for ${pattern}`);
   let dir = nano.sdcard.getDir("/1541");
   let fnames: string[] = [];
   if(dir!==undefined) fnames = Object.keys(dir);

   let iec_dir: IEC_DIR_ITEM[] = [];
                                           
   iec_dir.push({numblocks: 0, filename: '"FLOPPY DISC     "    2A'});

   let total_blocks = 0;

   let entries = fnames.map(e=>{
      let file = nano.sdcard.readFile(`/1541/${e}`);
      if(file !== undefined) {
         let numblocks = Math.ceil(file.length / 256);
         total_blocks+=numblocks;
         let quoted_name = `"${e}"`;
         let numblocks_size = `${numblocks}`.length;
         let full_name = lset("",3-numblocks_size) + lset(quoted_name,20)+"PRG";         
         return {
            numblocks: Math.ceil(file.length / 256),
            filename: full_name 
         } as IEC_DIR_ITEM;
      }
   });

   entries.filter(e=>e!==undefined).forEach(e=>iec_dir.push(e!));

   iec_dir.push({      
      numblocks: 664-total_blocks, 
      filename: "BLOCKS FREE."
   });
  
   //return new Uint8Array(fake_directory);
   let bytes = iec_dir_2_bytes(iec_dir);
   
   return bytes;
}

interface IEC_DIR_ITEM {
   numblocks: number;
   filename: string;
}

function iec_dir_2_bytes(dir: IEC_DIR_ITEM[]): number[] {
   let buffer: number[] = [];

   buffer.push(0x01); buffer.push(0x08);  // program start address

   dir.forEach(e=>{      
      buffer.push(0x00); buffer.push(0x08);  // next line pointer

      buffer.push((e.numblocks >> 0) & 0xFF);  // num blocks as line number
      buffer.push((e.numblocks >> 8) & 0xFF);

      buffer.push( ...stringToArray(e.filename));  // file name

      buffer.push(0x00);  // end of line
   });

   buffer.push(0);  // next line point to 0 as ending marker
   buffer.push(0);   

   return buffer;
}

function getStatusFile() {
   return stringToArray("00, OK,00,00");   
}

// 256 bytes block

/*
>C:0800  00 1f 08 00  00 12 22 41  55 54 4f 53  54 41 52 54   ......"AUTOSTART
>C:0810  20 20 20 20  20 20 20 22  20 20 20 20  32 41 00 3f          "    2A.?
>C:0820  08 06 00 20  20 20 22 49  45 43 22 20  20 20 20 20   ...   "IEC"     
>C:0830  20 20 20 20  20 20 20 20  20 50 52 47  20 20 00 5d            PRG  .]
>C:0840  08 92 02 42  4c 4f 43 4b  53 20 46 52  45 45 2e 20   ...BLOCKS FREE. 
>C:0850  20 20 20 20  20 20 20 20  20 20 20 20  00 00 00 00               ....
>C:0860  00 00 ff ff  ff ff 00 00  00 00 ff ff  ff ff 00 00   ................
>C:0870  00 00 ff ff  ff ff 00 00  00 00 ff ff  ff ff 00 00   ................
>C:0880  00 00 ff ff  ff ff 00 00  00 00 ff ff  ff ff 00 00   ................

2 LINKNEXT
2 LINENR
  LINEA
1 END LINE "0" 

0
*/


/*  
   iec->send_buffer_length = 0;
   iec->send_buffer_pos = 0;

   iec->send_buffer[ 0] = 0x54; // 'T' 
   iec->send_buffer[ 1] = 0x07; // '' 
   iec->send_buffer[ 2] = 0x30; // '0' 
   iec->send_buffer[ 3] = 0x31; // '1' 
   iec->send_buffer[ 4] = 0x32; // '2' 
   iec->send_buffer[ 5] = 0x33; // '3' 
   iec->send_buffer[ 6] = 0x34; // '4' 
   iec->send_buffer[ 7] = 0x35; // '5' 
   iec->send_buffer[ 8] = 0x36; // '6' 
   iec->send_buffer[ 9] = 0x37; // '7' 
   iec->send_buffer[10] = 0x38; // '8' 
   iec->send_buffer[11] = 0x39; // '9' 
   iec->send_buffer[12] = 0x41; // 'A' 
   iec->send_buffer[13] = 0x42; // 'B' 
   iec->send_buffer[14] = 0x43; // 'C' 
   iec->send_buffer[15] = 0x44; // 'D' 
   iec->send_buffer[16] = 0x45; // 'E' 
   iec->send_buffer[17] = 0x46; // 'F' 
   iec->send_buffer_length = 16+2;  
  
*/