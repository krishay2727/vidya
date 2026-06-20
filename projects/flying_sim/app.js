// ============================================================
// VECTOR-1 FLIGHT SIM — App / Input / Instruments
// ============================================================

// ---------------- Input state ----------------
const Input = {
  pitch: 0, roll: 0, yaw: 0, throttle: 0.45,
  source: 'none' // 'arduino' | 'keyboard'
};

const Keys = {};
let serialPort = null;
let serialReader = null;
let serialActive = false;

// Calibration for joystick (raw ADC 0-1023, center ~512)
const JS = {
  rollCenter: 512, pitchCenter: 512, yawCenter: 512, throttleCenter: 512,
  deadzone: 25
};

// ---------------- Web Serial ----------------
async function connectArduino(){
  if(!('serial' in navigator)){
    alert('Web Serial API not available. Please use Chrome or Edge desktop.');
    return;
  }
  try{
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    serialActive = true;
    Input.source = 'arduino';
    setConnUI(true);
    hideSetup();
    readSerialLoop();
  }catch(err){
    console.error('Serial connection failed:', err);
    setConnUI(false, 'CONNECT FAILED');
  }
}

async function readSerialLoop(){
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  serialReader = textDecoder.readable.getReader();

  let buffer = '';
  try{
    while(serialActive){
      const { value, done } = await serialReader.read();
      if(done) break;
      buffer += value;
      let idx;
      while((idx = buffer.indexOf('\n')) >= 0){
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx+1);
        if(line) parseSerialLine(line);
      }
    }
  }catch(err){
    console.error('Serial read error:', err);
  }finally{
    serialReader.releaseLock();
  }
}

function parseSerialLine(line){
  // roll,pitch,yaw,throttle,btn1,btn2
  const parts = line.split(',').map(Number);
  if(parts.length < 4 || parts.some(isNaN)) return;

  const [rollRaw, pitchRaw, yawRaw, throttleRaw] = parts;

  Input.roll    = applyDeadzone(rollRaw    - JS.rollCenter,     512) ;
  Input.pitch   = applyDeadzone(pitchRaw   - JS.pitchCenter,    512) * -1; // forward = nose down feel
  Input.yaw     = applyDeadzone(yawRaw     - JS.yawCenter,      512) ;
  Input.throttle = clamp(1 - (throttleRaw / 1023), 0, 1); // push up = more throttle (joystick fwd = lower ADC typically)

  flashLiveDot();
}

function applyDeadzone(val, range){
  if(Math.abs(val) < JS.deadzone) return 0;
  const sign = val > 0 ? 1 : -1;
  const mag = (Math.abs(val) - JS.deadzone) / (range - JS.deadzone);
  return sign * clamp(mag, 0, 1);
}

let liveDotTimeout;
function flashLiveDot(){
  const dot = document.getElementById('conn-dot');
  dot.classList.add('live');
  clearTimeout(liveDotTimeout);
  liveDotTimeout = setTimeout(()=> dot.classList.remove('live'), 200);
}

function setConnUI(connected, label){
  const dot = document.getElementById('conn-dot');
  const text = document.getElementById('conn-text');
  const btn = document.getElementById('btn-connect');
  if(connected){
    text.textContent = 'ARDUINO LINKED';
    dot.classList.add('live');
    btn.textContent = 'Disconnect';
  }else{
    text.textContent = label || 'NO LINK';
    dot.classList.remove('live');
    btn.textContent = 'Connect Arduino';
  }
}

// ---------------- Keyboard fallback ----------------
function useKeyboard(){
  Input.source = 'keyboard';
  document.getElementById('conn-text').textContent = 'KEYBOARD MODE';
  hideSetup();
}

window.addEventListener('keydown', e=>{ Keys[e.code] = true; });
window.addEventListener('keyup', e=>{ Keys[e.code] = false; });

function updateKeyboardInput(dt){
  if(Input.source !== 'keyboard') return;

  const rampSpeed = 2.2 * dt;
  let targetPitch = 0, targetRoll = 0, targetYaw = 0;

  if(Keys['KeyW']) targetPitch = 1;
  if(Keys['KeyS']) targetPitch = -1;
  if(Keys['KeyA']) targetRoll = -1;
  if(Keys['KeyD']) targetRoll = 1;
  if(Keys['KeyQ']) targetYaw = -1;
  if(Keys['KeyE']) targetYaw = 1;

  Input.pitch += (targetPitch - Input.pitch) * Math.min(1, rampSpeed*3);
  Input.roll  += (targetRoll  - Input.roll ) * Math.min(1, rampSpeed*3);
  Input.yaw   += (targetYaw   - Input.yaw  ) * Math.min(1, rampSpeed*3);

  if(Keys['ShiftLeft'] || Keys['ShiftRight']) Input.throttle = clamp(Input.throttle + dt*0.6, 0, 1);
  if(Keys['ControlLeft'] || Keys['ControlRight']) Input.throttle = clamp(Input.throttle - dt*0.6, 0, 1);

  if(Keys['KeyR']) resetSim();
}

// ---------------- Setup overlay ----------------
function hideSetup(){
  document.getElementById('setup').style.display = 'none';
}

document.getElementById('btn-connect').addEventListener('click', ()=>{
  if(serialActive){
    disconnectArduino();
  } else {
    connectArduino();
  }
});
document.getElementById('btn-keyboard').addEventListener('click', useKeyboard);
document.getElementById('btn-connect-2').addEventListener('click', connectArduino);
document.getElementById('btn-keyboard-2').addEventListener('click', useKeyboard);

async function disconnectArduino(){
  serialActive = false;
  try{
    if(serialReader) await serialReader.cancel();
    if(serialPort) await serialPort.close();
  }catch(e){ console.warn(e); }
  setConnUI(false);
  Input.source = 'none';
}

// ---------------- Instrument rendering ----------------
function buildTapeMarks(){
  // Speed tape: marks every 20kt over a window of 120kt
  const speedMarks = document.getElementById('speed-marks');
  const altMarks = document.getElementById('alt-marks');
  // populated dynamically each frame instead (simpler, avoids stale DOM)
}

function updateSpeedTape(speed){
  document.getElementById('speed-readout').textContent = String(Math.max(0,Math.round(speed))).padStart(3,'0');
}

function updateAltTape(alt){
  const ft = Math.round(alt * 3.5); // scale world units to "feet" for instrument feel
  document.getElementById('alt-readout').textContent = String(Math.max(0,ft)).padStart(4,'0');
}

function updateVSI(vsi){
  const el = document.getElementById('vs-readout');
  const val = Math.round(vsi);
  const sign = val >= 0 ? '+' : '-';
  el.innerHTML = sign + String(Math.abs(val)).padStart(4,'0') + '<span class="readout-unit">fpm</span>';
  el.classList.toggle('warn', val < -800);
}

function updateGForce(g){
  const el = document.getElementById('g-readout');
  el.innerHTML = g.toFixed(1) + '<span class="readout-unit">g</span>';
  el.classList.toggle('warn', g > 3.2 || g < -0.5);
}

function updateThrottleGauge(t){
  document.getElementById('throttle-fill').style.height = (t*100).toFixed(0) + '%';
}

let pitchLinesBuilt = false;
function buildPitchLines(){
  const container = document.getElementById('pitch-lines');
  container.innerHTML = '';
  for(let deg=-90; deg<=90; deg+=10){
    if(deg===0) continue;
    const line = document.createElement('div');
    line.className = 'pitch-line' + (deg%20!==0 ? ' minor' : '');
    const yOffset = -deg * 3.0; // px per degree
    line.style.top = yOffset + 'px';
    if(deg%20===0){
      const label = document.createElement('span');
      label.textContent = Math.abs(deg);
      line.appendChild(label);
    }
    container.appendChild(line);
  }
  pitchLinesBuilt = true;
}

function updateHorizon(pitchRad, rollRad){
  if(!pitchLinesBuilt) buildPitchLines();
  const pitchDeg = pitchRad * 180/Math.PI;
  const rollDeg = rollRad * 180/Math.PI;

  const ball = document.getElementById('horizon-ball');
  const translateY = pitchDeg * 3.0; // matches buildPitchLines scale
  ball.style.transform = `rotate(${-rollDeg}deg) translateY(${translateY}px)`;

  const bankPointer = document.getElementById('bank-pointer');
  bankPointer.style.transform = `translateX(-50%) rotate(${-rollDeg}deg)`;
  bankPointer.style.transformOrigin = '50% 130px';
}

function updateCompass(yawRad){
  let deg = (yawRad * 180/Math.PI) % 360;
  if(deg < 0) deg += 360;

  const strip = document.getElementById('compass-strip');
  if(!strip.dataset.built){
    let html = '';
    for(let d=-360; d<=720; d+=10){
      const norm = ((d%360)+360)%360;
      const dirs = {0:'N',90:'E',180:'S',270:'W'};
      const label = dirs[norm] !== undefined ? dirs[norm] : norm;
      html += `<span class="compass-tick ${dirs[norm]!==undefined?'major':''}">${label}</span>`;
    }
    strip.innerHTML = html;
    strip.dataset.built = '1';
  }
  const pxPerTick = 34;
  const ticksFromZero = (deg) / 10;
  const offset = -(ticksFromZero * pxPerTick) + 360 - pxPerTick/2 - (170 - 17);
  strip.style.left = (170 - (deg/10)*pxPerTick - pxPerTick*36) + 'px';
}

function updateStallWarning(speed, stallSpeed){
  document.getElementById('stall-warn').style.display = speed < stallSpeed ? 'block' : 'none';
}

function showCrash(){
  document.getElementById('status-title').textContent = 'CRASHED';
  document.getElementById('status-sub').textContent = 'Press R to reset';
  document.getElementById('status-msg').style.display = 'block';
}
function hideStatus(){
  document.getElementById('status-msg').style.display = 'none';
}

function resetSim(){
  Physics.reset();
  hideStatus();
}

// ---------------- Camera follow ----------------
function updateCamera(){
  const p = Physics;
  const cp = Math.cos(p.rotation.pitch), sp = Math.sin(p.rotation.pitch);
  const cy = Math.cos(p.rotation.yaw),   sy = Math.sin(p.rotation.yaw);

  plane.position.set(p.position.x, p.position.y, p.position.z);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = p.rotation.yaw;
  plane.rotation.x = p.rotation.pitch;
  plane.rotation.z = -p.rotation.roll;

  // Chase camera, offset behind & above, smoothly following orientation
  const backDist = 16, upDist = 4.5;
  const forward = { x:-sy*cp, y:sp, z:-cy*cp };

  const camTargetX = p.position.x - forward.x*backDist;
  const camTargetY = p.position.y - forward.y*backDist + upDist;
  const camTargetZ = p.position.z - forward.z*backDist;

  camera.position.x += (camTargetX - camera.position.x) * 0.12;
  camera.position.y += (camTargetY - camera.position.y) * 0.12;
  camera.position.z += (camTargetZ - camera.position.z) * 0.12;

  const lookAtY = p.position.y + 1.2;
  camera.lookAt(p.position.x, lookAtY, p.position.z);
  camera.rotation.z = -p.rotation.roll * 0.25; // subtle roll tilt for feel
}

// ---------------- Main loop ----------------
let lastTime = performance.now();

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime)/1000, 0.1);
  lastTime = now;

  updateKeyboardInput(dt);

  Physics.update(dt, {
    pitch: Input.pitch,
    roll: Input.roll,
    yaw: Input.yaw,
    throttle: Input.throttle
  });

  if(Physics.crashed){
    showCrash();
  }

  updateCamera();
  if(typeof updateTerrain === 'function') updateTerrain(Physics.position.x, Physics.position.z);
  if(typeof recycleClouds === 'function') recycleClouds(Physics.position.x, Physics.position.z);

  updateSpeedTape(Physics.speed);
  updateAltTape(Physics.altitude);
  updateVSI(Physics.vsi);
  updateGForce(Physics.gForce);
  updateThrottleGauge(Physics.throttle);
  updateHorizon(Physics.rotation.pitch, Physics.rotation.roll);
  updateCompass(Physics.rotation.yaw);
  updateStallWarning(Physics.speed, Physics.STALL_SPEED);

  renderer.render(scene, camera);
}

// ---------------- Boot ----------------
window.addEventListener('load', ()=>{
  initScene();
  buildPitchLines();
  animate();
});
