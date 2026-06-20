// ============================================================
// VECTOR-1 FLIGHT SIM — Physics Model
// ============================================================
// A simplified but plausible flight model:
// - Speed builds from throttle, drained by drag & climb
// - Lift depends on speed (stalls at low speed)
// - Pitch/roll/yaw inputs rotate the aircraft; gravity & momentum
//   determine actual trajectory (you don't just "point and go")
// ------------------------------------------------------------

const Physics = {
  // State
  position: { x: 0, y: 220, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },       // world-space velocity vector
  rotation: { pitch: 0, yaw: 0, roll: 0 }, // radians

  speed: 60,            // forward airspeed (knots-ish scalar)
  throttle: 0.45,        // 0-1
  altitude: 220,
  vsi: 0,                // vertical speed, ft/min equivalent
  gForce: 1.0,

  crashed: false,
  grounded: false,

  // Tuning constants
  MAX_THRUST: 0.085,
  DRAG_COEF: 0.85,
  LIFT_COEF: 0.018,
  STALL_SPEED: 32,
  GRAVITY: 0.018,
  PITCH_RATE: 1.6,   // rad/sec at full input
  ROLL_RATE: 2.6,
  YAW_RATE: 0.9,
  MAX_SPEED: 220,

  reset(){
    this.position = { x: 0, y: 220, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { pitch: 0, yaw: 0, roll: 0 };
    this.speed = 60;
    this.throttle = 0.45;
    this.altitude = 220;
    this.vsi = 0;
    this.gForce = 1.0;
    this.crashed = false;
    this.grounded = false;
  },

  // inputs: { pitch, roll, yaw, throttle } each roughly -1..1 (throttle 0..1)
  update(dt, inputs){
    if(this.crashed) return;

    dt = Math.min(dt, 0.05); // clamp for stability on tab-switch lag

    // --- Throttle ---
    this.throttle = clamp(inputs.throttle, 0, 1);

    // --- Rotational input -> orientation ---
    const stallFactor = this.speed < this.STALL_SPEED ? 0.4 : 1.0; // sluggish controls near stall

    // Pitch uses proportional (target-angle) control rather than pure rate
    // accumulation: stick deflection commands a target climb/dive angle, and
    // the nose eases toward it. This is what makes "hold the stick gently back"
    // settle into a sane ~20-30deg climb instead of ramping to vertical -
    // matching how a real elevator-trimmed aircraft actually behaves.
    const targetPitch = inputs.pitch * 1.3; // full deflection -> ~74deg target
    const pitchEaseRate = 2.4 * stallFactor;
    this.rotation.pitch += (targetPitch - this.rotation.pitch) * Math.min(1, pitchEaseRate * dt);

    this.rotation.roll  += inputs.roll  * this.ROLL_RATE  * stallFactor * dt;
    this.rotation.yaw   += inputs.yaw   * this.YAW_RATE * dt;

    // roll wraps around smoothly (it's a full rotation, -PI..PI) rather than
    // accumulating unbounded, which is what broke auto-level and crash checks
    this.rotation.roll = wrapAngle(this.rotation.roll);

    // auto-level on roll when input near zero - takes the SHORTEST path back to 0
    if(Math.abs(inputs.roll) < 0.04 && Math.abs(this.rotation.roll) > 0.001){
      this.rotation.roll *= Math.max(0, 1 - 2.2*dt);
      if(Math.abs(this.rotation.roll) < 0.01) this.rotation.roll = 0;
    }

    // clamp pitch - past vertical the plane would need to be doing a loop,
    // which this simplified model doesn't support, so cap at just past vertical
    this.rotation.pitch = clamp(this.rotation.pitch, -1.5, 1.5);

    // --- Forward direction vector from orientation ---
    const cp = Math.cos(this.rotation.pitch), sp = Math.sin(this.rotation.pitch);
    const cy = Math.cos(this.rotation.yaw),   sy = Math.sin(this.rotation.yaw);

    const forward = {
      x: -sy * cp,
      y: sp,
      z: -cy * cp
    };

    // --- Thrust along forward vector ---
    const thrust = this.throttle * this.MAX_THRUST;

    // --- Drag (linear approximation, tuned to matter at cruise speeds) ---
    const drag = this.DRAG_COEF * this.speed;

    // --- Speed integration (along flight path) ---
    // Climbing bleeds speed (trading kinetic for potential energy),
    // diving builds speed back up. climbPenalty scales with current speed
    // too, so a steep climb at high speed costs much more than puttering
    // along slowly - and it can outweigh max thrust, which is the point:
    // you cannot climb at a 75 degree angle and hold max speed forever.
    const climbPenalty = forward.y * this.speed * 0.9;
    this.speed += (thrust * 2300 - drag - climbPenalty) * dt;
    this.speed = clamp(this.speed, 0, this.MAX_SPEED);

    // --- Lift vs gravity determines vertical behavior ---
    const lift = this.LIFT_COEF * this.speed * this.speed / 100;
    const stalling = this.speed < this.STALL_SPEED;
    const effectiveLift = stalling ? lift * (this.speed / this.STALL_SPEED) * 0.5 : lift;

    // Velocity = mostly along forward vector (arcade-ish but grounded in real cues),
    // with gravity pulling down independent of pitch when lift is insufficient.
    const targetVel = {
      x: forward.x * this.speed,
      y: forward.y * this.speed + (effectiveLift - this.GRAVITY*100) * 1.0,
      z: forward.z * this.speed
    };

    // Smooth velocity toward target (gives weight/inertia)
    const smoothing = stalling ? 1.8 : 3.2;
    this.velocity.x += (targetVel.x*0.013 - this.velocity.x) * smoothing * dt;
    this.velocity.y += (targetVel.y*0.013 - this.velocity.y) * smoothing * dt;
    this.velocity.z += (targetVel.z*0.013 - this.velocity.z) * smoothing * dt;

    // extra gravity drop when stalling badly
    if(stalling){
      this.velocity.y -= this.GRAVITY * (1 - this.speed/this.STALL_SPEED) * 2.2 * dt * 60;
    }

    // --- Integrate position ---
    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;
    this.position.z += this.velocity.z * dt * 60;

    this.altitude = this.position.y;
    this.vsi = this.velocity.y * 60 * 10; // rough ft/min scaling for display

    // --- G-force approximation (based on pitch rate + roll) ---
    const targetG = 1.0 + Math.abs(inputs.pitch) * 1.8 + Math.abs(this.rotation.roll) * 0.3;
    this.gForce += (targetG - this.gForce) * 4 * dt;

    // --- Ground collision ---
    const groundY = (typeof terrainHeight === 'function')
      ? terrainHeight(this.position.x, this.position.z) + 2
      : 2;

    if(this.position.y <= groundY){
      const impactSpeed = Math.abs(this.velocity.y) * 60;
      this.position.y = groundY;
      if(impactSpeed > 9 || Math.abs(this.rotation.roll) > 0.9 || this.speed < this.STALL_SPEED*0.6){
        this.crashed = true;
      } else {
        // soft landing - settle
        this.velocity.y = 0;
        this.grounded = true;
      }
    } else {
      this.grounded = false;
    }
  }
};

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function wrapAngle(a){
  // wraps to -PI..PI
  a = a % (Math.PI*2);
  if(a > Math.PI) a -= Math.PI*2;
  if(a < -Math.PI) a += Math.PI*2;
  return a;
}
