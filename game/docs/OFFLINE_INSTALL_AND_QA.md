# Offline game installation and troubleshooting

## Windows
1. Extract the v1.4 ZIP to a normal folder; do not open the HTML inside ZIP preview.
2. Double-click **Open_River_Valley_Windows.cmd** or right-click `River_Valley_Family_Adventure_OFFLINE.html` and open with Chrome / Edge. It embeds every gameplay script, model and geographic resource; no network request is needed for the game.
3. If Windows blocks the batch file, use the HTML directly. This is a browser game, not a native `.exe`.
4. The browser may block downloads/camera screenshots under `file://`. All core game interactions are designed to operate without a server.

## iPhone / iPad
1. **Do not use iOS Files Quick Look to run the HTML game.** It is a document viewer, not a general-purpose browser environment.
2. Visit the game's HTTPS `/game.html` page in Safari, start it, and leave it online until Settings says **Offline game cached**.
3. In Safari, select **Share > Add to Home Screen**; open from that icon once while connected.
4. Close the page, turn on Airplane Mode, relaunch from the Home Screen icon and verify movement and inventory. If it fails, return online and recache. The browser may evict caches to reclaim storage.
5. Saves are **device-local** and are not synced across different browsers or devices.

## Caveats
The v1.4 service worker caches both `/game.html` and `/game` and provides a tested simulated offline reply; a real airplane-mode device test remains outstanding. A native Windows installer or iOS IPA was not built.
