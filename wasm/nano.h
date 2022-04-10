typedef struct {

   uint8_t data_in;      // data coming from VIA port PA 
   uint8_t data_out;     // data going into VIA port PA 

   uint8_t mcu_strobe;   // MCU_STROBE pin (PB7 on the VIA)
   uint8_t cpu_strobe;   // CPU_STROBE pin (PB0 on the VIA)
   
   int timeout_cnt;   

   int state;
   int next_state;
   int data;

   int clk_div_counter;
   int direction_change_counter;

} nano_t;

const int HIGH = 1;
const int LOW  = 0;

void nano_init(nano_t *nano) {
   nano->timeout_cnt = 0;
}

int nano_byte_received(nano_t *nano) {      
   return EM_ASM_INT({ return nano_byte_received($0); }, nano->data );
}

int nano_byte_sent(nano_t *nano) {
  return EM_ASM_INT({ return nano_byte_sent($0); }, nano->data );
}

void nano_timeout(nano_t *nano) {
   byte unused = (byte) EM_ASM_INT({ nano_timeout($0); }, nano->state );
}

bool nano_wait_cpu_strobe(nano_t *nano, int value) {
   if(nano->cpu_strobe == value) return true;     
   nano->timeout_cnt++;
   return false;
}

#define NANO_CLK_DIV     32
#define NANO_TIMEOUT_MAX (4000000/NANO_CLK_DIV)

void nano_tick(nano_t *nano) {

   nano->clk_div_counter++;
   if(nano->clk_div_counter < (NANO_CLK_DIV-1)) return;
   nano->clk_div_counter = 0;

   // clear next state
   nano->next_state = -1;

   if(nano->state == 0) {
      // receive: waiting for CPU strobe
      //if(nano_wait_cpu_strobe(nano, HIGH)) nano->next_state = 1;
      if(nano_wait_cpu_strobe(nano, HIGH)) nano->next_state = 1;
   } 
   else if(nano->state == 1) {
      // receive: responding to CPU HI strobe
      nano->data = nano->data_in;
      nano->mcu_strobe = HIGH;
      nano->next_state = 2;
   } 
   else if(nano->state == 2) {
      // receive: wait for CPU strobe to go low
      if(nano_wait_cpu_strobe(nano, LOW)) nano->next_state = 3;      
   } 
   else if(nano->state == 3) {
      // receive: byte received reply with mcu strobe low
      nano->mcu_strobe = LOW;                  
      nano->next_state = 4;
   } 
   else if(nano->state == 4) {
      nano->next_state = nano_byte_received(nano); 
   } 
   else if(nano->state == 10) {
      // send: provide data and set mcu strobe high
      nano->data_out = nano->data;
      nano->mcu_strobe = HIGH;
      nano->next_state = 11;
   }
   else if(nano->state == 11) {
      // send: waiting for CPU strobe
      if(nano_wait_cpu_strobe(nano, HIGH)) nano->next_state = 12;      
   } 
   else if(nano->state == 12) {
      // send: reply with mcu strobe low
      nano->mcu_strobe = LOW;                  
      nano->next_state = 13;      
   }
   else if(nano->state == 13) {
      // send: wait for CPU strobe to go low
      if(nano_wait_cpu_strobe(nano, LOW)) nano->next_state = 14;      
   } 
   else if(nano->state == 14) {
      nano->next_state = nano_byte_sent(nano);      
   }
   else if(nano->state == 100 || nano->state == 110) {
      nano->direction_change_counter--;
      if(nano->direction_change_counter == 0) {
         if(nano->state == 100) nano->next_state =  0;
         if(nano->state == 110) nano->next_state = 10;
      }
   }

   // ****************

   if(nano->timeout_cnt > NANO_TIMEOUT_MAX) {      
      nano_timeout(nano);
      nano->next_state = 0; // go in receive mode
   }
   
   if(nano->next_state != -1) {
      // state change
      //byte unused = (byte) EM_ASM_INT({ console.log("state transition", $0); }, nano->next_state );
      if(nano->next_state == 10 && nano->state < 10) {
         // byte unused = (byte) EM_ASM_INT({ console.log("NANO TRANSMIT MODE"); }, 0 );
         nano->next_state = 110;
         nano->direction_change_counter = 2;
      }
      if(nano->next_state == 0 && (nano->state >= 10 && nano->state < 100) ) {
         // byte unused = (byte) EM_ASM_INT({ console.log("NANO RECEIVE MODE"); }, 0 );
         nano->next_state = 100;
         nano->direction_change_counter = 2;
      }

      //{
      //   byte unused = (byte) EM_ASM_INT({ console.log($0,$1,hex(mem_read(0xe0))); }, nano->mcu_strobe, nano->cpu_strobe );
      //}

      nano->state = nano->next_state;
      nano->timeout_cnt = 0;      
   }
}
