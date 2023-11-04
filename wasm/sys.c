#include <stdint.h>
#include <stdbool.h>
#include <emscripten/emscripten.h>

typedef uint8_t byte;
typedef uint16_t word;

#define CHIPS_ASSERT(c) 1
#include <assert.h>

#define CHIPS_IMPL

#define TMS9928 1

#include "chips/m6502.h"
#include "chips/mem.h"
#include "chips/clk.h"
#include "systems/apple1.h"

#include "roms/apple1-roms.h"

#ifdef TMS9928
#include "vdp.c"
#endif

apple1_desc_t desc;
apple1_t sys;

/*
// old pixel buffer for 6561
#define PIXBUFSIZE (708864)
unsigned char pixel_buffer[PIXBUFSIZE];
*/

/*
// old 6561 end of frame callback
void end_frame_cb(void* user_data) {
   byte unused = (byte) EM_ASM_INT({ m6561_screen_update($0); }, pixel_buffer );
}
*/

#define AUDIOBUFSIZE (4096)
float audio_buffer[AUDIOBUFSIZE];

void audio_cb(const float* samples, int num_samples, void* user_data) {
   byte unused = (byte) EM_ASM_INT({ audio_buf_ready($0, $1); }, samples, num_samples );
}

EMSCRIPTEN_KEEPALIVE
void sys_init() {

   desc.user_data = NULL;                            /* optional user-data for callback functions */

   // old 6561 video
   // desc.pixel_buffer = pixel_buffer;              /* pointer to a linear RGBA8 pixel buffer, query required size via apple1_max_display_size() */
   // desc.pixel_buffer_size = PIXBUFSIZE;           /* size of the pixel buffer in bytes */
   // desc.end_frame_cb = end_frame_cb;

   // audio
   desc.audio_cb = audio_cb;                         /* called when audio_num_samples are ready */
   desc.audio_buffer = audio_buffer;
   desc.audio_num_samples = AUDIOBUFSIZE;
   desc.audio_sample_rate = 48000;                   /* playback sample rate in Hz, default is 44100 */

   apple1_init(&sys, &desc);

#ifdef TMS9928
   vdp_init();
#endif
}

EMSCRIPTEN_KEEPALIVE
void sys_reset() {
   apple1_reset(&sys);
}

EMSCRIPTEN_KEEPALIVE
void sys_exec_us(uint32_t msec) {
   apple1_exec(&sys, msec);
}

EMSCRIPTEN_KEEPALIVE
void sys_load_prg(uint8_t *bytes, int num_bytes) {
   apple1_load_prg(&sys, bytes, num_bytes);
}

EMSCRIPTEN_KEEPALIVE
uint8_t sys_mem_cpu_rd(uint16_t address) {
   return mem_rd(&sys.mem_cpu, address);
}

EMSCRIPTEN_KEEPALIVE
void sys_mem_cpu_wr(uint16_t address, uint8_t data) {
   mem_wr(&sys.mem_cpu, address, data);
}

EMSCRIPTEN_KEEPALIVE
void sys_dump() {
   // byte unused = (byte) EM_ASM_INT({ console.log($0, $1); }, t, sys.vic.regs[t] );
}

EMSCRIPTEN_KEEPALIVE
int sys_ticks() {
   return sys.ticks;
}

EMSCRIPTEN_KEEPALIVE
void sys_nano_next_byte_to_send(uint8_t data) {
   sys.nano.data = data;
}

EMSCRIPTEN_KEEPALIVE
void sys_print_pc() {
   uint16_t pc = sys.cpu.PC;
   byte unused = (byte) EM_ASM_INT({ console.log(hex($0,4)); }, pc );
}

EMSCRIPTEN_KEEPALIVE
void sys_iec_emulate(bool emulate) {
   sys.iec.emulate = emulate;   
}
