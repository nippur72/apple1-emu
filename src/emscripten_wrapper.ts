import emscripten_module from "../emscripten_module"

let wasm_instance: any;

interface Apple1 {
   init: ()=>void;
   exec_us: (usec: number) => void;
   reset: ()=>void;
   load_prg: (array: any, location: number) => number;
   peek: (address: number) => number;
   poke: (address: number, value: number) => void;
   ticks: () => number;
   nano_next_byte_to_send: (b: number)=>void;
   print_pc: ()=>void;
};

let apple1: Apple1 = { } as Apple1;

export async function load_wasm() {

   wasm_instance = await emscripten_module();

   // makes C exported functions available globally
   apple1.init     = wasm_instance.cwrap("sys_init", null);
   apple1.exec_us  = wasm_instance.cwrap("sys_exec_us", null, ['number']);
   apple1.reset    = wasm_instance.cwrap("sys_reset", null);
   apple1.load_prg = wasm_instance.cwrap("sys_load_prg", null, ['array', 'number'] );
   apple1.peek     = wasm_instance.cwrap("sys_mem_cpu_rd", 'number', ['number'] );
   apple1.poke     = wasm_instance.cwrap("sys_mem_cpu_wr", null, ['number', 'number'] );
   apple1.ticks    = wasm_instance.cwrap("sys_ticks", 'number');

   apple1.nano_next_byte_to_send = wasm_instance.cwrap("sys_nano_next_byte_to_send", null, ['number'] );
   apple1.print_pc = wasm_instance.cwrap("sys_print_pc", null );
}

export function get_wasm_instance() { 
   return wasm_instance; 
}

export { apple1 };

