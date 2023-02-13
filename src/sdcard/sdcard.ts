import { saveAs } from "file-saver";
import JSZip from "jszip";

import { default_card } from "./defaultCard";
import { fetchBytes } from "./fetchBytes";
import { rset } from "./string_utils";

export interface ISDCard {
   [key:string]: Uint8Array | ISDCard
}

function isFileEntry(b: Uint8Array | ISDCard): b is Uint8Array {
   return (b as Uint8Array).length !== undefined;
}

interface PrintableDirItem {
   size: string;
   name: string;
   shortname: string;
   type: string;
   address: string; 
}

export class SDCard {

   root: ISDCard;   // hold the whole SD storage
   files: ISDCard;  // points to the current directory

   constructor() {      
      this.root = {};
      this.files = this.root;

      // add some big files
      this.init_from_zip_file();
   }

   // initialize the SD card with the remote big zip file
   async init_from_zip_file() {   
      let bytes = await fetchBytes("sdcard_image.zip");
      let zip = new JSZip();
      await zip.loadAsync(bytes);

      let files = Object.keys(zip.files);

      // create directories
      files.forEach(name => {
         let entry = zip.files[name];
         if(entry.dir) {
            name = name.substring(0,name.length-1);
            this.mkdir(name);
         }
      });

      // create files
      for(let t=0; t<files.length; t++) {
         let name = files[t];
         let entry = zip.files[name];
         if(!entry.dir) {
            let bytes = await zip.file(name)!.async("uint8array");
            name = name.toUpperCase();
            this.writeFile(name, bytes);
         }
      }
   }

   // splits filename into { path, fileName } as in .ino
   split_path(fullpath: string) {
      let x = fullpath.lastIndexOf("/");
      let path, fileName;

      if(x == -1) {
         path = "";
         fileName = fullpath;
      }
      else {
         if(x==0) path = "/";
         else     path = fullpath.substring(0,x);
         fileName = fullpath.substring(x+1);
      }
      return { path, fileName };
   }

   // returns the directory pointed by path or undefined if not found or if it's a file
   getDir(path: string) {      
      let names = path.split("/");
      let cd = path.startsWith("/") ? this.root : this.getCurrentDir();
      for(let t=0; t<names.length; t++) {
         let name = names[t];
         if(name != "") {
            let newdir = cd[name];
            if(newdir == undefined) return undefined;
            if(newdir.length !== undefined) return undefined;  // it's a file            
            cd = cd[name] as ISDCard;
         }
      }
      return cd;
   }

   getCurrentDir() {
      return this.files;
   }

   isDirectory(fullpath: string) {
      let file = this.readFile(fullpath);
      if(file === undefined) throw `${fullpath} not found`;
      if(file.length === undefined) return true;
      else return false;
   }

   getPrintableDir(fullpath: string) {
      let cd: ISDCard;

      if(fullpath == "") {
         cd = this.getCurrentDir();
      }
      else if(fullpath == "/") {
         cd = this.root;
      }
      else {
         let { path, fileName } = this.split_path(fullpath);
         let dir = this.getDir(path);
         if(dir === undefined) return undefined;
         if(dir[fileName] == undefined) return undefined;
         if(dir[fileName].length !== undefined) return undefined;
         cd = dir[fileName] as ISDCard;
      }

      let entries = Object.keys(cd);
      let result: PrintableDirItem[] = [];

      // dirs first
      entries.forEach(e=>{
         if(cd[e].length === undefined) {
            result.push({
               size: "(DIR)",
               name: e,
               shortname: e,
               type: "",
               address: ""
            });
         }
      });
      // then files
      entries.forEach(e=>{
         if(cd[e].length !== undefined) {
            let size = cd[e].length.toString();
            let s = (e+"#").split("#");
            let type = s[1].substring(0, 2);
            let address = s[1].substring(2);
            if(address.length > 0) address = "$" + address;
                 if(type == "06") type = "BIN";
            else if(type == "F1") type = "BAS";
            else if(type == "F8") type = "ASB";
            else if(type.length>0) type = "#" + type;
            result.push({
               size: rset(size, 5),
               name: e,
               shortname: s[0],
               type,
               address
            });
         }
      });
      return result;
   }

   exist(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      return dir[fileName] !== undefined;
   }

   matchname(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);      
      if(dir === undefined) return { list: [], match: undefined };
      let list = Object.keys(dir);
      let match = list.filter(e=>e.startsWith(fileName)).shift();
      if(match !== undefined) {
              if(path == "")  match = match;
         else if(path == "/") match = path+match;
         else                 match = path + "/" + match;      
      }
      return { list, match };
   }

   readFile(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return undefined;
      let file = dir[fileName];
      if(!isFileEntry(file)) return undefined;
      return file;
   }

   writeFile(fullpath: string, data: Uint8Array) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      dir[fileName] = data;
      return true;
   }

   removefile(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      delete dir[fileName];
      return true;
   }

   rmdir(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      delete dir[fileName];
      return true;
   }

   mkdir(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      dir[fileName] = {};
      return true;
   }

   chdir_noargs() {
      this.files = this.root;
      return true;
   }

   chdir(fullpath: string) {
      let { path, fileName } = this.split_path(fullpath);
      let dir = this.getDir(path);
      if(dir === undefined) return false;
      let newdir = dir[fileName];
      if(newdir == undefined || isFileEntry(newdir)) return false;      
      this.files = newdir;
      return true;
   }

   isDirEmpty(dirname: string) {
      let dir = this.getDir(dirname);
      if(dir === undefined) return true;
      let subfiles = Object.keys(dir);
      return subfiles.length == 0;
   }

   download(fullpath: string) {
      let { match } = this.matchname(fullpath);
      if(match === undefined) {
         console.log(`? file not found`);
         return;
      }

      let file = this.readFile(match);
      if(file !== undefined) {
         let bytes = new Uint8Array(file);
         let { fileName } = this.split_path(match);
         let blob = new Blob([bytes], {type: "application/octet-stream"});
         saveAs(blob, fileName);
         console.log(`downloaded "${fileName}"`);
      } else {
         console.log(`error reading file`);
      }
   }
}

