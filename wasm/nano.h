typedef struct {

   uint8_t data_in;      // data coming from VIA port PA 
   uint8_t data_out;     // data going into VIA port PA 

   uint8_t mcu_strobe;   // MCU_STROBE pin (PB7 on the VIA)
   uint8_t cpu_strobe;   // CPU_STROBE pin (PB0 on the VIA)
   
   int timeout_cnt;   

   int state;
   int next_state;
   int data;

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
  return EM_ASM_INT({ return nano_byte_sent(); }, 0 );
}

void nano_timeout(nano_t *nano) {
   byte unused = (byte) EM_ASM_INT({ nano_timeout($0); }, 0 );
}

bool nano_wait_cpu_strobe(nano_t *nano, int value) {
   if(nano->cpu_strobe == value) return true;     
   nano->timeout_cnt++;
   return false;
}


static int www;

void nano_tick(nano_t *nano) {

   www++;
   if(www < 15) return;
   www = 0;

   // clear next state
   nano->next_state = -1;

   if(nano->state == 0) {
      // receive: waiting for CPU strobe
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

   // ****************

   if(nano->timeout_cnt > 500000/16) {      
      nano_timeout(nano);
      nano->next_state = 0; // go in receive mode
   }
   
   if(nano->next_state != -1) {
      // state change
      //byte unused = (byte) EM_ASM_INT({ console.log("state transition", $0); }, nano->next_state );
      nano->state = nano->next_state;
      nano->timeout_cnt = 0;      
   }
}
