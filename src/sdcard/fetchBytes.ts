export async function fetchBytes(name: string) {
   try
   {
      const response = await fetch(`software/${name}`);
      if(response.status === 404) {
         console.log(`file "${name}" not found`);
         return new Uint8Array();
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return bytes;
   }
   catch(err)
   {
      console.log(err);
      return new Uint8Array();      
   }
}

