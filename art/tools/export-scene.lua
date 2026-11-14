-- Export copies from approved scene. Never save or modify a source document on disk.
local scene = assert(app.open(app.params.scene))
local out = assert(app.params.out)
assert(scene.width == 1920 and scene.height == 480 and #scene.frames == 8)
local function render(s, f)
  local im = Image(s.width, s.height, ColorMode.RGB)
  im:drawSprite(s, f)
  return im
end
local function find(name)
  for _, l in ipairs(scene.layers) do if l.name == name then return l end end
  error('Missing approved layer: ' .. name)
end
local original = render(scene, 1)
-- Canonical RGBA8 stream of exactly the environment protected by the old comparison.
-- The Node wrapper verifies its pinned SHA-256 before publishing any staged output.
local fingerprint = assert(io.open(out .. '/environment.rgba', 'wb'))
for y = 0, 479 do
  local row = {}
  for x = 0, 1919 do
    if not (x >= 899 and x < 1087 and y >= 171 and y < 315) then
      local p = original:getPixel(x, y)
      row[#row + 1] = string.char(app.pixelColor.rgbaR(p), app.pixelColor.rgbaG(p), app.pixelColor.rgbaB(p), app.pixelColor.rgbaA(p))
    end
  end
  fingerprint:write(table.concat(row))
end
fingerprint:close()
Image(original, Rectangle(0,0,1920,8)):saveAs(out .. '/ceiling-edge.png')
Image(original, Rectangle(0,468,1920,12)):saveAs(out .. '/floor-edge.png')
local props = {}
for _, spec in ipairs({{'library', '20_library_books'}, {'events', '31_bulletin_calendar'}}) do
  local layer = find(spec[2])
  local cel = assert(layer:cel(1))
  local minx, miny, maxx, maxy = 1920, 480, -1, -1
  for p in cel.image:pixels() do
    if app.pixelColor.rgbaA(p()) > 0 then
      minx = math.min(minx, p.x); miny = math.min(miny, p.y)
      maxx = math.max(maxx, p.x); maxy = math.max(maxy, p.y)
    end
  end
  local image = Image(cel.image, Rectangle(minx, miny, maxx-minx+1, maxy-miny+1))
  local prop = {x=cel.position.x+minx, y=cel.position.y+miny, width=image.width, height=image.height}
  image:saveAs(out .. '/' .. spec[1] .. '-prop.png')
  props[spec[1]] = prop
  layer.isVisible = false
end
local first = render(scene, 1)
first:saveAs(out .. '/bar-base.png')
local sheet = Image(136 * 8, 144, ColorMode.RGB)
local durations = {}
for f = 1, 8 do
  local frame = render(scene, f)
  for p in frame:pixels() do
    if p() ~= first:getPixel(p.x, p.y) then
      assert((p.x >= 964 and p.x <= 991 and p.y >= 226 and p.y <= 230) or
        (p.x >= 971 and p.x <= 983 and p.y >= 240 and p.y <= 249),
        'Only approved eye and mouth pixels may animate')
    end
  end
  local restored = frame:clone()
  for _, spec in ipairs({{'library', '20_library_books'}, {'events', '31_bulletin_calendar'}}) do
    local c = find(spec[2]):cel(f)
    restored:drawImage(c.image, c.position)
    find(spec[2]).isVisible = true
  end
  assert(restored:isEqual(render(scene, f)), 'Prop decomposition changed approved frame ' .. f)
  find('20_library_books').isVisible = false
  find('31_bulletin_calendar').isVisible = false
  sheet:drawImage(Image(frame, Rectangle(899,171,136,144)), Point((f-1)*136,0))
  durations[f] = math.floor(scene.frames[f].duration * 1000 + 0.5)
end
sheet:saveAs(out .. '/barman-scene-sheet.png')
assert(Image(sheet, Rectangle(0,0,136,144)):isEqual(Image(first,Rectangle(899,171,136,144))), 'Rest seam')
local metadata = assert(io.open(out .. '/scene-components-export.json','w'))
metadata:write(json.encode({props=props, durations=durations, verification='8 approved frames recompose exactly; only eyes and mouth animate; rest patch matches base; legacy changes restricted to barman/tap and removed prop layers'}))
metadata:close()
print('SCENE_COMPONENTS_VERIFIED: all 8 approved frames; exact prop decomposition; untouched sources')
