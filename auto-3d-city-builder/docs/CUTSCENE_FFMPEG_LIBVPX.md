# Cutscene export: FFmpeg + libvpx (WebM) and Bink (native)

Sources investigated:
- [FFmpeg](https://github.com/FFmpeg/FFmpeg)
- [libvpx (sailfishos-mirror / WebM project)](https://github.com/sailfishos-mirror/libvpx)
- Prior note: RAD Bink for native / Unreal

## Web path (browser + open_world)

```bash
./cutscenes/export_webm_libvpx.sh capture.mp4 cutscenes/out/dawn_fly.webm web
```

| Preset | CRF | cpu-used | Use |
|--------|-----|----------|-----|
| `web` | 30 | 2 | Default cutscene |
| `high` | 24 | 1 | Higher quality master |
| `preview` | 36 | 5 | Fast draft |

Requires FFmpeg with `--enable-libvpx` and `--enable-libopus`.

VP9 constant quality **requires** `-b:v 0` with `-crf`. Audio: Opus 128k.

## Native path (Unreal / offline installer)

1. Export master from Twinmotion or Unreal Media Capture (ProRes / high bitrate).
2. Encode **Bink** with RAD Video Tools → `.bik` for UE Media Player / Bink plugin.
3. Keep WebM for GitHub Pages / webMCP / YukiOS browser launch; do not replace Bink with generative fill for surveyed content.

## Policy

Never replace surveyed CityGML / footprints / gage data with AI video. Cutscenes are presentation only.
