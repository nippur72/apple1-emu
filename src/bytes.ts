import { apple1 } from "./emscripten_wrapper";

export function hex(value: number, size?: number) {
   if(size === undefined) size = 2;
   let s = "0000" + value.toString(16);
   return s.substr(s.length - size);
}

declare function mem_read(address: number): number;

export function mem_read_word(address: number) {
   const lo = mem_read(address + 0);
   const hi = mem_read(address + 1);
   return lo+hi*256;
}

export function dump(start: number, end: number, rows: number) {
   if(rows==undefined) rows=16;
   let s="\r\n";
   for(let r=start;r<=end;r+=rows) {
      s+= hex(r, 4) + ": ";
      for(let c=0;c<rows && (r+c)<=end;c++) {
         const byte = apple1.peek(r+c);
         s+= hex(byte)+" ";
      }
      for(let c=0;c<rows && (r+c)<=end;c++) {
         const byte = apple1.peek(r+c);
         s+= (byte>32 && byte<127) ? String.fromCharCode(byte) : '.' ;
      }
      s+="\n";
   }
   console.log(s);
}
