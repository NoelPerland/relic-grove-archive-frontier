## Generated asset artifact cleanup

Many assets were created with image-generation workflows. Visual bugs often come from extra generated objects, bad crops, or rendering full images instead of isolated sprites.

When fixing visual artifacts, do not generate new images unless explicitly asked.

First check:
- asset key used by the object
- original PNG dimensions
- atlas/frame metadata
- sprite source rectangle
- drawImage `sx`, `sy`, `sw`, `sh`
- frame width and frame height
- transparent alpha bounds
- object spawn data
- whether the image contains multiple generated objects
- whether the object is being drawn from a full concept image instead of a clean sprite

### Monster artifact rules

For enemies like the blue crystal monster:
- The sprite must contain only the intended enemy.
- No dead bodies, debris, rocks, extra shadows, test props, or generated leftovers should be visible underneath.
- If the junk is part of the PNG, use a clean crop/frame if possible.
- If the junk is a separate object, remove the accidental spawn or fix the layer/object key.
- If the junk is frame bleeding, add padding or correct frame dimensions/source rectangles.

### Partial prop rules

Random partial props are not acceptable:
- no half barrel
- no half tent
- no half crate
- no cropped camp fragments
- no sliced building pieces unless intentionally part of a constructed building

If partial props appear:
1. Identify the object key and source asset.
2. Check whether the asset is a sheet or multi-object generated image.
3. Replace the render call with a proper frame/crop.
4. Remove accidental decorative spawns if they are not intentional.
5. Verify the object is not clipped by camera, world bounds, UI overlays, or parent containers.

### Dev-only asset debugging

It is acceptable to add a temporary dev-only asset debug mode that shows:
- sprite bounds
- texture key
- frame name/index
- source rectangle
- world position
- alpha bounds
- collision bounds

Debug visuals must be disabled by default or removed before finalizing.

## Visual polish rules for Relic Grove

When fixing graphics or animation issues:

- Do not generate or replace images unless explicitly asked.
- First inspect the existing asset pipeline and rendering code.
- Prefer fixing:
  - source rectangles
  - atlas/spritesheet metadata
  - anchors/origins
  - depth sorting
  - scale/resolution issues
  - animation mappings
  - frame bleeding
  - clipping/cropping
before concluding that source art must be replaced.

### Gate rules

- Gate must render as a full, complete, intentional structure.
- No gate should appear cropped, cut off, or clipped.
- Check world bounds, source crop, anchor, and render container bounds.

### Lake rules

- Water/lake assets must match the same cozy fantasy hand-painted/generated style as the rest of the world.
- Lakes must not look like debug shapes, placeholders, or mismatched low-quality art.
- Check that the correct asset is used, at the correct scale and resolution.

### Avatar animation rules

- All avatar animations must use consistent frame dimensions.
- No direction may be cropped or blurry.
- No animation may show neighbor-frame bleed or stray generated fragments.
- Feet/base contact point should remain visually stable.
- Left-walk must exist, be correctly mapped, and feel consistent with other movement directions.
- Use mirroring only as an intentional documented fallback if true left-walk frames do not exist.

### Validation

A visual task is not done until:
- the game launches cleanly
- the affected visuals are checked in motion
- no cropping or compression artifacts remain
- avatar animation directions are consistent
- changes are summarized with root cause and file list
