export function rset(s: string|number, len: number, ch?: string) {
   s = String(s);
   if(ch==undefined) ch = " ";
   return ch.repeat(len - s.length) + s;
}

export function lset(s: string|number, len: number, ch?: string) {
   s = String(s);
   if(ch==undefined) ch = " ";
   return (s + ch.repeat(15)).substring(0, len);
}

export function stringToArray(s: string) {
   return s.split("").map(e=>e.charCodeAt(0));
}

export function stringToUint8Array(s: string) {
   return new Uint8Array(stringToArray(s));
}

export function arrayToString(a: any[]) {
   return a.map(e=>String.fromCharCode(e)).join("");
}

(window as any).lset = lset;