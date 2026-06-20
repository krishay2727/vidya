// ============================================================
// VECTOR-1 FLIGHT SIM — 3D World
// ============================================================

let scene, camera, renderer, plane, clouds = [], terrainChunks = [];
const CHUNK_SIZE = 800;
const RENDER_DIST = 2; // chunks in each direction

function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7fb8e8);
  scene.fog = new THREE.Fog(0x9fc8e8, 400, 4500);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 6000);

  renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  document.getElementById('scene').appendChild(renderer.domElement);

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
  sun.position.set(400, 600, 200);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x6688aa, 0.65));

  buildSky();
  buildPlane();
  initTerrain();
  buildClouds();

  window.addEventListener('resize', onResize);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function buildSky(){
  const skyGeo = new THREE.SphereGeometry(5000, 16, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x7fb8e8, side: THREE.BackSide, fog:false
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

function buildPlane(){
  plane = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness:0.3, roughness:0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xff6b4a, metalness:0.2, roughness:0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness:0.6, roughness:0.2 });

  // Fuselage
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.35, 5, 12),
    bodyMat
  );
  fuselage.rotation.x = Math.PI/2;
  plane.add(fuselage);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12), bodyMat);
  nose.rotation.x = -Math.PI/2;
  nose.position.z = -3.1;
  plane.add(nose);

  // Cockpit glass
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), glassMat);
  cockpit.position.set(0, 0.35, -1.6);
  cockpit.scale.set(1, 0.8, 1.4);
  plane.add(cockpit);

  // Wings
  const wingGeo = new THREE.BoxGeometry(6.5, 0.08, 1.1);
  const wing = new THREE.Mesh(wingGeo, accentMat);
  wing.position.set(0, -0.05, 0.2);
  plane.add(wing);

  // Tailplane
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.6), bodyMat);
  tailWing.position.set(0, 0, 2.4);
  plane.add(tailWing);

  // Vertical stabilizer
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.9), accentMat);
  fin.position.set(0, 0.55, 2.3);
  plane.add(fin);

  // Wingtip markers
  [-1, 1].forEach(side=>{
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: side<0 ? 0xff3030 : 0x30ff60 }));
    tip.position.set(side*3.25, -0.05, 0.2);
    plane.add(tip);
  });

  scene.add(plane);
}

// ---- Procedural terrain (chunked, rolling hills + simple texture) ----
function makeTerrainChunk(cx, cz){
  const segs = 24;
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i) + cx*CHUNK_SIZE;
    const z = pos.getZ(i) + cz*CHUNK_SIZE;
    const h = terrainHeight(x, z);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a7c3a, flatShading:true, roughness:1
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx*CHUNK_SIZE, 0, cz*CHUNK_SIZE);
  mesh.userData.cx = cx;
  mesh.userData.cz = cz;
  scene.add(mesh);
  return mesh;
}

function terrainHeight(x, z){
  // Layered noise-ish function (no external lib, deterministic)
  const h1 = Math.sin(x*0.004)*Math.cos(z*0.004)*60;
  const h2 = Math.sin(x*0.012+1.3)*Math.cos(z*0.009+0.7)*22;
  const h3 = Math.sin(x*0.035)*Math.cos(z*0.04)*6;
  return h1 + h2 + h3 - 40;
}

function initTerrain(){
  for(let cx=-RENDER_DIST; cx<=RENDER_DIST; cx++){
    for(let cz=-RENDER_DIST; cz<=RENDER_DIST; cz++){
      terrainChunks.push(makeTerrainChunk(cx, cz));
    }
  }
}

function updateTerrain(px, pz){
  const ccx = Math.round(px / CHUNK_SIZE);
  const ccz = Math.round(pz / CHUNK_SIZE);

  const needed = new Set();
  for(let dx=-RENDER_DIST; dx<=RENDER_DIST; dx++){
    for(let dz=-RENDER_DIST; dz<=RENDER_DIST; dz++){
      needed.add((ccx+dx)+','+(ccz+dz));
    }
  }

  // remove far chunks
  terrainChunks = terrainChunks.filter(chunk=>{
    const key = chunk.userData.cx+','+chunk.userData.cz;
    if(!needed.has(key)){
      scene.remove(chunk);
      chunk.geometry.dispose();
      return false;
    }
    needed.delete(key);
    return true;
  });

  // add new chunks
  needed.forEach(key=>{
    const [cx, cz] = key.split(',').map(Number);
    terrainChunks.push(makeTerrainChunk(cx, cz));
  });
}

function buildClouds(){
  const cloudMat = new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.85, flatShading:true });
  for(let i=0;i<40;i++){
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random()*3);
    for(let p=0;p<puffs;p++){
      const s = 18 + Math.random()*22;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), cloudMat);
      puff.position.set((Math.random()-0.5)*40, (Math.random()-0.5)*10, (Math.random()-0.5)*40);
      group.add(puff);
    }
    group.position.set(
      (Math.random()-0.5)*3000,
      120 + Math.random()*300,
      (Math.random()-0.5)*3000
    );
    scene.add(group);
    clouds.push(group);
  }
}

function recycleClouds(px, pz){
  clouds.forEach(c=>{
    const dx = c.position.x - px;
    const dz = c.position.z - pz;
    if(Math.sqrt(dx*dx+dz*dz) > 1800){
      c.position.x = px + (Math.random()-0.5)*3000;
      c.position.z = pz + (Math.random()-0.5)*3000;
      c.position.y = 120 + Math.random()*300;
    }
  });
}
