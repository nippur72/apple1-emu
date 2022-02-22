
let wasm_instance;

let apple1 = { };

function load_wasm() {

   return new Promise((resolve,reject)=>{

      // emscripten_module.js exports "emscripten_module" globally

      let instance = emscripten_module({ wasmBinary: emscripten_wasm_binary, onRuntimeInitialized: ()=>{
         // makes C exported functions available globally

         apple1.init     = instance.cwrap("sys_init", null);
         apple1.exec_us  = instance.cwrap("sys_exec_us", ['number']);
         apple1.reset    = instance.cwrap("sys_reset", null);
         apple1.load_prg = instance.cwrap("sys_load_prg", null, ['array', 'number'] );
         apple1.peek     = instance.cwrap("sys_mem_cpu_rd", 'number', ['number'] );
         apple1.poke     = instance.cwrap("sys_mem_cpu_wr", null, ['number', 'number'] );
         apple1.ticks    = instance.cwrap("sys_ticks", 'number');

         apple1.nano_next_byte_to_send = instance.cwrap("sys_nano_next_byte_to_send", null, ['number'] );
         apple1.print_pc = instance.cwrap("sys_print_pc", null );

         // export instance globally (not strictly required)
         wasm_instance = instance;

         // finished
         resolve();
      }});
   });
}
