import { loadBytes } from "./filesystem";

// handles interaction between browser and emulation 

let aspect_apple1 = 1.5;
let aspect_tms9928 = 1.25;

export function onResize() {
   resizeCanvas(document.getElementById("canvas_apple1") as HTMLCanvasElement,  aspect_apple1);
   resizeCanvas(document.getElementById("canvas_tms9928") as HTMLCanvasElement, aspect_tms9928);
}

function resizeCanvas(canvas: HTMLCanvasElement, aspect: number) {
   if(window.innerWidth > (window.innerHeight*aspect))
   {
      canvas.style.width  = `${aspect*100}vmin`;
      canvas.style.height = "100vmin";
   }
   else if(window.innerWidth > window.innerHeight)
   {
      canvas.style.width  = "100vmax";
      canvas.style.height = `${(1/aspect)*100}vmax`;
   }
   else
   {
      canvas.style.width  = "100vmin";
      canvas.style.height = `${(1/aspect)*100}vmin`;
   }
}

export function goFullScreen() 
{
   let canvas = document.getElementById("canvas_apple1") as HTMLCanvasElement;
        if(canvas.requestFullscreen !== undefined) canvas.requestFullscreen();     
   onResize();
}

// **** save state on close ****

window.onbeforeunload = function(e) {
   // saveState();   
};

// **** visibility change ****

window.addEventListener("visibilitychange", function() {
   if(document.visibilityState === "hidden")
   {
      //stopped = true;
      //stopAudio();
   }
   else if(document.visibilityState === "visible")
   {
      //stopped = false;
      //oneFrame();
      //goAudio();
   }
});

// **** drag & drop ****

const dropZone = document.getElementById('screen_apple1')!;

// Optional.   Show the copy icon when dragging over.  Seems to only work for chrome.
dropZone.addEventListener('dragover', function(e) {
   e.stopPropagation();
   e.preventDefault();
   e.dataTransfer!.dropEffect = 'copy';
});

// Get file data on drop
dropZone.addEventListener('drop', e => {
   //audioContextResume();

   e.stopPropagation();
   e.preventDefault();
   const files = e.dataTransfer!.files; // Array of all files

   for(let i=0, f: File; f=files[i]; i++) {                   
      const reader = new FileReader();      
      reader.onload = e2 => droppedFile(f.name, new Uint8Array(e2.target!.result as any));
      reader.readAsArrayBuffer(f); 
   }
});

async function droppedFile(outName: string, bytes: any) {
   const prg = /\.prg$/i;
   if(prg.test(outName)) {     
      throw "not implemented";
      /*
      await writeFile(outName, bytes);
      await crun(outName);
      */
   }

   const woz = /\.woz$/i;
   if(woz.test(outName)) {
      throw "not implemented";
      /*
      let text = [];
      bytes = bytes.map(e=>e==10?13:e); // \n => \r
      bytes.forEach(e=>text.push(String.fromCharCode(Number(e))));  
      text = text.join("");
      paste(text);
      */
   }

   const bin = /\.bin$/i;
   if(bin.test(outName)) {
      throw "not implemented";
      /*
      await writeFile(outName, bytes);
      console.log(`uploaded ${outName}`);
      */
   }
}

function getQueryStringObject(options: any) {
   let a = window.location.search.split("&");
   let o = a.reduce((o, v) =>{
      var kv = v.split("=");
      const key = kv[0].replace("?", "");
      let value: any = kv[1];
           if(value === "true") value = true;
      else if(value === "false") value = false;
      o[key] = value;
      return o;
   }, options);
   return o;
}

let options: any = {
   load: undefined
};

export function getOptions() { return options; }

export async function parseQueryStringCommands() {
   options = getQueryStringObject(options);  

   // if(options.config !== undefined) {
   //    apple1.config(options.config);
   // }

   /*
   if(options.joy !== undefined) {
      apple1.emu_joy(options.joy);
      console.log(`Joystick emulation ${options.joy==1?"enabled":"disabled"}`);
   }
   */

   /*
   if(options.b !== undefined) {
      const encoded_file = options.b;
      let prg = window.atob(encoded_file).split(",").map(i=>Number(i));
      const bytes = new Uint8Array(prg);
      let filename = "binary.prg";
      await writeFile(filename, bytes);
      await crun(filename);
   }
   */

   /*
   if(options.load !== undefined) {
      const name = options.load;
      if(name.startsWith("http")) {
         // external load
         externalLoad("loadPrg", name);
      }
      else {
         // internal load
         await fetchProgram(name);
      }   
   }
   */
}

export async function fetchProgram(name: string)
{
   //console.log(`wanting to load ${name}`);
   try
   {
      const response = await fetch(`software/${name}`);
      if(response.status === 404) return false;
      const bytes = new Uint8Array(await response.arrayBuffer());
      loadBytes(bytes,name);
      return true;
   }
   catch(err)
   {
      console.log(err);
      return false;      
   }
}

