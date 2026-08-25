"""
Export a .blend to a web-ready compressed .glb.

Usage:
  blender.exe <file.blend> --background --python scripts/export_glb.py -- <out.glb>
"""
import bpy, sys, os

argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
if not argv:
    raise SystemExit("Need an output path: -- public/models/name.glb")

out = os.path.abspath(argv[0])
os.makedirs(os.path.dirname(out), exist_ok=True)

# Report what is in the scene, so we know what we can click on.
print("\n=== SCENE CONTENTS ===")
total_tris = 0
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        total_tris += tris
        d = ob.dimensions
        print(f"  MESH  {ob.name:<40} tris={tris:>8}  size=({d.x:.2f}, {d.y:.2f}, {d.z:.2f})")
    else:
        print(f"  {ob.type:<5} {ob.name}")
print(f"=== total triangles: {total_tris} ===\n")

bpy.ops.object.select_all(action='SELECT')

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_apply=True,          # bake modifiers
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
)

size_mb = os.path.getsize(out) / (1024 * 1024)
print(f"\n=== EXPORTED: {out}  ({size_mb:.2f} MB) ===")
