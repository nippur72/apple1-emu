import emscripten_module from "../emscripten_module";

let wasm_instance: any;

import { apple1display } from "./bus";

class Apple1 {
   init = () => {};
   exec_us = (usec: number) => {};
   reset = ()=>{};
   load_prg = (array: any, location: number) => { return 0 };
   peek = (address: number) => { return 0 };
   poke = (address: number, value: number) => {};
   ticks = () => { return 0 };
   nano_next_byte_to_send = (b: number)=>{};
   print_pc = ()=>{};
   iec_emulate = (emulate: boolean)=>{};

   power() {
      apple1.init();
      apple1display.bootscreen();
      apple1.reset();
   };
}

export const apple1 = new Apple1();

export async function load_wasm() {

   wasm_instance = await emscripten_module();

   // makes C exported functions available globally
   apple1.init        = wasm_instance.cwrap("sys_init", null);
   apple1.exec_us     = wasm_instance.cwrap("sys_exec_us", null, ['number']);
   apple1.reset       = wasm_instance.cwrap("sys_reset", null);
   apple1.load_prg    = wasm_instance.cwrap("sys_load_prg", null, ['array', 'number'] );
   apple1.peek        = wasm_instance.cwrap("sys_mem_cpu_rd", 'number', ['number'] );
   apple1.poke        = wasm_instance.cwrap("sys_mem_cpu_wr", null, ['number', 'number'] );
   apple1.ticks       = wasm_instance.cwrap("sys_ticks", 'number');
   apple1.iec_emulate = wasm_instance.cwrap("sys_iec_emulate", 'bool');

   apple1.nano_next_byte_to_send = wasm_instance.cwrap("sys_nano_next_byte_to_send", null, ['number'] );
   apple1.print_pc = wasm_instance.cwrap("sys_print_pc", null );
}

export function get_wasm_instance() { 
   return wasm_instance; 
}


