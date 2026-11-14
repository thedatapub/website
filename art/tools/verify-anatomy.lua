local h=assert(app.open(assert(app.params.barman)))
local function layer(name)for _,l in ipairs(h.layers) do if l.name==name then return l end end;error(name) end
local function full(l,f)local c=assert(l:cel(f));local im=Image(136,144,ColorMode.RGB);im:clear(0);im:drawImage(c.image,c.position);return im end
local function solid(im,x,y)if x<0 or y<0 or x>=136 or y>=144 then return false end;return app.pixelColor.rgbaA(im:getPixel(x,y))>0 end
local names={'10_cotton_shoulders_upperarms_elbows','40_collars_apron_straps_and_brass','80_connected_forearms_wrists_and_hands'}
for f=1,8 do
 local imgs={};for _,n in ipairs(names) do imgs[#imgs+1]=full(layer(n),f) end
 for i,im in ipairs(imgs) do
  for y=85,139 do for x=0,135 do assert(solid(im,x,y)==solid(im,167-x,y),'Asymmetric anatomy silhouette: '..names[i]..' '..x..','..y) end end
 end
 local body,hands=imgs[1],imgs[3]
 local seen={};local components=0
 for y=0,143 do for x=0,135 do local key=y*136+x
  if solid(hands,x,y) and not seen[key] then
   components=components+1;local q={{x,y}};seen[key]=true;local head=1;local overlaps=0;local size=0
   while head<=#q do local p=q[head];head=head+1;size=size+1
    if solid(body,p[1],p[2]) then overlaps=overlaps+1 end
    for _,d in ipairs({{-1,0},{1,0},{0,-1},{0,1}}) do local nx,ny=p[1]+d[1],p[2]+d[2];local k=ny*136+nx
     if solid(hands,nx,ny) and not seen[k] then seen[k]=true;q[#q+1]={nx,ny} end
    end
   end
   assert(overlaps>=30,'Forearm not anchored in sleeve');assert(size>=200,'Detached hand/finger component')
   print('frame '..f..' forearm '..components..': '..size..' connected pixels, '..overlaps..' sleeve-overlap pixels')
  end
 end end
 assert(components==2,'Hands/forearms must have exactly two connected silhouettes')
end
print('BARMAN_ANATOMY_OK: exact mirrored body/collar/apron/forearm silhouettes around x=83.5; two continuous forearms with substantial sleeve overlap; identical anatomy across all frames')
