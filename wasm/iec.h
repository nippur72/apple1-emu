typedef struct {

   uint8_t DIN;       // data from drive to cpu 
   uint8_t CLKIN;     // clock from drive to cpu
   uint8_t DOUT;      // data out to IEC bus 
   uint8_t CLKOUT;    // clock out to IEC bus
   uint8_t ATNOUT;    // attention out to IEC bus

   uint8_t last_DIN;       
   uint8_t last_CLKIN;     
   uint8_t last_DOUT;      
   uint8_t last_CLKOUT;    
   uint8_t last_ATNOUT;    

   uint8_t FA;
   uint8_t SA;

   uint8_t EOI;       // end of transmission

   int clk_div_counter;

   int state; 
   bool is_resetting;  

   int ticks;
   int timer;

   bool talk_asked;
   bool is_command_byte;
   uint8_t received_byte;
   uint8_t bit_counter;

   uint8_t outr;
   uint8_t inpr;
   uint8_t ddr;

   uint8_t send_byte;
   bool is_last_byte;

   bool emulate;
   uint8_t device;

} iec_t;

#define ASSERTED 0
#define RELEASED 1

#define IEC_STATE_RESET                 1
#define IEC_STATE_IDLE                  2
#define IEC_STATE_ATN_RECEIVED          3
#define IEC_STATE_ATN_RECEIVED1         31
#define IEC_STATE_CPU_WANT_TO_SEND      4
#define IEC_STATE_CPU_WANT_TO_SEND1     41
#define IEC_STATE_BYTE_START            5
#define IEC_STATE_BIT_WAIT              6
#define IEC_STATE_BIT_RECEIVE           7
#define IEC_STATE_BYTE_END              8
#define IEC_STATE_BYTE_NEXT             9
#define IEC_STATE_TURNAROUND            10
#define IEC_STATE_TURNAROUND1           11
#define IEC_STATE_TALKER_WANT_TO_SEND   12
#define IEC_STATE_TALKER_BYTE_START     13
#define IEC_STATE_TALKER_BIT_PREPARE    14
#define IEC_STATE_TALKER_BIT_COMPLETE   15
#define IEC_STATE_TALKER_BYTE_END       16
#define IEC_STATE_TALKER_BYTE_END1      17

#define IEC_CLK_DIV     1
#define IEC_TIMEOUT_MAX (4000000/IEC_CLK_DIV)

#define debug2(msg,data)  { byte unused = (byte) EM_ASM_INT({ console.log((msg), $0); }, (data) ); }
#define debug(msg)        { byte unused = (byte) EM_ASM_INT({ console.log((msg)); } ); }

void iec_reset(iec_t *iec) {
   iec->clk_div_counter = 0;
   iec->is_resetting = true; 
   iec->ticks = 0;
   iec->is_command_byte = false;
   iec->talk_asked = false;
   iec->emulate = true;
}

void iec_tick(iec_t *iec) {

   if(!iec->emulate) return;

   iec->ticks++;
   iec->timer++;

   // slow down IEC
   iec->clk_div_counter++;
   if(iec->clk_div_counter < (IEC_CLK_DIV-1)) return;
   iec->clk_div_counter = 0;

   // signal analyzer
   if(
      iec->DIN    != iec->last_DIN    ||
      iec->CLKIN  != iec->last_CLKIN  ||
      iec->DOUT   != iec->last_DOUT   ||
      iec->CLKOUT != iec->last_CLKOUT ||
      iec->ATNOUT != iec->last_ATNOUT 
   ) {
      byte unused = (byte) EM_ASM_INT({ probe($0,$1,$2,$3,$4,$5); }, 
         iec->ticks,
         iec->DIN,   
         iec->CLKIN,
         iec->DOUT,  
         iec->CLKOUT,
         iec->ATNOUT
      );         
   }

   iec->last_DIN    = iec->DIN;
   iec->last_CLKIN  = iec->CLKIN;
   iec->last_DOUT   = iec->DOUT;
   iec->last_CLKOUT = iec->CLKOUT;
   iec->last_ATNOUT = iec->ATNOUT;

   //if((iec->outr & 0b00011100) != (iec->last_outr & 0b00011100)) {   
   //if((iec->outr & 0b00001100) != (iec->last_outr & 0b00001100)) {
   //   byte ATN = ~(iec->outr >> 2) & 1;
   //   byte CLK = ~(iec->outr >> 3) & 1;
   //   byte D   = ~(iec->outr >> 4) & 1;
   //   byte unused = (byte) EM_ASM_INT({ console.log(`ATN=${$0} CLK=${$1} D=${$2}`); }, ATN, CLK, D); 
   //   //byte unused = (byte) EM_ASM_INT({ console.log(`ATN=${$0} CLK=${$1}`); }, ATN, CLK); 
   //} 

   /*
   if(iec->outr & (1<<4) != (iec->last_outr& (1<<4)))) {            
      debug("DOUT changed to ", (iec->outr >> 4) & 1);
   }*/

   /*
   if(iec->outr != iec->last_outr) {            
      debug("VIA.PB.OUTR changed to ", iec->outr);
   }

   if(iec->inpr != iec->last_inpr) {            
      debug("VIA.PB.INPR changed to ", iec->inpr);
   }

   if(iec->ddr != iec->last_ddr) {            
      debug("VIA.PB.DDR changed to ", iec->ddr);
   }
   */

   int next_state = -1;

   if(iec->is_resetting) {
      iec->DIN = RELEASED;      // release the stata (normal state)
      iec->CLKIN = RELEASED;    // release the clock (normal state)
      iec->is_resetting = false;
      iec->state = -1;
      next_state = IEC_STATE_RESET;
   }

   // process states
   if(iec->state == IEC_STATE_RESET) {  
      if(iec->ATNOUT == RELEASED && iec->CLKOUT == RELEASED && iec->DOUT == RELEASED) {         
         next_state = IEC_STATE_IDLE;
      }
   }
   else if(iec->state == IEC_STATE_IDLE) {
      if(iec->ATNOUT == ASSERTED) {                  
         next_state = IEC_STATE_ATN_RECEIVED;
      }
   }
   else if(iec->state == IEC_STATE_ATN_RECEIVED) {
      if(iec->CLKOUT == ASSERTED) {
         iec->timer = 0;
         next_state = IEC_STATE_ATN_RECEIVED1;
      }
   }
   else if(iec->state == IEC_STATE_ATN_RECEIVED1) {     
      if(iec->timer > 60) {         
         iec->DIN = ASSERTED;  
         next_state = IEC_STATE_CPU_WANT_TO_SEND;         
      }
   }
   else if(iec->state == IEC_STATE_CPU_WANT_TO_SEND) {        
      if(iec->CLKOUT == RELEASED) {         
         iec->timer = 0;         
         next_state = IEC_STATE_CPU_WANT_TO_SEND1;
      }
   }
   else if(iec->state == IEC_STATE_CPU_WANT_TO_SEND1) {        
      if(iec->timer > 100) {
         iec->DIN = RELEASED;
         iec->timer = 0;         
         next_state = IEC_STATE_BYTE_START;
      }
   }
   else if(iec->state == IEC_STATE_BYTE_START) {      
      if(iec->timer > 200 && iec->timer < 260 && iec->ATNOUT == 1) {         
         iec->DIN = ASSERTED;
         iec->EOI = 1;         
      }
      else {         
         iec->DIN = RELEASED;
      }

      if(iec->CLKOUT == ASSERTED) {
         iec->bit_counter = 0;
         next_state = IEC_STATE_BIT_WAIT;
      }
   }   
   else if(iec->state == IEC_STATE_BYTE_END) {
      if(iec->timer < 60) {
         iec->DIN = RELEASED;         
      }
      else if(iec->timer < 120) {
         iec->DIN = ASSERTED;         
      }
      else {               
         bool listen   = iec->is_command_byte && iec->received_byte >= 0x20 && iec->received_byte < 0x3f;
         bool unlisten = iec->is_command_byte && iec->received_byte == 0x3f;
         bool talk     = iec->is_command_byte && iec->received_byte >= 0x40 && iec->received_byte < 0x5f;
         bool untalk   = iec->is_command_byte && iec->received_byte == 0x5f;
         bool open     = iec->is_command_byte && iec->received_byte >= 0x60 && iec->received_byte <= 0x6f;
         bool close    = iec->is_command_byte && iec->received_byte >= 0xe0 && iec->received_byte <= 0xef;
         bool fopen    = iec->is_command_byte && iec->received_byte >= 0xf0 && iec->received_byte <= 0xff;
         uint8_t device_number = iec->received_byte & 0b00011111;
         uint8_t channel       = iec->received_byte & 0b00001111;  

         if(talk) iec->talk_asked = true;

         // send received byte to javascript
         if(iec->is_command_byte) {
            if(listen)   { byte unused = (byte) EM_ASM_INT({ iec_received_command_listen($0,$1); }, device_number, iec->ticks); }
            if(unlisten) { byte unused = (byte) EM_ASM_INT({ iec_received_command_unlisten($0);  }, iec->ticks); }
            if(talk)     { byte unused = (byte) EM_ASM_INT({ iec_received_command_talk($0,$1);   }, device_number, iec->ticks); }
            if(untalk)   { byte unused = (byte) EM_ASM_INT({ iec_received_command_untalk($0);    }, iec->ticks); }
            if(open)     { byte unused = (byte) EM_ASM_INT({ iec_received_command_open($0,$1);   }, channel, iec->ticks); }
            if(close)    { byte unused = (byte) EM_ASM_INT({ iec_received_command_close($0,$1);  }, channel, iec->ticks); }
            if(fopen)    { byte unused = (byte) EM_ASM_INT({ iec_received_command_fopen($0,$1);  }, channel, iec->ticks); }          
         }
         else {
            byte unused = (byte) EM_ASM_INT({ iec_received_data($0,$1); }, iec->received_byte, iec->ticks);            
         }

         if(untalk) {
            iec->talk_asked = false;
         }
                                     
         if(unlisten || untalk) {
            iec->DIN = RELEASED;
            next_state = IEC_STATE_RESET;                  
         }
         else if(open && iec->talk_asked) {
            iec->DIN = RELEASED;
            next_state = IEC_STATE_TURNAROUND;
         }
         else {
             next_state = IEC_STATE_ATN_RECEIVED;                  
         }                          
      }
   }   
   else if(iec->state == IEC_STATE_BIT_WAIT) {
      if(iec->CLKOUT == RELEASED) {
         uint8_t bit = iec->DOUT & 1;
         iec->received_byte = (bit << 7) | (iec->received_byte >> 1);
         iec->bit_counter++;
         next_state = IEC_STATE_BIT_RECEIVE;
      }
   }
   else if(iec->state == IEC_STATE_BIT_RECEIVE) {      
      if(iec->CLKOUT == ASSERTED) {
         if(iec->bit_counter < 8) {
            next_state = IEC_STATE_BIT_WAIT;
         }
         else {
            //byte unused = (byte) EM_ASM_INT({ console.log(`*** BYTE=$${$0.toString(16)} ${String.fromCharCode($0)}`); }, iec->received_byte);                     
            iec->is_command_byte = iec->ATNOUT == 0;
            iec->timer = 0;                             
            next_state = IEC_STATE_BYTE_END;            
         }
      }
   }
   else if(iec->state == IEC_STATE_BYTE_NEXT) {
      if(iec->CLKOUT == RELEASED) {
         next_state = IEC_STATE_ATN_RECEIVED;
      }
   }
   else if(iec->state == IEC_STATE_TURNAROUND) {
      if(iec->CLKOUT == RELEASED && iec->ATNOUT == RELEASED && iec->DIN == RELEASED) {
         iec->CLKIN = RELEASED;
         iec->timer = 0;
         next_state = IEC_STATE_TURNAROUND1;
         //debug2("turnaround @", iec->ticks);
      }
   }
   else if(iec->state == IEC_STATE_TURNAROUND1) {
      if(iec->timer < 60) {
         iec->CLKIN = RELEASED;
      }
      else if(iec->timer < 120) {
         iec->CLKIN = ASSERTED;
      }
      else {
         bool nothing_to_send = (bool) EM_ASM_INT({ return iec_nothing_to_send(); });      
         if(nothing_to_send) {
            debug2("nothing_to_send", nothing_to_send);
            iec->talk_asked = false;
            iec->CLKIN = RELEASED;
            iec->DIN = RELEASED;
            next_state = IEC_STATE_RESET;
         }
         else {
            debug2("something to send", nothing_to_send);
            iec->CLKIN = RELEASED;
            next_state = IEC_STATE_TALKER_WANT_TO_SEND;
         }
      }
   }
   else if(iec->state == IEC_STATE_TALKER_WANT_TO_SEND) {
      if(iec->DOUT == RELEASED) {
         //debug2("talker want to send @", iec->ticks);
         iec->timer = 0;         
         iec->is_last_byte = (bool) EM_ASM_INT({ return iec_is_last_byte(); });      
         iec->send_byte = (uint8_t) EM_ASM_INT({ return iec_get_send_byte(); }); 
         next_state = IEC_STATE_TALKER_BYTE_START;
      }
   }
   else if(iec->state == IEC_STATE_TALKER_BYTE_START) {
      if((iec->is_last_byte==true && iec->timer > 800) || (iec->is_last_byte==false && iec->timer > 60)) {

         //debug("BYTE START");
         //if(last_byte) { debug("it's last byte"); }
         //else { debug("it isn't last byte"); }
         // note: EOI response from CPU is just ignored for now
         iec->CLKIN = ASSERTED;
         iec->timer = 0;
         iec->bit_counter = 0;
         next_state = IEC_STATE_TALKER_BIT_PREPARE;
      }
   }
   else if(iec->state == IEC_STATE_TALKER_BIT_PREPARE) {
      if(iec->timer > 80) {
         //debug2("sending bit", iec->bit_counter);
         //debug2("at @", iec->ticks);         
         uint8_t byte = iec->send_byte;
         uint8_t bit = (byte >> (iec->bit_counter)) & 1;
         iec->DIN = bit;
         iec->CLKIN = RELEASED;
         iec->timer = 0;
         next_state = IEC_STATE_TALKER_BIT_COMPLETE;
      }
   }
   else if(iec->state == IEC_STATE_TALKER_BIT_COMPLETE) {
      if(iec->timer > 80) {
         //debug("bit sent");
         //debug2("at @", iec->ticks);
         iec->bit_counter++;
         if(iec->bit_counter == 8) {
            // byte has ended            
            iec->bit_counter = 0;            
            iec->CLKIN = ASSERTED;
            next_state = IEC_STATE_TALKER_BYTE_END;
            //debug2("byte end @", iec->ticks);
         }
         else {
            // continue with next bit
            iec->CLKIN = ASSERTED;
            iec->timer = 0;
            next_state = IEC_STATE_TALKER_BIT_PREPARE;
         }
      }
   }
   else if(iec->state == IEC_STATE_TALKER_BYTE_END) {
      if(iec->DOUT == ASSERTED) {
         //debug2("byte end dout asserted @", iec->ticks);
         iec->timer = 0;
         next_state = IEC_STATE_TALKER_BYTE_END1;
      }
   }
   else if(iec->state == IEC_STATE_TALKER_BYTE_END1) {
      if(iec->timer > 60) {
         //debug("cpu data byte accepted");         
         uint8_t b = iec->send_byte;
         byte unused = (byte) EM_ASM_INT({ iec_sent_data_to_cpu($0,$1); }, b, iec->ticks);            
                  
         //if(iec->last_byte) { debug("no more to send"); }
         //else { debug("sending next byte"); }
      
         iec->CLKIN = RELEASED;
         iec->DIN = RELEASED;
         iec->timer = 0;

         if(iec->is_last_byte) next_state = IEC_STATE_RESET;      
         else                  next_state = IEC_STATE_TALKER_WANT_TO_SEND;      
      }
   }

   // advance to next state
   if(next_state != -1 && iec->state != next_state) {
      iec->state = next_state;      
      //if(next_state == IEC_STATE_RESET)            { debug("going to state: RESET"); }
      //if(next_state == IEC_STATE_IDLE)             { debug("going to state: IDLE");  }
      //if(next_state == IEC_STATE_ATN_RECEIVED)     { debug("going to state: ATN_RECEIVED");  }
      //if(next_state == IEC_STATE_CPU_WANT_TO_SEND) { debug("going to state: CPU_WANT_TO_SEND");  }      
      //if(next_state == IEC_STATE_BYTE_START)       { debug("going to state: BYTE_START");  }
      //if(next_state == IEC_STATE_BYTE_NEXT)        { debug("going to state: BYTE_NEXT");  }
      //if(next_state == IEC_STATE_BIT_WAIT)         { debug("going to state: BIT_WAIT");  }
      //if(next_state == IEC_STATE_BIT_RECEIVE)      { debug("going to state: BIT_RECEIVE");  }
      //if(next_state == IEC_STATE_BYTE_END)         { debug("going to state: EOI1");  }
   }
}


