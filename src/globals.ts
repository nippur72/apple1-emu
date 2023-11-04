import { paste } from "./paste";
import { nano_byte_received, nano_byte_sent, nano_timeout, nano } from "./sdcard/nano";
import { apple1_screen_update } from "./video";
import { apple1_read_keyboard_port, apple1display } from "./bus";
import { apple1 } from "./emscripten_wrapper";
import { 
   iec_received_data, 
   iec_received_command_listen, 
   iec_received_command_unlisten, 
   iec_received_command_talk, 
   iec_received_command_untalk, 
   iec_received_command_open, 
   iec_received_command_close, 
   iec_received_command_fopen,    
   iec_sent_data_to_cpu, 
   iec_is_last_byte,
   iec_get_send_byte,
   iec_nothing_to_send
} from "./sdcard/iec";

import { probe, probe_off } from "./sdcard/iec_probe";

import { dump, hex } from "./bytes";

(window as any).paste = paste;
(window as any).nano_byte_received = nano_byte_received ;
(window as any).nano_byte_sent = nano_byte_sent;
(window as any).nano_timeout = nano_timeout;
(window as any).nano = nano;
(window as any).sdcard = nano.sdcard;

(window as any).apple1_screen_update = apple1_screen_update;
(window as any).apple1_read_keyboard_port = apple1_read_keyboard_port;
(window as any).display_receivechar = (e: any)=>apple1display.display_receivechar(e);

(window as any).iec_sent_data_to_cpu          = iec_sent_data_to_cpu;
(window as any).iec_received_data             = iec_received_data;
(window as any).iec_received_command_listen   = iec_received_command_listen;
(window as any).iec_received_command_unlisten = iec_received_command_unlisten;
(window as any).iec_received_command_talk     = iec_received_command_talk;
(window as any).iec_received_command_untalk   = iec_received_command_untalk;
(window as any).iec_received_command_open     = iec_received_command_open;
(window as any).iec_received_command_close    = iec_received_command_close;
(window as any).iec_received_command_fopen    = iec_received_command_fopen;
(window as any).iec_is_last_byte              = iec_is_last_byte;
(window as any).iec_get_send_byte             = iec_get_send_byte;
(window as any).iec_nothing_to_send           = iec_nothing_to_send;

(window as any).probe = probe;
(window as any).probe_off = probe_off;

(window as any).dump = dump;
(window as any).hex = hex;

(window as any).apple1 = apple1;

(window as any).xxx = (text: string, time: number) => {
   setTimeout(()=>{
      console.log("IEC emulation off")
      apple1.iec_emulate(false);
   },time); 
   paste(text); 
   setTimeout(()=>{
      console.log("IEC emulation on")
      apple1.iec_emulate(true);
   },time*50); 
}

   
