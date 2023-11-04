import React from "react";

import { Component, KeyboardEventHandler } from "react";

import { PrimaryButton, DefaultButton, Dropdown, IDropdownOption, Pivot, PivotItem, Label, Stack, IStackTokens, Link } from '@fluentui/react';
import { Modal } from "@fluentui/react";
import { ChoiceGroup, IChoiceGroupOption } from "@fluentui/react";
import { Checkbox } from "@fluentui/react";

import { apple1 } from "./emscripten_wrapper";

interface IState {
   showPreferences: boolean;
}

export class Gui extends Component<IState> {

   state = {
      showPreferences: false,
      sdcard_emulated: true
   };

   componentDidMount() {
      document.addEventListener('keydown', this.handleKeyDown);
   }

   componentWillUnmount() {
      document.removeEventListener('keydown', this.handleKeyDown);
   }

   handleKeyDown = (e: KeyboardEvent) => {
      let code = e.code;

      if(code == "F10") {
         // F10 toggle preferences window
         this.setState({ showPreferences: !this.state.showPreferences });
      }
      else if(code == "Escape") {
         // close preferences window if open
         if(this.state.showPreferences) close();
      }
      else {
         //console.log(`key code: ${code}`);
      }
   }

   close = () => {
      this.setState({ showPreferences: false });
   }

   buttonPowerOnOffClick = () => {
      apple1.power();
      this.close();
   }

   buttonCloseClick = () => {
      this.close();
   }

   onChange_SDCardEmulated = (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, isChecked?: boolean) => {
      let sdcard_emulated = isChecked;
      // TODO enable/disable SD Card
      this.setState({ sdcard_emulated });
   }

   /*
   function handleUploadVZ(files: FileList) {
      emulator.droppedFiles(files);
      close();
   }

   function handleChangeMemory(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption|undefined) {
      if(item===undefined) return;
      let memory = String(item.key);
      setMemory(memory);
      emulator.setMemory(memory);
   }

   function handleChangeJoystickConnected(ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, isChecked?: boolean) {
      let joyconn = isChecked==true;
      setJoystick_connected(joyconn);
      emulator.connectJoystick(joyconn);
   }
   */

   /*
   handleChangeMachine = (event: React.FormEvent<HTMLDivElement>, item: IDropdownOption|undefined) => {
      if(item===undefined) return;
      let machine = String(item.key) as machineTypes;
      this.setState({ machine });
      getEmulator().configure(machine);
   }
   */

   render() {
      let {
         showPreferences,
         sdcard_emulated
      } = this.state;

      let {
         onChange_SDCardEmulated,
         buttonCloseClick,
         buttonPowerOnOffClick,
      } = this;

      return (
         <Modal isOpen={showPreferences}>
            <div style={{padding: '2em', minWidth: '640px', maxWidth: '640px'}}>
               <Pivot style={{height: '500px'}}>                  
                  <PivotItem headerText="Memory" headerButtonProps={{'data-order': 2}}>
                     <Label>System memory</Label>
                     <p></p>
                     <Checkbox label="RAM at $1000-$7FFF" checked={sdcard_emulated} onChange={onChange_SDCardEmulated} />
                     <Checkbox label="ROM at $8000-$BFFF" checked={sdcard_emulated} onChange={onChange_SDCardEmulated} />
                     <Checkbox label="RAM at $E000-$EFFF" checked={sdcard_emulated} onChange={onChange_SDCardEmulated} />
                     {/*<Dropdown label="Machine" options={machineOptions} selectedKey={machine} onChange={handleChangeMachine} />*/}
                  </PivotItem>

                  <PivotItem headerText="SD Card" headerButtonProps={{'data-order': 3}}>
                     <Label>SD Card emulation</Label>
                     <p></p>
                     <p>
                        The SD Card interface developed by <Link href="https://p-l4b.github.io/sdcard/" target="_blank">P-LAB Projects</Link> adds
                        mass storage capabilities to the Apple-1, allowing to load and save files to an SD card from
                        a convenient command line interface shell (SD DOS 1.2).
                     </p>
                     <Checkbox label="Enable SD Card" checked={sdcard_emulated} onChange={onChange_SDCardEmulated} />
                  </PivotItem>

                  <PivotItem headerText="About" headerButtonProps={{'data-order': 8}}>
                     <Label>Apple-1 emulator</Label>
                     <p>Written by Antonino Porcino</p>
                     <Link href="https://github.com/nippur72/apple1-emu" target="_blank">Github repo</Link>
                  </PivotItem>

               </Pivot>

               <Stack horizontal horizontalAlign="space-between">
                  <DefaultButton onClick={buttonPowerOnOffClick}>Power OFF/ON</DefaultButton>
                  <PrimaryButton onClick={buttonCloseClick}>Close</PrimaryButton>
               </Stack>

            </div>
         </Modal>
      );
   }
}

/*
function getEmulator(): GPEmulator {
   const instance = (window as any).gp as GPEmulator;
   return instance;
}
*/

/*
                  <PivotItem headerText="Files" headerButtonProps={{'data-order': 1}}>
                     <Label>Programs</Label>
                     {/*
                     <Stack horizontal horizontalAlign="start" tokens={numericalSpacingStackTokens}>
                        {<Uploader value="Load VZ" onUpload={handleUploadVZ} accept=".vz" />}
                        {<DefaultButton onClick={()=>{}} disabled={true}>Save VZ</DefaultButton>}
                     </Stack>
                     * /}
                     {/*
                     <DefaultButton onClick={()=>{}} disabled={true}>Download BINARY memory area</DefaultButton>
                     <UploadButton value="Load cart" onUpload={this.handleUpload} accept=".bin" />
                     <div>Remove cart</div>
                     <div>Load ROM</div>
                     * /}
                     </PivotItem>

                     <PivotItem headerText="CPU" headerButtonProps={{'data-order': 2}}>
                        {/*
                        <Dropdown label="CPU" options={machineOptions} selectedKey={machine} onChange={handleChangeMachine} />
                        <Dropdown label="Memory" options={memoryOptions} selectedKey={memory} onChange={handleChangeMemory} />
                        <div>MC6847 snow: on/off</div>
                     * /}
                     </PivotItem>

                     <PivotItem headerText="Joysticks" headerButtonProps={{'data-order': 2}}>
                        {/*}
                        <Checkbox label="Joystick interface connected" checked={joystick_connected} onChange={handleChangeJoystickConnected} />
                        <ChoiceGroup defaultSelectedKey="B" options={joystickOptions} onChange={_onChange} label="Pick one" required={true} />;
                     * /}
                     </PivotItem>

                     <PivotItem headerText="Tape" headerButtonProps={{'data-order': 3}}>
                        {/*
                        <Uploader value="Load .WAV" onUpload={handleUploadVZ} accept=".wav" />
                        * /}
                        <div>Record file WAV</div>
                        <div>Stop tape</div>
                        <div>cassette audio: on/off</div>

                     </PivotItem>

                     <PivotItem headerText="Disk" headerButtonProps={{'data-order': 4}}>
                        <div>Disk drive interface on/off</div>
                        <div>Load disk in drive 1</div>
                        <div>Load disk in drive 2</div>
                        <div>Download disk in drive 1</div>
                        <div>Download disk in drive 2</div>
                        <div>Unmount disk in drive 1</div>
                        <div>Unmount disk in drive 2</div>
                     </PivotItem>

                     <PivotItem headerText="Printer" headerButtonProps={{'data-order': 5}}>
                        <div>Save printer output</div>
                     </PivotItem>

                     <PivotItem headerText="Video" headerButtonProps={{'data-order': 6}}>
                        <div>Brighness contrast saturation</div>
                        <div>Monochrome output</div>
                        <div>Take snapshot</div>
                     </PivotItem>

                     <PivotItem headerText="Text files" headerButtonProps={{'data-order': 7}}>
                        <div>Load text file</div>
                        <div>Paste clipboard text</div>
                     </PivotItem>
   */