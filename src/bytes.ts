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
