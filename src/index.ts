import { createElement } from "react";
import { render } from "react-dom";
import { initializeIcons } from "@fluentui/react";

import { createRoot } from 'react-dom/client';
import { Gui } from "./gui";

// publish functions on the global scope
import "./globals";            

import { load_wasm } from "./emscripten_wrapper";
import { emulator_main } from "./emulator";

import { createTheme, Customizations } from '@fluentui/react';


async function main() {

   console.log("wasm_loaded");
   await load_wasm();

   const theme = createTheme({      
      defaultFontStyle: { fontFamily: 'roboto' }
   });
   Customizations.applySettings({theme});

   // Register icons and pull the fonts from the default SharePoint cdn.
   //initializeIcons('https://unpkg.com/@uifabric/icons/fonts/');
   initializeIcons();

   const mountNode = document.getElementById("mountnode");
   //render(createElement(Gui), mountNode);
   
   const root = createRoot(mountNode!); 
   root.render(createElement(Gui));

   emulator_main();
}

main();

