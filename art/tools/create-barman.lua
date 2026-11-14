-- Generate Barman into a fresh folder; never overwrite edited masters or runtime assets.
local out=assert(app.params.out)
assert(not app.fs.isFile(out..'/source/barman.aseprite'),'Master already exists; choose a fresh variant path')
local paletteSource=assert(app.open(assert(app.params.palette)))
local pal=paletteSource.palettes[1]
local names={'ink','navy','navy_shadow','wall','wall_light','slate','glass','wood_deep','wood_shadow','wood_dark','wood','wood_mid','wood_light','wood_glint','amber_shadow','amber','amber_light','brass','brass_light','sand','paper','cloth_shadow','cloth','skin_shadow','skin_dark','skin','skin_light','skin_glint','hair_deep','hair','hair_light','hair_glint','rust_shadow','rust','rust_light','dusk'}
local P={};for i,n in ipairs(names) do local c=pal:getColor(i);P[n]=app.pixelColor.rgba(c.red,c.green,c.blue,255) end
local im
local drawOffsetY=0
local headDy=4
local function R(x,y,w,h,c) y=y+drawOffsetY;for yy=y,y+h-1 do for xx=x,x+w-1 do if xx>=0 and yy>=0 and xx<im.width and yy<im.height then im:drawPixel(xx,yy,P[c] or c) end end end end
local function Poly(points,c)
 local lo,hi=10000,-10000;for _,p in ipairs(points) do lo=math.min(lo,p[2]);hi=math.max(hi,p[2]) end
 for y=lo,hi-1 do local xs={};for i,a in ipairs(points) do local b=points[i%#points+1];if (a[2]<=y+.5 and b[2]>y+.5) or (b[2]<=y+.5 and a[2]>y+.5) then xs[#xs+1]=a[1]+(y+.5-a[2])/(b[2]-a[2])*(b[1]-a[1]) end end
 table.sort(xs);for i=1,#xs-1,2 do local a=math.ceil(xs[i]-.5);local b=math.floor(xs[i+1]-.5);R(a,y,b-a+1,1,c) end end
end
-- Frontal body axis is x=83.5: mirrored polygon boundaries use x -> 168-x.
local function Pair(points,c)
 Poly(points,c);local reflected={};for _,p in ipairs(points) do reflected[#reflected+1]={168-p[1],p[2]} end;Poly(reflected,c)
end
local function PairRect(x,y,w,h,c) R(x,y,w,h,c);R(168-x-w,y,w,h,c) end
local barman=Sprite(136,144,ColorMode.RGB);barman:setPalette(pal);barman:assignColorSpace(ColorSpace{sRGB=true});barman.gridBounds=Rectangle(0,0,8,8)
for f=2,8 do barman:newEmptyFrame(f) end
local function layer(name,f,paint)
 local l;for _,v in ipairs(barman.layers) do if v.name==name then l=v end end
 if not l then l=barman:newLayer();l.name=name end
 im=Image(136,144,ColorMode.RGB);im:clear(0)
 local moveHead=(name=='30_swept_curls_sideburns_and_beard' or name=='35_mouth_inside_fixed_goatee' or name=='50_eyes_glasses_nose_and_blink' or name=='54_static_mustache_center_bridge')
 drawOffsetY=moveHead and headDy or 0;paint();drawOffsetY=0;barman:newCel(l,f,im,Point(0,0))
end
for f=1,8 do
local eyeState=(f==7 and 2) or ((f==6 or f==8) and 1) or 0
local mouthState=(f==3 and 2) or ((f==2 or f==4) and 1) or 0
layer('10_cotton_shoulders_upperarms_elbows',f,function()
 -- Balanced frontal shoulders, equal sleeve widths and elbow heights.
 Poly({{72,85},{96,85},{108,91},{117,99},{123,109},{128,121},{125,127},{117,131},{51,131},{43,127},{40,121},{45,109},{51,99},{60,91}},'ink')
 Poly({{72,88},{96,88},{106,94},{114,101},{120,110},{125,120},{122,125},{116,128},{52,128},{46,125},{43,120},{48,110},{54,101},{62,94}},'cloth')
 Pair({{62,94},{70,92},{72,102},{66,115},{60,124},{51,126},{46,122},{47,115},{53,104}},'paper')
 Pair({{48,113},{52,107},{51,116},{53,121},{59,124},{55,126},{49,124},{46,120}},'cloth_shadow')
 Pair({{62,100},{65,97},{64,109},{61,119},{58,122},{59,115}},'cloth')
 -- Directional folds differ in color, while the two sleeves share their anatomy.
 Poly({{108,98},{115,104},{120,113},{122,120},{118,124},{113,125},{115,119},{112,109}},'sand')
 PairRect(51,112,1,6,'wood_light');PairRect(62,104,1,8,'cloth_shadow')
 -- Equal cuffs wrap each elbow and overlap the forearm roots.
 Pair({{43,118},{49,118},{56,121},{59,125},{56,130},{49,130},{43,126},{41,122}},'ink')
 Pair({{44,120},{49,120},{54,123},{56,125},{54,128},{50,128},{45,125},{43,122}},'paper')
 Pair({{45,124},{50,126},{55,126},{54,128},{49,128},{44,125}},'cloth_shadow')
 PairRect(47,121,3,1,'sand')
end)
layer('20_neck_face_planes_and_ear',f,function()
 Poly({{75,79},{93,79},{96,87},{92,94},{84,99},{76,94},{72,87}},'skin_shadow')
 Poly({{77,81},{91,81},{93,87},{89,92},{84,96},{78,92},{75,87}},'skin')
 Poly({{77,86},{84,88},{91,86},{90,90},{84,94},{78,90}},'skin_light')
 -- Face and ear move with the head; the neck painted above stays in place.
 drawOffsetY=headDy
 -- Three-quarter head; the ear and jaw share the same cranial silhouette.
 Poly({{69,32},{80,28},{94,30},{104,38},{108,49},{110,62},{106,70},{102,75},{96,79},{91,81},{79,81},{73,79},{68,76},{64,71},{62,67},{60,59},{61,45}},'ink')
 Poly({{69,35},{80,31},{93,33},{102,40},{105,49},{106,61},{103,69},{99,74},{94,77},{89,79},{80,79},{74,77},{69,73},{65,67},{63,59},{64,46}},'skin_dark')
 Poly({{69,36},{79,32},{91,35},{99,41},{101,51},{99,62},{97,69},{92,73},{84,76},{76,75},{70,71},{66,64},{64,55},{65,45}},'skin')
 Poly({{69,37},{77,34},{86,35},{93,40},{94,47},{86,50},{74,50},{66,47}},'skin_light')
 Poly({{67,50},{74,49},{77,53},{75,58},{68,59},{65,56}},'skin_glint')
 Poly({{83,50},{94,48},{99,51},{97,59},{91,62},{82,59}},'skin_light')
 Poly({{66,59},{73,60},{77,65},{73,69},{68,68},{64,63}},'skin_light')
 Poly({{91,61},{99,59},{100,64},{96,70},{88,69},{85,66}},'skin_light')
 R(67,42,2,4,'skin_glint');R(74,35,6,1,'skin_glint');R(95,43,2,4,'skin_dark');R(97,64,1,3,'skin_dark')
 Poly({{106,51},{111,50},{115,54},{114,62},{110,68},{106,67},{104,62}},'ink')
 Poly({{108,53},{111,53},{113,55},{112,61},{109,65},{107,64},{107,57}},'skin')
 R(109,54,2,2,'skin_light');R(108,57,2,5,'skin_shadow');R(110,59,1,3,'skin_dark');R(109,63,1,1,'skin_light')
end)
layer('30_swept_curls_sideburns_and_beard',f,function()
 Poly({{61,41},{60,35},{63,35},{63,30},{68,30},{68,27},{75,27},{75,24},{82,24},{82,25},{90,25},{90,27},{98,27},{99,30},{105,32},{109,39},{109,51},{105,54},{101,47},{97,43},{94,38},{88,36},{84,39},{78,40},{73,37},{67,41}},'hair_deep')
 Poly({{63,37},{64,32},{69,32},{70,29},{76,29},{77,26},{82,26},{86,28},{92,28},{97,30},{103,34},{106,40},{107,48},{105,50},{101,43},{96,39},{94,35},{87,33},{81,37},{77,37},{73,34},{67,38}},'hair')
 Poly({{64,34},{69,30},{75,30},{78,27},{83,27},{83,29},{77,32},{72,33},{68,36},{65,37}},'hair_light')
 Poly({{68,32},{74,30},{77,29},{79,29},{78,30},{73,32},{70,34},{68,34}},'hair_glint')
 Poly({{76,36},{77,32},{82,29},{86,30},{88,33},{86,36},{82,38},{79,38}},'hair_deep')
 Poly({{79,34},{81,31},{85,31},{86,33},{84,35},{81,36},{79,36}},'hair_light')
 R(81,32,3,1,'hair_glint');R(82,35,2,2,'hair');R(88,29,5,1,'hair_light')
 Poly({{90,32},{96,32},{102,36},{103,39},{99,37},{96,35},{91,34}},'hair_light')
 R(101,37,2,1,'hair_glint');R(103,42,2,3,'hair_light');R(100,45,3,4,'hair');R(103,49,3,8,'hair')
 -- Sparse fade and sideburn clusters; strands follow the jaw rather than a flat beard block.
 R(103,53,2,8,'hair_deep');R(104,54,1,4,'hair_light');R(102,59,3,9,'hair')
 for _,q in ipairs({{105,48},{106,46},{102,47},{106,51},{101,50},{104,51}}) do R(q[1],q[2],1,1,'hair_light') end
 -- A broad, shallow U: six native pixels less depth, with a short flat chin.
 -- More cheek skin remains above the beard line; the sideburns still join the jaw.
 Poly({{65,65},{68,68},{72,71},{78,72},{83,72},{89,70},{95,67},{100,63},{105,61},{105,67},{103,72},{100,76},{95,79},{91,81},{80,81},{74,79},{69,76},{65,72},{63,68}},'hair_deep')
 Poly({{66,68},{69,70},{73,73},{79,74},{84,74},{90,72},{96,69},{101,65},{103,64},{102,70},{99,74},{94,77},{89,79},{81,79},{75,77},{70,74},{67,71}},'hair')
 Poly({{67,70},{70,72},{73,75},{78,77},{79,78},{74,77},{70,75},{68,73}},'hair_light')
 Poly({{94,73},{98,70},{100,67},{102,66},{101,70},{98,74},{94,76}},'hair_light')
 for _,q in ipairs({{68,70},{72,74},{77,77},{83,78},{89,78},{95,75},{99,71},{102,66}}) do R(q[1],q[2],1,1,'hair_light') end
 R(82,79,4,1,'hair_glint');R(91,77,2,1,'hair_light')
 -- Groomed mustache corners blend into the short beard with tapered hair clusters.
 -- No separate outlined oval is drawn around the mouth.
 Poly({{70,65},{76,64},{83,64},{87,66},{87,69},{84,72},{81,74},{77,74},{73,71},{70,69}},'skin_dark')
 Poly({{74,68},{79,68},{84,68},{84,70},{81,72},{77,72},{75,70}},'skin')
 R(78,72,2,1,'skin')
 if app.params.treatment~='A' then
  Poly({{68,64},{72,63},{74,64},{73,66},{72,68},{73,71},{75,74},{73,75},{71,72},{69,68},{67,66}},'hair')
  Poly({{83,63},{86,64},{88,66},{87,68},{86,70},{85,72},{83,74},{82,74},{83,71},{84,69},{85,67},{83,65}},'hair')
  R(71,65,2,1,'hair_deep');R(72,68,1,2,'hair_deep');R(85,66,1,2,'hair_deep');R(84,71,1,2,'hair_deep')
 else
  Poly({{69,64},{72,64},{73,65},{72,67},{73,70},{75,73},{74,75},{72,73},{70,70},{70,68},{68,66}},'hair')
  Poly({{84,64},{87,65},{89,66},{88,68},{87,69},{87,71},{85,73},{83,75},{82,74},{84,71},{85,68},{83,66}},'hair')
  R(71,65,2,1,'hair_deep');R(72,68,1,2,'hair_deep');R(85,67,1,2,'hair_deep');R(84,72,1,1,'hair_deep')
 end
 -- Sparse tonal clusters break up the outside edge; the connected inner structure remains.
 R(70,65,1,1,'hair_light');R(71,70,1,1,'hair_light')
 R(85,66,1,1,'hair')
 R(68,67,1,1,'skin_dark');R(88,68,1,1,'skin')
 -- Two short, sloping mustache lobes immediately below the nose, not a heavy black bar.
 Poly({{69,65},{71,63},{74,62},{77,63},{78,64},{76,65},{73,65},{71,66},{69,66}},'hair_deep')
 Poly({{78,64},{80,62},{83,63},{86,64},{87,66},{85,66},{82,65},{80,65}},'hair_deep')
 R(70,64,4,1,'hair_deep');R(73,63,2,1,'hair');R(80,64,4,1,'hair_deep');R(81,63,2,1,'hair')
 R(71,65,2,1,'hair');R(84,65,2,1,'hair')
end)
layer('35_mouth_inside_fixed_goatee',f,function()
 -- Clearly distinct closed, medium and open poses; opening grows inside a fixed jaw.
 if mouthState==0 then
  R(74,67,4,1,'hair_deep');R(78,66,5,1,'hair_deep');R(78,67,4,1,'skin_shadow')
  R(77,69,4,1,'skin_dark');R(78,70,3,1,'skin')
 elseif mouthState==1 then
  Poly({{75,67},{81,67},{83,68},{82,70},{80,71},{77,71},{74,69},{74,68}},'hair_deep')
  R(76,67,4,1,'sand');R(77,70,4,1,'skin_shadow');R(77,72,4,1,'skin_dark')
 else
  -- Six native rows of aperture, twice 06's peak height; warm depth, thin teeth highlight.
  Poly({{76,66},{81,66},{84,68},{83,70},{81,72},{77,72},{74,70},{73,68},{74,67}},'hair_deep')
  R(76,66,5,1,'sand');R(76,70,6,1,'skin_shadow');R(78,71,3,1,'skin_dark')
  R(77,73,4,1,'skin_dark');R(78,74,2,1,'skin')
 end
end)
layer('40_collars_apron_straps_and_brass',f,function()
 -- Collar and apron share the same frontal center and paired anchor heights.
 Pair({{72,86},{77,89},{83,96},{77,104},{66,95}},'ink')
 Pair({{72,89},{76,91},{80,96},{76,101},{69,95}},'paper')
 R(83,98,2,11,'wood_light');R(84,100,1,8,'cloth');R(83,102,1,2,'ink')
 Pair({{63,92},{68,91},{73,105},{70,130},{63,131},{64,107}},'ink')
 Pair({{65,94},{67,94},{70,105},{68,128},{65,128},{67,107}},'navy')
 Poly({{63,104},{105,104},{107,136},{61,136}},'ink')
 Poly({{65,106},{103,106},{105,134},{63,134}},'navy')
 R(65,109,1,20,'wall_light');R(67,111,1,16,'wall');R(101,110,1,21,'navy_shadow')
 PairRect(66,103,4,4,'amber_shadow');PairRect(67,103,2,2,'brass_light');PairRect(67,103,1,1,'paper')
end)
layer('50_eyes_glasses_nose_and_blink',f,function()
 -- Separate compact lenses leave cheeks, eyebrows and the nose readable.
 Poly({{63,43},{66,41},{71,41},{74,43},{73,44},{66,43},{63,45}},'hair_deep')
 Poly({{81,42},{87,40},{92,41},{95,43},{94,44},{89,43},{81,44}},'hair_deep')
 Poly({{64,47},{73,47},{76,49},{75,56},{73,58},{65,58},{62,55},{62,50}},'ink')
 Poly({{65,49},{72,49},{74,50},{73,55},{72,56},{66,56},{64,54},{64,50}},'skin_light')
 Poly({{82,47},{93,47},{96,49},{95,56},{93,58},{83,58},{80,56},{79,50}},'ink')
 Poly({{83,49},{92,49},{94,50},{93,55},{92,56},{84,56},{82,54},{81,50}},'skin_light')
 R(76,49,4,2,'ink');R(95,49,12,2,'ink');R(106,51,2,3,'hair_deep')
 R(65,47,3,1,'slate');R(83,47,3,1,'slate')
 if eyeState==0 then
  R(65,51,7,1,'skin_dark');R(65,52,7,2,'sand');R(67,51,2,3,'ink');R(67,51,1,1,'paper')
  R(83,51,9,1,'skin_dark');R(83,52,9,2,'sand');R(85,51,2,3,'ink');R(85,51,1,1,'paper')
 elseif eyeState==1 then
  R(65,52,7,1,'skin_dark');R(67,53,3,1,'ink');R(83,52,9,1,'skin_dark');R(85,53,4,1,'ink')
 else
  R(65,53,7,1,'hair_deep');R(83,53,9,1,'hair_deep')
 end
 -- Nose follows the bridge toward a compact tip; one pixel of philtrum above the lip.
 Poly({{77,51},{79,54},{79,58},{77,61},{74,63},{70,62},{69,60},{72,58},{74,54}},'skin_dark')
 Poly({{76,53},{77,55},{77,58},{75,60},{72,61},{71,60},{73,58},{74,55}},'skin_light')
 R(73,58,3,2,'skin_glint');R(71,61,4,1,'skin_shadow');R(76,60,2,1,'skin_shadow')
 R(76,62,2,1,'skin');R(77,63,1,1,'skin_dark')
end)
layer('54_static_mustache_center_bridge',f,function()
 -- Draw after the nose plane: continuous shaded hair beneath the philtrum.
 -- The visible mouth starts below this fixed bridge and is left untouched.
 R(77,63,2,1,'hair');R(76,64,4,1,'hair_deep')
end)
layer('60_apron_stein_emblem',f,function()
 -- Native 30x23 emblem from the verified B1.1 mug/laurel mark, with breathing room.
 -- Laurel stems and three small paired leaf clusters use amber on navy.
 Poly({{71,112},{72,112},{72,119},{74,123},{77,126},{76,127},{72,123},{70,118}},'brass')
 Poly({{98,112},{99,112},{99,118},{97,123},{93,127},{92,126},{96,123},{98,119}},'brass')
 Poly({{69,113},{71,114},{72,117},{70,116}},'brass_light')
 Poly({{69,119},{72,120},{73,122},{70,121}},'brass_light')
 Poly({{72,124},{75,124},{77,127},{74,126}},'brass_light')
 Poly({{100,113},{98,114},{97,117},{99,116}},'brass_light')
 Poly({{100,119},{97,120},{96,122},{99,121}},'brass_light')
 Poly({{97,124},{94,124},{92,127},{95,126}},'brass_light')
 -- Distinct right handle with a navy hole, separate from the laurel branch.
 Poly({{89,113},{93,113},{95,115},{95,121},{93,123},{89,123}},'paper')
 R(90,115,3,6,'navy');R(89,115,2,6,'navy')
 -- Cream rim, amber body, two dark bands: no text and no noisy shading.
 Poly({{77,111},{89,111},{89,124},{87,126},{79,126},{77,124}},'paper')
 R(79,113,8,11,'amber');R(79,117,8,1,'navy');R(79,121,8,1,'navy')
 -- Compact stepped foam; top stays below the collar and straps.
 Poly({{77,110},{78,108},{81,108},{82,106},{85,106},{87,108},{89,108},{91,110},{90,112},{84,113},{81,112},{79,114},{77,113}},'paper')
 R(79,112,2,2,'paper')
end)
layer('70_counter_contact_shadows',f,function()
 -- Paired contact shadows support matching forearm and palm contours.
 PairRect(49,134,29,2,'wood_shadow');PairRect(54,136,23,1,'wood_dark')
end)
layer('80_connected_forearms_wrists_and_hands',f,function()
 -- Mirrored anatomy: each rolled cuff joins a forearm, narrowing wrist and palm.
 Pair({{50,122},{55,123},{60,126},{66,128},{72,128},{77,129},{81,131},{82,133},{79,136},{72,136},{66,134},{57,134},{49,131},{46,127}},'ink')
 Pair({{51,124},{54,125},{59,128},{65,130},{71,130},{74,129},{77,131},{79,132},{80,133},{77,134},{72,134},{66,132},{58,132},{51,129},{48,127}},'skin')
 Pair({{51,124},{54,126},{60,129},{66,131},{64,132},{58,131},{52,129},{49,127}},'skin_light')
 PairRect(52,126,3,1,'skin_glint');PairRect(58,132,7,1,'skin_dark')
 PairRect(67,130,1,3,'skin_dark');PairRect(72,130,3,1,'skin_light')
 PairRect(74,132,1,2,'skin_dark');PairRect(77,132,1,2,'skin_dark')
end)
end
for _,l in ipairs(barman.layers) do if l.name=='Layer 1' then barman:deleteLayer(l) end end
local durations={2.8,.14,.16,.12,2.98,.08,.12,.10}
for f,d in ipairs(durations) do barman.frames[f].duration=d end
barman:newTag(1,1).name='resting_static';barman:newTag(2,4).name='small_mouth_motion';barman:newTag(6,8).name='discrete_blink'
barman:saveAs(out..'/source/barman.aseprite')
-- Independently editable apron emblem, at the same source pixel pitch.
local badge=Sprite(32,26,ColorMode.RGB);badge:setPalette(pal);badge:assignColorSpace(ColorSpace{sRGB=true})
for _,l in ipairs(barman.layers) do if l.name=='60_apron_stein_emblem' then
 local full=Image(136,144,ColorMode.RGB);local c=l:cel(1);full:drawImage(c.image,c.position)
 badge:newCel(badge.layers[1],1,Image(full,Rectangle(68,104,32,26)))
end end
badge.layers[1].name='B11_mug_and_laurels_native';badge:saveAs(out..'/source/apron-emblem.aseprite');Image(badge):saveAs(out..'/exports/apron-emblem-1x.png')
badge:resize(256,208);Image(badge):saveAs(out..'/exports/apron-emblem-8x.png')
print('CREATED_BARMAN: native Aseprite '..tostring(app.version)..'; 136x144 / 8 frames / 10 layers; entire head translated down 4px without rescaling; fixed collar/body/emblem')
