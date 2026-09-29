# Cocoon manual visual assets

All asset paths are configured in `lib/visual-assets.ts`. The background list is empty and other values are `null` until
you supply files: the UI does not request missing placeholder files. Public files
use URLs starting with `/`, without `public/` in the URL.

| Asset | Put the file here | Recommended format and dimensions | Used by |
| --- | --- | --- | --- |
| Background slides | `public/images/backgrounds/cocoon-bg-01.webp`, `cocoon-bg-02.webp`, etc. | WebP or JPEG, 1920 × 1080, 16:9 | `components/ambient-background.tsx`, mounted in `app/page.tsx` |
| Wood texture | `public/images/clipboard-texture.jpg` | JPEG, 1200 × 1800, 2:3; texture only, no baked-in text or clip | `components/notes-panel.tsx` |
| Pixel plant | `public/images/decor/pixel-plant.png` | Transparent PNG, 96 × 128, 3:4 | `TaskCardPlant` in `components/workspace-decorations.tsx`, mounted on the Add Task card |
| Pixel cloud or stars | `public/images/decor/pixel-cloud.png` | Transparent PNG, 128 × 64, 2:1 | `components/workspace-decorations.tsx`, cloud slot |
| Desk object/illustration | `public/images/decor/pixel-desk-object.png` | Transparent PNG, 96 × 96, 1:1 | `components/workspace-decorations.tsx`, desk slot |

These are target dimensions, not restrictions. Pixel art may use smaller source
images at integer scaling (for example a 32 × 32 icon shown at 96 × 96). Keep
transparent margins modest. Decorative assets should contain no essential text.

## Activate the background slideshow

1. Add 2–5 images to `public/images/backgrounds/`, named `cocoon-bg-01.webp`,
   `cocoon-bg-02.webp`, and so on. JPEG is also supported; use the matching extension.
2. Set `backgroundImages` in `lib/visual-assets.ts` to the ordered public URLs:
   `["/images/backgrounds/cocoon-bg-01.webp", "/images/backgrounds/cocoon-bg-02.webp"]`.
3. Reload. Slides change every **10 seconds** with a **4-second crossfade**.
   Images use centered cover sizing: edges may crop on mobile, but never stretch.
   Keep the important scenery near the center and compress images for mobile.
4. Images preload before display; failed images are skipped. An empty list or all
   failed images keeps the fallback gradient. A single image stays static.
5. Pause/resume controls stop future slide changes (an ongoing fade finishes).
   Reduced-motion preferences keep the current slide static and disable fades.

Timing is in `components/ambient-background.tsx`; fade duration, crop position,
and fallback colors are in `app/globals.css` (`.background-slide`,
`.background-layer`). No overlay is applied to the slideshow.
Set `backgroundImages: []` to restore the fallback.
No video files are needed.

## Activate the clipboard texture

1. Add `public/images/clipboard-texture.jpg`.
2. Set `clipboardTexture: "/images/clipboard-texture.jpg"` in the config.
3. Reload. The panel uses centered `cover` sizing without distortion and expands
   with the notes. Expect cropping as its aspect ratio changes. A calm fallback
   color remains if the image fails. A light warm-cream overlay (25% opacity) softens the texture; clipboard heading
and helper text have a small outline for readability.

The texture URL is in `components/notes-panel.tsx`; sizing and the placeholder
clip are in `app/globals.css` under `.clipboard` and `.clipboard-clip`. Use texture
without a painted clip because the UI already provides one. Check contrast with
both empty and full clipboards after changing textures.

## Activate optional decorations

Set each supplied decoration's `src` in `lib/visual-assets.ts`, for example:
`{ slot: "plant", src: "/images/decor/pixel-plant.png" }`.

The plant sits on the top-right edge of the Add Task card, including on mobile.
Use a transparent PNG with the pot near the bottom edge and little empty padding.
It renders at 72 × 96 CSS pixels; `.task-card-plant` controls its size and position.
The card reserves space above it so it cannot overlap the form or preceding content.

Empty slots are invisible. Other decorations are positioned absolutely behind panels,
use `contain` and pixelated rendering, cannot receive clicks, and are hidden from
assistive technology. They never change form/panel dimensions. They are hidden
at tablet/mobile widths to keep controls clear. Adjust the `.decoration-*`
CSS rules to fit the supplied art; move a slot into an open margin rather than
covering controls. New stars/objects can replace an existing slot; additional slots
require a matching config slot type and CSS positioning rule.

Set a config value back to `null` to restore its placeholder safely. Changing
assets requires no API/database changes. Run lint and build after config/code edits,
and inspect desktop/mobile, long notes, keyboard controls, and reduced motion.

## Music placeholder

`components/spotify-placeholder.tsx` provides the small top-right demo widget.
`components/task-workspace.tsx` places it before the clipboard. Its player buttons
are deliberately disabled; no Spotify requests, credentials, or playback exist.
Replace this component when real integration is requested.

## Notes typography and pastel colors

`app/globals.css` styles the handwritten note text, warm paper surfaces, blush Add
Task card, sage Tasks panel, lavender player, and outlined workspace heading.
Handwriting uses locally installed Chalkboard SE / Segoe Print / Comic Sans MS /
Bradley Hand, falling back to the browser's cursive font. Exact appearance varies
by device; no remote font downloads or build-time font service is required.
