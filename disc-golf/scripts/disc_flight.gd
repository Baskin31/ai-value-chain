class_name DiscFlight
extends Node3D

# Disc flight constants — tune these for arcade feel
@export var max_speed: float = 22.0
@export var glide: float = 5.0      # lift multiplier (higher = floatier)
@export var turn: float = -1.2      # high-speed lateral drift (neg = right for RHBH)
@export var fade: float = 2.2       # low-speed hook (pos = left for RHBH)

enum State { IDLE, FLYING, BOUNCING, LANDED }
var state: State = State.IDLE

var velocity: Vector3 = Vector3.ZERO
var initial_speed: float = 0.0
var spin_yaw: float = 0.0
var bounce_count: int = 0

const GRAVITY: float = 12.0
const LIFT_BASE: float = 0.30
const DRAG: float = 0.020
const GROUND_Y: float = 0.0
const DISC_HEIGHT: float = 0.014   # half-height for ground contact
const SPIN_SPEED: float = 900.0    # deg/sec visual spin

signal landed(position: Vector3)

var _mesh: MeshInstance3D

func _ready() -> void:
	_build_mesh()

func _build_mesh() -> void:
	_mesh = MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.10
	cyl.bottom_radius = 0.115
	cyl.height = 0.028
	cyl.radial_segments = 32
	_mesh.mesh = cyl

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.35, 0.0)
	mat.metallic = 0.15
	mat.roughness = 0.25
	_mesh.material_override = mat
	add_child(_mesh)

func throw_disc(origin: Vector3, direction: Vector3, power: float, accuracy_offset: float) -> void:
	global_position = origin
	state = State.FLYING
	bounce_count = 0
	spin_yaw = 0.0

	# Accuracy bends throw direction laterally
	var right := direction.cross(Vector3.UP).normalized()
	var aimed := (direction + right * accuracy_offset * 0.28).normalized()
	aimed = (aimed + Vector3.UP * 0.13).normalized()  # upward launch angle

	initial_speed = max_speed * power
	velocity = aimed * initial_speed

func _physics_process(delta: float) -> void:
	match state:
		State.FLYING:
			_step_flight(delta)
		State.BOUNCING:
			_step_bounce(delta)

func _step_flight(delta: float) -> void:
	var speed := velocity.length()
	var speed_ratio := speed / initial_speed if initial_speed > 0.0 else 0.0

	# Lift — speed-dependent, counters gravity at cruise speed
	velocity.y += LIFT_BASE * glide * speed * delta - GRAVITY * delta

	# Drag
	if speed > 0.01:
		velocity -= velocity.normalized() * speed * DRAG * delta * 60.0

	# Turn/fade: lateral aerodynamics
	var flat := Vector3(velocity.x, 0.0, velocity.z)
	if flat.length() > 0.2:
		var right := flat.normalized().cross(Vector3.DOWN)
		if speed_ratio > 0.42:
			# High speed: turn (exaggerated arcade drift)
			velocity += right * turn * speed_ratio * delta * 6.0
		else:
			# Low speed: fade hooks away
			velocity -= right * fade * (1.0 - speed_ratio) * delta * 5.0

	global_position += velocity * delta
	_update_visual(delta)

	if global_position.y <= GROUND_Y + DISC_HEIGHT:
		_begin_bounce()

func _begin_bounce() -> void:
	global_position.y = GROUND_Y + DISC_HEIGHT
	var speed := velocity.length()

	if speed < 2.5 or bounce_count >= 3:
		_land()
		return

	state = State.BOUNCING
	bounce_count += 1
	velocity.y = abs(velocity.y) * 0.32
	velocity.x *= 0.72
	velocity.z *= 0.72

func _step_bounce(delta: float) -> void:
	velocity.y -= GRAVITY * delta
	global_position += velocity * delta
	_update_visual(delta)

	if global_position.y <= GROUND_Y + DISC_HEIGHT:
		_begin_bounce()

func _land() -> void:
	state = State.LANDED
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
