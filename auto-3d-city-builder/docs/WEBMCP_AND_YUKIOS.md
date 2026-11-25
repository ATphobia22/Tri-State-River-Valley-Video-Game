# WebMCP + YukiOS integration notes

## WebMCP ([ATphobia22/webmcp](https://github.com/ATphobia22/webmcp))

In-page agent tools via `document.modelContext.registerTool`.

**Viewer module:** `viewer/webmcp_tools.js`

| Tool | Purpose |
|------|---------|
| `set-camera-preset` | hero / cinematic / topdown / river / free |
| `get-river-status` | USGS Mount Vernon gages |
| `toggle-photo-mode` | Photo mode on/off |
| `open-minigame` | hunt / fish / farm / artifact / historic |

Wire after scene ready:

```js
const mcp = await RiverValleyWebMCP.registerRiverValleyTools({
  setCameraPreset: (p) => { /* existing preset switch */ },
  photoMode: (on) => { /* existing photo toggle */ },
});
console.log(mcp.webmcpAvailable, mcp.list());
```

Polyfill for testing: `@w3c/webmcp-polyfill`. No-op when `document.modelContext` is absent.

## YukiOS ([ATphobia22/YukiOS](https://github.com/ATphobia22/YukiOS))

Browser multi-environment desktop (macOS / Windows 11 / Hyprland / Yuki Deck / 3D OS).

| Mode | How |
|------|-----|
| Web app shortcut | Custom App Creator → URL to `open_world.html` or GitHub Pages game |
| Yuki Deck | Family game + mini-games as library entries |
| 3D OS Mode | Monitor interaction can open the open-world viewer iframe |

Persistent IndexedDB in YukiOS is separate from game `localStorage` key `rv-family-progress-v1`.

## FFmpeg / libvpx

See `CUTSCENE_FFMPEG_LIBVPX.md` and `cutscenes/export_webm_libvpx.sh`.
