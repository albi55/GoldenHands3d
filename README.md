# Golden Hands 3D

Desktop-only web viewer. Shows a building exported from Blender; clicking it
loads a second Blender model.

## Stack

Vite + Three.js. No React, no framework. Two dependencies total.
Models ship as Draco-compressed GLB.

## Run

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # -> dist/  (static, deploy anywhere)

## Adding a model

1. Export the .blend to GLB:

       "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" \
         path\to\file.blend --background \
         --python scripts/export_glb.py -- public/models/NAME.glb

   The script prints every object, its triangle count and its size, then
   the final file size. Watch that output — it tells you whether the
   geometry is what you expect.

2. Register it in `src/scenes.js`. `onClick` is the id of the scene to
   travel to when the model is clicked; `null` means dead end.

That is the only file you edit to add or rewire a scene.

## Layout

    index.html          markup + desktop gate
    src/style.css       styling
    src/scenes.js       <- scene registry, the file you edit
    src/main.js         viewer engine
    scripts/export_glb.py   Blender -> GLB exporter
    public/models/      exported .glb files
