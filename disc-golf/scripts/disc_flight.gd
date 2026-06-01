class_name DiscFlight
extends Node3D

# ── Tunable flight constants ────────────────────────────────────────────────────
@export var max_speed: float = 22.0
@export var glide:     float = 5.0   # lift multiplier (higher = floatier)

# ── Physics constants (mirrored in flight_predictor.gd — keep in sync) ─────────
const GRAVITY:         float = 12.0
const LIFT_BASE:       float = 0.30
const DRAG:            float = 0.020
const GROUND_Y:        float = 0.0
const DISC_HEIGHT:     float = 0.014

## Speed-ratio crossover: above = turn phase, below = fade phase. Tunable.
const FADE_THRESHOLD:  float = 0.42

## Base lateral forces for a flat release with spin_direction = +1 (RHBH/LHFH).
## Negated automatically for spin_direction = -1 (RHFH/LHBH).
## right_vec = flat_vel.cross(Vector3.UP) — the true world-right of the disc's flight.
const TURN_BASE:       float = 7.2   # right-turn strength at high speed
const FADE_BASE:       float = 9.0   # left-fade  strength at low speed

## How much curve_intensity amplifies turn / shifts fade (±1 = full hyzer/anhyzer).
const CURVE_TURN_AMP:  float = 4.0
const CURVE_FADE_AMP:  float = 5.0

const SPIN_SPEED:      float = 900.0 # visual disc spin, deg/sec

# ── State ───────────────────────────────────────────────────────────────────────
enum State { IDLE, FLYING, BOUNCING, LANDED }
var state: State = State.IDLE

var velocity:      Vector3 = Vector3.ZERO
var initial_speed: float   = 0.0
var spin_yaw:      float   = 0.0
var bounce_count:  int     = 0

## Set by throw_disc() via ThrowMath; drive lateral forces each frame.
var _spin_direction:  int   = 1    # +1 CW (RHBH/LHFH), -1 CCW (RHFH/LHBH)
var _curve_intensity: float = 0.0  # -1 hyzer … 0 flat … +1 anhyzer

signal landed(position: Vector3)

var _mesh: MeshInstance3D

func _ready() -> void:
	_build_mesh()

func _build_mesh() -> void:
	_mesh = MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius    = 0.10
	cyl.bottom_radius = 0.115
	cyl.height        = 0.028
	cyl.radial_segments = 32
	_mesh.mesh = cyl

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.35, 0.0)
	mat.metallic     = 0.15
	mat.roughness    = 0.25
	_mesh.material_override = mat
	add_child(_mesh)

# ── Public API ──────────────────────────────────────────────────────────────────

func throw_disc(origin: Vector3, direction: Vector3, throw_input: ThrowInput) -> void:
	global_position = origin
	state           = State.FLYING
	bounce_count    = 0
	spin_yaw        = 0.0

	var sc := ThrowMath.compute_spin_and_curve(throw_input)
	_spin_direction  = sc["spin_direction"]
	_curve_intensity = sc["curve_intensity"]

	var aimed := (direction + Vector3.UP * 0.13).normalized()
	initial_speed = max_speed * throw_input.power
	velocity      = aimed * initial_speed

func stop_in_basket(basket_world_pos: Vector3) -> void:
	state    = State.LANDED
	velocity = Vector3.ZERO
	global_position = basket_world_pos

# ── Physics ─────────────────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	match state:
		State.FLYING:
			_step_flight(delta)
		State.BOUNCING:
			_step_bounce(delta)

func _step_flight(delta: float) -> void:
	var speed: float       = velocity.length()
	var speed_ratio: float = speed / initial_speed if initial_speed > 0.0 else 0.0

	# Lift — keeps disc airborne at cruise speed
	velocity.y += LIFT_BASE * glide * speed * delta - GRAVITY * delta

	# Drag
	if speed > 0.01:
		velocity -= velocity.normalized() * speed * DRAG * delta * 60.0

	# Lateral aerodynamics
	# right_vec: true world-right relative to current flight direction
	var flat := Vector3(velocity.x, 0.0, velocity.z)
	if flat.length() > 0.2:
		var right_vec := flat.normalized().cross(Vector3.UP)
		var lateral: float
		if speed_ratio > FADE_THRESHOLD:
			# Turn phase — disc spins fast, gyroscopic effect pulls in spin direction
			lateral = float(_spin_direction) * (
				TURN_BASE * speed_ratio +
				_curve_intensity * CURVE_TURN_AMP * speed_ratio
			)
		else:
			# Fade phase — disc slows, tips and hooks against the turn
			lateral = float(_spin_direction) * (
				-FADE_BASE * (1.0 - speed_ratio) +
				_curve_intensity * CURVE_FADE_AMP * (1.0 - speed_ratio)
			)
		velocity += right_vec * lateral * delta

	global_position += velocity * delta
	_update_visual(delta)

	if global_position.y <= GROUND_Y + DISC_HEIGHT:
		_begin_bounce()

func _begin_bounce() -> void:
	global_position.y = GROUND_Y + DISC_HEIGHT
	var speed: float = velocity.length()

	if speed < 2.5 or bounce_count >= 3:
		_land()
		return

	state = State.BOUNCING
	bounce_count += 1
	velocity.y  = abs(velocity.y) * 0.32
	velocity.x *= 0.72
	velocity.z *= 0.72

func _step_bounce(delta: float) -> void:
	velocity.y -= GRAVITY * delta
	global_position += velocity * delta
	_update_visual(delta)

	if global_position.y <= GROUND_Y + DISC_HEIGHT:
		_begin_bounce()

func _land() -> void:
	state    = State.LANDED
	velocity = Vector3.ZERO
	global_position.y = GROUND_Y + DISC_HEIGHT
	landed.emit(global_position)

func _update_visual(delta: float) -> void:
	spin_yaw = fmod(spin_yaw + SPIN_SPEED * delta, 360.0)
	_mesh.rotation_degrees.y = spin_yaw

	var flat := Vector3(velocity.x, 0.0, velocity.z)
	if flat.length() > 0.3:
		var pitch: float = clamp(-rad_to_deg(atan2(velocity.y, flat.length())) * 0.65, -28.0, 22.0)
		_mesh.rotation_degrees.x = pitch
	else:
		_mesh.rotation_degrees.x = 0.0
