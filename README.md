# APPLE-1

Apple-1 emulator for the browser.

Based on the work of Andre Weissflog:

https://github.com/floooh/chips-test
Copyright (c) 2017 Andre Weissflog

Open the Apple-1 emulator directly in your browser: [apple1-emu](https://nippur72.github.io/apple1-emu/)


## KEYS

- `Break` resets the Apple-1
- `Home` clears the display
- `CTRL` + `ALT` + `Break` clears RAM and reset the Apple-1
- `PageUp`/`PageDown` switches video output between standard display and TMS9918

## Special hardware

- TMS9918 (VDP) mapped on `$CC00`-`$CC01`
- MOS6522 (VIA) mapped on `$A000`-`$A0FF` 
- P-LAB SD CARD interface connected to VIA



