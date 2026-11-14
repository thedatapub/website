-- Read-only environment, Barman and mug masters -> current layered scene.
local source=assert(app.open(assert(app.params.master)))
local barman=assert(app.open(assert(app.params.barman)))
local stein=assert(app.open(assert(app.params.stein)))
local out=assert(app.params.out)
assert(source.width==640 and source.height==360 and #source.frames==1)
assert(barman.width==136 and barman.height==144 and #barman.frames==8)
assert(stein.width==28 and stein.height==32 and #stein.frames==2)
local hx,hy=899,171
local function find(s,name) for _,l in ipairs(s.layers) do if l.name==name then return l end end;error('Missing layer: '..name) end
local function layerImage(s,name)
 local im=Image(s.width,s.height,ColorMode.RGB);im:clear(0);local c=assert(find(s,name):cel(1));im:drawImage(c.image,c.position);return im
end
local function rendered(s,f) local im=Image(s.width,s.height,ColorMode.RGB);im:clear(0);im:drawSprite(s,f);return im end
local function erase(im,x,y,w,h) for yy=y,y+h-1 do for xx=x,x+w-1 do im:drawPixel(xx,yy,0) end end end
local world=Sprite(1920,480,ColorMode.RGB)
world:setPalette(source.palettes[1]);world:assignColorSpace(ColorSpace{sRGB=true});world.gridBounds=Rectangle(0,0,8,8)
local default=world.layers[1]
local function layer(name,paint)
 local im=Image(1920,480,ColorMode.RGB);im:clear(0);paint(im)
 local l=world:newLayer();l.name=name;world:newCel(l,1,im,Point(0,0))
 if default then world:deleteLayer(default);default=nil end;return l
end
local base=layerImage(source,'00_wall_and_floor_base')
layer('00_approved_wall_and_floor',function(im)
 for x=0,1280,640 do im:drawImage(Image(base,Rectangle(0,16,640,60)),Point(x,0));im:drawImage(base,Point(x,60))
 for y=420,479,36 do im:drawImage(Image(base,Rectangle(0,324,640,36)),Point(x,y)) end end
end)
local lampCenters={100,300,700,891,1090,1455,1740,1850}
local light=Image(layerImage(source,'05_wall_light_pools'),Rectangle(30,75,65,144))
layer('05_approved_light_pools',function(im) for _,x in ipairs(lampCenters) do im:drawImage(light,Point(x-32,135)) end end)
local function tiled(name) local im=layerImage(source,name);layer(name,function(dst)for x=0,1280,640 do dst:drawImage(im,Point(x,60)) end end) end
local function moved(name,dx) local im=layerImage(source,name);layer(name,function(dst)dst:drawImage(im,Point(dx,60))end) end
tiled('10_woodwork_and_window');moved('20_library_books',219);moved('21_shelves_and_bottles',640);moved('30_identity_sign',640);moved('31_bulletin_calendar',1019)
local lamp=Image(layerImage(source,'40_brass_lamps'),Rectangle(38,13,51,61))
layer('40_approved_brass_lamps',function(im)for _,x in ipairs(lampCenters) do im:drawImage(lamp,Point(x-24,73)) end end)
local animated={}
local barmanGroup=world:newGroup();barmanGroup.name='50_barman_native_1x'
for _,l in ipairs(barman.layers) do if l.name~='70_counter_contact_shadows' and l.name~='80_connected_forearms_wrists_and_hands' then
 local c=assert(l:cel(1));local copy=world:newLayer();copy.name=l.name;copy.parent=barmanGroup
 world:newCel(copy,1,c.image:clone(),Point(hx+c.position.x,hy+c.position.y));animated[#animated+1]={source=l,copy=copy}
end end
tiled('60_counter_carved_base');tiled('61_counter_wood_grain')
-- Remove only the three obsolete mugs from a copy; keep the approved master intact.
local objects=layerImage(source,'70_counter_objects')
for _,x in ipairs({269,409,587}) do erase(objects,x,221,20,20) end
-- Remove the old floating tray only from this proof copy.
erase(objects,366,235,34,4)
local tapUpper=Image(objects,Rectangle(377,197,17,38))
erase(objects,377,197,17,38)
layer('70_approved_objects_without_old_mugs',function(im) im:drawImage(objects,Point(640,60)) end)
layer('70_wing_reading',function(im) im:drawImage(Image(objects,Rectangle(160,222,66,20)),Point(370,282)) end)
-- Static tap mount: continuous riser into a metal foot resting on the counter.
-- The complete unchanged hardware/mount/shadow moves 53 native pixels right, beyond the mug.
local tapDx=53
layer('70_tap_stem_base_and_contact',function(im)
 im:drawImage(tapUpper,Point(1017+tapDx,257))
 local pal=source.palettes[1]
 local function r(x,y,w,h,i) x=x+tapDx;local c=pal:getColor(i);local v=app.pixelColor.rgba(c.red,c.green,c.blue,255)
  for yy=y,y+h-1 do for xx=x,x+w-1 do im:drawPixel(xx,yy,v) end end
 end
 r(1010,304,21,2,8);r(1013,306,15,1,9) -- narrow contact shadow on the wood
 r(1017,290,5,13,18);r(1018,290,2,12,19);r(1021,290,1,13,15)
 r(1012,300,16,4,1);r(1014,300,12,2,18);r(1015,300,10,1,19)
 r(1014,302,12,1,15);r(1014,301,1,1,6);r(1025,301,1,1,6)
end)
local mug=rendered(stein,1)
layer('71_beer_mugs_native_1x',function(im)for _,x in ipairs({502,868,1040,1218,1652}) do im:drawImage(mug,Point(x,269)) end end)
for _,name in ipairs({'70_counter_contact_shadows','80_connected_forearms_wrists_and_hands'}) do
 local hands=find(barman,name);local hl=world:newLayer();hl.name='72_'..name
 local c=assert(hands:cel(1));world:newCel(hl,1,c.image:clone(),Point(hx+c.position.x,hy+c.position.y));animated[#animated+1]={source=hands,copy=hl}
end
tiled('80_front_stools')
world.frames[1].duration=barman.frames[1].duration
local sceneLayers={}
local function collect(layers) for _,l in ipairs(layers) do if l.isGroup then collect(l.layers) else sceneLayers[#sceneLayers+1]=l end end end
collect(world.layers)
for f=2,#barman.frames do
 world:newEmptyFrame(f);world.frames[f].duration=barman.frames[f].duration
 for _,l in ipairs(sceneLayers) do local c=assert(l:cel(1));world:newCel(l,f,c.image:clone(),c.position) end
 for _,pair in ipairs(animated) do local c=assert(pair.source:cel(f));world:deleteCel(pair.copy,f);world:newCel(pair.copy,f,c.image:clone(),Point(hx+c.position.x,hy+c.position.y)) end
end

world:saveAs(out..'/source/bar-scene.aseprite')
local function exportCrop(rect,scale,path,animation)
 local s=Sprite(rect.width,rect.height,ColorMode.RGB);s:setPalette(source.palettes[1]);s:assignColorSpace(ColorSpace{sRGB=true})
 local n=animation and #world.frames or 1
 for f=1,n do
  if f>1 then s:newEmptyFrame(f) end
  s:newCel(s.layers[1],f,Image(rendered(world,f),rect),Point(0,0));s.frames[f].duration=world.frames[f].duration
 end
 s:resize(rect.width*scale,rect.height*scale)
 if animation then s:saveCopyAs(path) else Image(s):saveAs(path) end
end
exportCrop(Rectangle(622,15,720,450),2,out..'/exports/barman-desktop-context.png',false)
exportCrop(Rectangle(885,29,195,422),2,out..'/exports/barman-mobile-context.png',false)
exportCrop(Rectangle(919,185,184,136),4,out..'/exports/barman-closeup.png',false)
exportCrop(Rectangle(919,185,184,136),4,out..'/exports/barman-mouth-blink.gif',true)
local strip=Sprite(736,272,ColorMode.RGB);strip:setPalette(source.palettes[1])
local frames=Image(736,272,ColorMode.RGB)
for f=1,8 do frames:drawImage(Image(rendered(world,f),Rectangle(919,185,184,136)),Point(((f-1)%4)*184,math.floor((f-1)/4)*136)) end
strip:newCel(strip.layers[1],1,frames);strip:resize(1472,544);Image(strip):saveAs(out..'/exports/barman-all-poses.png')
for _,l in ipairs(barman.layers) do if l.name~='50_eyes_glasses_nose_and_blink' and l.name~='35_mouth_inside_fixed_goatee' then
 for f=2,8 do assert(l:cel(1).image:isEqual(l:cel(f).image),'Unintended animation: '..l.name) end
end end
local allowed={};for i=1,#source.palettes[1]-1 do local c=source.palettes[1]:getColor(i);allowed[app.pixelColor.rgba(c.red,c.green,c.blue,255)]=true end
for f=1,8 do local im=rendered(world,f);for px in im:pixels() do assert(allowed[px()],'Off-palette or partial alpha') end end
print('SCENE_OK: 8 frames; eyes/mouth only; fixed goatee, jaw, body, hands and emblem; grounded tap mount; original opaque palette; no runtime outputs')
