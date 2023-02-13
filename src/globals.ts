import { paste } from "./paste";
import { nano_byte_received, nano_byte_sent, nano_timeout } from "./sdcard/nano";
import { apple1_screen_update } from "./video";
import { apple1_read_keyboard_port, apple1display } from "./bus";

(window as any).paste = paste;
(window as any).nano_byte_received = nano_byte_received ;
(window as any).nano_byte_sent = nano_byte_sent;
(window as any).nano_timeout = nano_timeout;
(window as any).apple1_screen_update = apple1_screen_update;
(window as any).apple1_read_keyboard_port = apple1_read_keyboard_port;
(window as any).display_receivechar = (e: any)=>apple1display.display_receivechar(e);
