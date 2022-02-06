#pragma once

/*
    TODO license/header here
*/

#include <stdint.h>
#include <stdbool.h>

#include "../roms/wozmon.h"

#ifdef TMS9918
#include "../tms9928.h"
extern tms9928_t vdp;
#endif

#ifdef __cplusplus
extern "C" {
#endif

// clock 1.023 kHz  (0.960 KHz effective)
// refresh clocks: 4 out of 65 cycles

#define APPLE1_FREQUENCY (1023000)

// audio sample data callback
typedef void (*apple1_audio_callback_t)(const float* samples, int num_samples, void* user_data);

// config parameters for apple1_init()
typedef struct {    

    // old 6561 pixel buffer
    // /* video output config (if you don't want video decoding, set these to 0) */
    // void* pixel_buffer;         /* pointer to a linear RGBA8 pixel buffer,
    //                                query required size via apple1_max_display_size() */
    // int pixel_buffer_size;      /* size of the pixel buffer in bytes */

    /* optional user-data for callback functions */
    void* user_data;

    /* audio output config (if you don't want audio, set audio_cb to zero) */
    apple1_audio_callback_t audio_cb;  /* called when audio_num_samples are ready */
    float *audio_buffer;            /* buffer containing audio samples */
    int audio_num_samples;          /* size of the audio buffer */
    int audio_sample_rate;          /* playback sample rate in Hz, default is 44100 */

} apple1_desc_t;

// Apple1 emulator state
typedef struct {
   uint64_t pins;
   m6502_t cpu;

   bool valid;
   mem_t mem_cpu;              // CPU-visible memory mapping

   void* user_data;
   // old 6561 pixel buffer
   // uint32_t* pixel_buffer;
   apple1_audio_callback_t audio_cb;
   int num_samples;
   int sample_pos;
   float* sample_buffer;

   uint8_t ram[65536];
   uint8_t woz_rom[1024];

   uint32_t ticks;             // CPU tick counter
   int blink_counter;          // hardware cursor blink counter
   bool display_ready;         // display ready bit

} apple1_t;

// initialize a new Apple1 instance
void apple1_init(apple1_t* sys, const apple1_desc_t* desc);

// discard Apple1 instance
void apple1_discard(apple1_t* sys);

// reset a Apple1 instance
void apple1_reset(apple1_t* sys);

// tick Apple1 instance for a given number of microseconds
void apple1_exec(apple1_t* sys, uint32_t micro_seconds);

// ...or optionally: tick the Apple1 instance once, does not update keyboard state!
void apple1_tick(apple1_t* sys);

// quickload a .prg file
bool apple1_load_prg(apple1_t* sys, const uint8_t* ptr, int num_bytes);

#ifdef __cplusplus
} /* extern "C" */
#endif

/*-- IMPLEMENTATION ----------------------------------------------------------*/
#ifdef CHIPS_IMPL
#include <string.h> /* memcpy, memset */
#ifndef CHIPS_ASSERT
   #include <assert.h>
   #define CHIPS_ASSERT(c) assert(c)
#endif

#define _APPLE1_DEFAULT(val,def) (((val) != 0) ? (val) : (def));
#define _APPLE1_CLEAR(val) memset(&val, 0, sizeof(val))

void apple1_init(apple1_t* sys, const apple1_desc_t* desc) {
   CHIPS_ASSERT(sys && desc);

   // old 6561 pixel buffer
   // CHIPS_ASSERT(!desc->pixel_buffer || (desc->pixel_buffer_size >= _apple1_DISPLAY_SIZE));

   memset(sys, 0, sizeof(apple1_t));
   sys->valid = true;

   sys->user_data = desc->user_data;
   sys->audio_cb = desc->audio_cb;
   sys->sample_buffer = desc->audio_buffer;
   sys->num_samples = desc->audio_num_samples;

   m6502_desc_t cpu_desc;
   _APPLE1_CLEAR(cpu_desc);
   sys->pins = m6502_init(&sys->cpu, &cpu_desc);

   // maps Woz monitor ROM
   //CHIPS_ASSERT(desc->rom_kernal && (desc->rom_kernal_size == sizeof(sys->rom_kernal)));
   memcpy(&sys->woz_rom[1024-sizeof(woz_mon)], woz_mon, sizeof(woz_mon));

   mem_init(&sys->mem_cpu);
   mem_map_ram(&sys->mem_cpu, 0, 0x0000, 65536-1024, sys->ram);
   mem_map_rom(&sys->mem_cpu, 0, 0xFC00,       1024, sys->woz_rom);
}

void apple1_discard(apple1_t* sys) {
   CHIPS_ASSERT(sys && sys->valid);
   sys->valid = false;
}

void apple1_reset(apple1_t* sys) {
   CHIPS_ASSERT(sys && sys->valid);
   sys->pins |= M6502_RES;
   sys->ticks = 0;
   // TODO reset TMS9918 as well
   #ifdef TMS9918
   #endif
}

static uint64_t _apple1_tick(apple1_t* sys, uint64_t pins) {

   //**********************************************************************************
   // ticks the display first
   {
      sys->blink_counter++;
      if(sys->blink_counter > 1200000) sys->blink_counter = 0;

      int dot_cnt = sys->ticks % (65*262);
      bool vsync = dot_cnt == 0;
      if(vsync) {
         int cursor_on = sys->blink_counter > 500000 ? 1 : 0;
         byte unused = (byte) EM_ASM_INT({ apple1_screen_update($0); }, cursor_on);
         sys->display_ready = true;
      }
   }
   //**********************************************************************************

   sys->ticks++;

   // ticks the CPU when the dynamic RAM is not refreshing
   // RAM refresh cycles: 5 cycles every scanline (65 cpu ticks)
   int counter_refresh = sys->ticks % 65;
   bool refresh = counter_refresh == 25 || counter_refresh == 35 || counter_refresh == 45 || counter_refresh == 55;
   if(refresh) return pins;

   pins = m6502_tick(&sys->cpu, pins);

   // the IRQ and NMI pins will be set by the peripheral devices
   pins &= ~(M6502_IRQ|M6502_NMI);

   const uint16_t addr = M6502_GET_ADDR(pins);
   const int read = pins & M6502_RW;

   if(addr >= 0xd010 && addr <= 0xd011) {
      // apple1 keyboard is handled in JavaScript
      if(read) {
         byte data = (byte) EM_ASM_INT({ return apple1_read_keyboard_port($0) }, addr);
         M6502_SET_DATA(pins, data);
      }
   }
   else if(addr >= 0xd012 && addr <= 0xd013) {
      // apple1 display
      if(read) {
         byte data = sys->display_ready ? 0x00 : 0x80;
         M6502_SET_DATA(pins, data);
      }
      else {
         if(addr == 0xd012 && sys->display_ready) {
            byte data = M6502_GET_DATA(pins);
            byte unused = (byte) EM_ASM_INT({ display_receivechar($0) }, data);
            sys->display_ready = false;
            sys->blink_counter = 400000;   // reset cursor blinking some steps before "on" state
         }
      }
   }
   #ifdef TMS9918
   // tick the TMS9928 on $A000 - $A001
   else if((addr & 0xFFFE) == 0xA000) {
      // byte unused = (byte) EM_ASM_INT({ console.log('tms access'); }, 0 );
      int MODE = pins & 1;
      int read = pins & M6502_RW;  // CSR

      if(read) {
         // read
         byte data;
         if(MODE == 0) data = tms9928_vram_read(&vdp);
         else          data = tms9928_register_read(&vdp);
         M6502_SET_DATA(pins, data);
         //if(MODE == 0) { byte unused = (byte) EM_ASM_INT({ console.log('tms vram read:', $0); }, data ); }
         //else          { byte unused = (byte) EM_ASM_INT({ console.log('tms reg read:', $0); }, data ); }
      }
      else  {
         byte data = M6502_GET_DATA(pins);
         if(MODE == 0) tms9928_vram_write(&vdp, data);
         else          tms9928_register_write(&vdp, data);
         //if(MODE == 0) { byte unused = (byte) EM_ASM_INT({ console.log('tms vram write:', $0); }, data ); }
         //else          { byte unused = (byte) EM_ASM_INT({ console.log('tms reg write:', $0); }, data ); }
      }
   }
   #endif
   else {
      // regular memory access
      if(read) {
         M6502_SET_DATA(pins, mem_rd(&sys->mem_cpu, addr));
      }
      else {
         mem_wr(&sys->mem_cpu, addr, M6502_GET_DATA(pins));
      }
   }

   return pins;
}

void apple1_tick(apple1_t* sys) {
   sys->pins = _apple1_tick(sys, sys->pins);
}

void apple1_exec(apple1_t* sys, uint32_t micro_seconds) {
   CHIPS_ASSERT(sys && sys->valid);
   uint32_t num_ticks = clk_us_to_ticks(APPLE1_FREQUENCY, micro_seconds);
   uint64_t pins = sys->pins;
   for (uint32_t ticks = 0; ticks < num_ticks; ticks++) {
      pins = _apple1_tick(sys, pins);
   }
   sys->pins = pins;

   #ifdef TMS9918
      // TMS9928
      if(micro_seconds > 10000) {
         for(int t=0;t<262;t++) {
            tms9928_drawline(&vdp);
         }
      }
   #endif
}

void mem_write_word(apple1_t* sys, uint16_t address, uint16_t value) {
	mem_wr(&sys->mem_cpu, address,   (value>>0) & 0xFF);
	mem_wr(&sys->mem_cpu, address+1, (value>>8) & 0xFF);
}

// load a .prg file (2 bytes address header)
bool apple1_load_prg(apple1_t* sys, const uint8_t* ptr, int num_bytes) {
   CHIPS_ASSERT(sys && sys->valid && ptr && (num_bytes > 0));
   if (num_bytes < 2) {
      return false;
   }
   const uint16_t start_addr = ptr[1]<<8 | ptr[0];
   ptr += 2;
   const uint16_t end_addr = start_addr + (num_bytes - 2);
   uint16_t addr = start_addr;
   while (addr < end_addr) {
      mem_wr(&sys->mem_cpu, addr++, *ptr++);
   }

   return true;
}

#endif /* CHIPS_IMPL */
