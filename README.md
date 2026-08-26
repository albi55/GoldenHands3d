# Golden Hands 4

A scroll-driven companion to the Blender walkthrough. One building, one
continuous camera move: the page scrolls, the model turns to the view the
text is describing, and the next chapter arrives.

## Stack

React + Vite + Three.js + Framer Motion. The model ships as a
Draco-compressed GLB and is the only large asset.

## Run

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # -> dist/  (static, deploy anywhere)

## How it fits together

    index.html                  markup shell, fonts, GLB preload
    src/content/chapters.js     <- the narrative. The file you edit.
    src/three/BuildingStage.js  renderer, lights, framing, camera
    src/hooks/useStageScroll.js scroll position -> camera pose
    src/components/             Stage, Nav, Rail, Hero, Chapter, ...
    src/styles/global.css       theme and layout
    public/models/              exported .glb
    scripts/export_glb.py       Blender -> GLB exporter

Three pieces do the actual work:

**`chapters.js`** holds every word on the site and, next to each chapter,
the camera pose that chapter is written for. Adding a chapter is adding an
entry here — nothing else needs touching.

**`useStageScroll`** gives each chapter an *anchor*, the scroll offset at
which its panel sits centred. Between two anchors it interpolates the two
poses, holding still at each end and doing the whole swing through the
middle, which is what makes a chapter arrive as a new view rather than the
building drifting continuously.

**`BuildingStage`** owns the WebGL side. Poses reach it in model-relative
units — degrees, multiples of the subject radius, fractions of the
building height — so they survive a re-export at a different scale.

### Poses

    theta    azimuth in degrees, 0 = front, positive = counter-clockwise
    phi      elevation, 0 = directly overhead, 90 = eye level
    dist     distance as a multiple of the subject radius
    targetY  look-at height, 0 = middle, +0.5 = roof, -0.5 = pavement

The quickest way to find one is to drag the model to the view you want and
read the numbers off `stage.now` in the console.

## Adding a model

1. Export the .blend to GLB:

       "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" \
         path\to\file.blend --background \
         --python scripts/export_glb.py -- public/models/NAME.glb

   The script prints every object, its triangle count and its size, then
   the final file size. Watch that output — it tells you whether the
   geometry is what you expect.

2. Point `MODEL` in `src/components/Stage.jsx` at it.

The loader drops two things on the way in: Blender's own lights (glTF
punctual lights are physical units, so a Blender sun arrives with an
intensity in the thousands and blows every surface to white) and the
`Site_Ground` plate (280 m of ground that otherwise fills the frame). The
stage lights the scene itself.

## Performance

The export is 923 meshes, 65 materials, 225k triangles. The triangle count
is nothing; the mesh count was everything, because each one is a draw call
and the shadow pass doubled it — about 1,850 calls a frame.

What the stage does about it:

| | before | after |
|---|---|---|
| draw calls | 922 | 64 |
| model download | 9.49 MB | 1.96 MB |
| shadow pass | every frame | once, then frozen |
| idle cost | full 60fps render | loop parks itself |

- **Merged by material** on load (`BuildingStage._merge`). Each mesh's
  world matrix is baked into its vertices so everything sharing a material
  becomes one buffer. Costs per-mesh frustum culling, which at 64 calls is
  not worth having.
- **Shadows render once.** `renderer.shadowMap.autoUpdate` is off; a single
  pass is requested after the model lands and after any resize. Neither the
  sun nor the building ever moves.
- **On-demand rendering.** The loop skips the render when the camera has
  settled and stops entirely after ~45 still frames. Scroll, pointer and
  resize call `wake()`. There is exactly one rAF loop on the page — the
  scroll hook runs inside it rather than starting a second.
- **Quality tiers** (`detectTier`). Touch, narrow, or ≤4 cores drops MSAA,
  caps the pixel ratio at 1.25 (1.5 elsewhere), halves the shadow map and
  disables clearcoat.
- No animated `blur()` and no `backdrop-filter`. Both re-rasterise a large
  layer every frame; blurring the navbar meant re-reading the framebuffer
  over a live WebGL canvas.

### The model

`scripts/export_glb.py` sets `export_draco_mesh_compression_enable=True`,
but the GLB that was committed had no `KHR_draco_mesh_compression` in its
`extensionsUsed` — it went out uncompressed at 9.49 MB. It has since been
compressed in place:

    npx @gltf-transform/cli draco in.glb out.glb     # 9.49 MB -> 1.96 MB

Geometry is unchanged by it — 225,102 triangles, 923 meshes and 65
materials before and after. The original is kept at
`.attic/GoldenHands3d_Building.original.glb`.

**If you re-export from Blender, check the result.** Run:

    node -e "const b=require('fs').readFileSync('public/models/GoldenHands3d_Building.glb');\
    console.log(JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))).extensionsUsed)"

If `KHR_draco_mesh_compression` is missing, the export lost it again — run
the gltf-transform line above before shipping.

The decoder is self-hosted in `public/draco/` (three's own build) rather
than pulled from gstatic, because it sits on the critical path and a
third-party origin costs a DNS lookup and TLS handshake first. Both it and
the model are preloaded from `index.html`.

## Launch checklist

Run `npm run audit` — it builds, then checks internal links, alt text,
per-page titles/descriptions/canonicals, heading order, `lang`, viewport,
favicon and payload sizes. It must print **no problems found**.

| # | Item | State |
|---|---|---|
| 1 | Privacy policy | `/privatesia/` — **needs company details + legal review** |
| 2 | Terms | `/kushtet/` — **needs company details + legal review** |
| 3 | FAQ | `/pyetje/`, 8 questions, with FAQPage structured data |
| 4 | Clear CTA | 360 button on hero, Kontakt in navbar, form in overlay, CTA on FAQ |
| 5 | robots.txt | generated at build from `site.config.js` |
| 6 | sitemap.xml | generated at build, 4 URLs |
| 7 | Custom 404 | `/404.html`, `noindex` — **needs host config, see below** |
| 8 | Alt text | every `<img>` checked by audit; canvas has `role="img"` + label |
| 9 | Analytics | consent-gated, **off until you set a provider** |
| 10 | Meta titles | unique per page, all under 60 chars |
| 11 | Meta descriptions | unique per page, all under 160 chars |
| 12 | Social share | OG + Twitter tags, `/og.png` |
| 13 | Canonical URLs | absolute, per page, from `site.config.js` |
| 14 | Cookie consent | banner, shown only when a cookie-setting provider is on |
| 15 | Mobile | flowing layout under 900px; content pages fluid |
| 16 | Favicon | `favicon.svg` + apple-touch-icon + webmanifest |
| 17 | Accessibility | skip links, focus rings, AA contrast, labelled form |
| 18 | Forms | real form + validation + honeypot; **needs an endpoint** |
| 19 | Broken links | audit resolves every internal link |
| 20 | Performance | see the Performance section above |

### Before this goes live

Four things need input that is not in the repo:

1. **The domain.** `site.config.js` guesses `https://goldenhands.al` from the
   contact address. Canonicals, Open Graph, robots.txt and sitemap.xml all
   come from it — wrong value, all four wrong.
2. **Company details** in the two legal pages (legal name, NIPT, address),
   and a lawyer's read of both. They are a solid base, not approved text.
3. **A form endpoint** in `site.config.js`. Until then the form opens the
   visitor's mail client with the message filled in, which works but leaves
   no record on your side.
4. **404 routing.** The file is built; the host has to serve it. Netlify and
   Vercel pick up `404.html` automatically. On nginx:
   `error_page 404 /404.html;`. On Apache: `ErrorDocument 404 /404.html`.

Analytics is deliberately **off**. Set `provider` to `'plausible'`
(cookieless, no banner needed) or `'ga4'` (cookies, banner appears
automatically) in `site.config.js`.

## Notes

- Copy is Albanian throughout, matching the audience for the building.
- `.attic/` holds the previous vanilla-JS viewer and the original
  uncompressed model, kept for reference.
