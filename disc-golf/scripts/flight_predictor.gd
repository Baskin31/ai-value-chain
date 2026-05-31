class_name FlightPredictor
extends Node3D

# ── Physics constants — must mirror disc_flight.gd exactly ─────────────────────
const GRAVITY:    float = 12.0
const LIFT_BASE:  float = 0.30
const DRAG:       float = 0.020
const GLIDE:      float = 5.0
const TURN:       float = -1.2
const FADE:       float = 2.2
const MAX_SPEED:  float = 22.0
const DISC_H:     float = 0.014

# ── Simulation settings ─────────────────────────────────────────────────────────
const SEARCH_DT:    float = 0.05    # coarse step for binary search (fast)
const VIZ_DT:       float = 0.025   # finer step for arc visualization
const MAX_STEPS:    int   = 600     # 600 * 0.05 = 30s ceiling
const VIZ_STEPS:    int   = 800
const DOT_COUNT:    int   = 60      # max dots drawn along arc
const SEARCH_ITERS: int   = 18      # binary search iterations (precision ~1/262144)

# Power level that lands at the current aim distance — read by ThrowController
var power_target: float = 0.5

# ── Visuals ─────────────────────────────────────────────────────────────────────
var _mmi: MultiMeshInstance3D

func _ready() -> void:
	_mmi = MultiMeshInstance3D.new()

	var dot := CylinderMesh.new()
	dot.top_radius    = 0.07
	dot.bottom_radius = 0.07
	dot.height        = 0.025
	dot.radial_segments = 8
	dot.rings = 1

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = dot
	mm.instance_count = DOT_COUNT
	mm.visible_instance_count = 0

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.88, 0.0, 0.82)
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_mmi.multimesh = mm
	_mmi.material_override = mat
	add_child(_mmi)

# ── Dirty tracking so we don't resimulate every frame ──────────────────────────
var _last_origin:    Vector3 = Vector3.INF
var _last_direction: Vector3 = Vector3.ZERO
var _last_distance:  float   = -1.0

func update(origin: Vector3, direction: Vector3, distance: float) -> void:
	if origin.distance_to(_last_origin)        < 0.05 and \
	   direction.distance_to(_last_direction)  < 0.015 and \
	   abs(distance - _last_distance)          < 0.4:
		return

	_last_origin    = origin
	_last_direction = direction
	_last_distance  = distance

	var flat_dir := Vector3(direction.x, 0.0, direction.z).normalized()
	var target_dist: float = Vector2(flat_dir.x, flat_dir.z).length() * distance

	power_target = _find_power(origin, flat_dir, distance)

	var path := _simulate(origin, flat_dir, power_target, VIZ_DT, VIZ_STEPS)
	_draw_arc(path)

func set_path_visible(v: bool) -> void:
	_mmi.visible = v

# ── Binary search ───────────────────────────────────────────────────────────────

func _find_power(origin: Vector3, flat_dir: Vector3, target_dist: float) -> float:
	# Check whether 100% power can even reach the target
	var max_path := _simulate(origin, flat_dir, 1.0, SEARCH_DT, MAX_STEPS)
	var max_land := max_path[max_path.size() - 1]
	var max_dist: float = Vector2(max_land.x - origin.x, max_land.z - origin.z).length()
	if max_dist <= target_dist:
		return 1.0

	var low  := 0.0
	var high := 1.0
	for _i in range(SEARCH_ITERS):
		var mid := (low + high) * 0.5
		var path := _simulate(origin, flat_dir, mid, SEARCH_DT, MAX_STEPS)
		var land := path[path.size() - 1]
		var dist: float = Vector2(land.x - origin.x, land.z - origin.z).length()
		if dist < target_dist:
			low = mid
		else:
			high = mid

	return clamp((low + high) * 0.5, 0.0, 1.0)

# ── Physics simulation (mirrors _step_flight in disc_flight.gd) ────────────────

func _simulate(origin: Vector3, flat_dir: Vector3, power: float,
		dt: float, max_steps: int) -> PackedVector3Array:
	var points := PackedVector3Array()
	var pos    := origin
	var initial_speed: float = MAX_SPEED * power

	# Match throw_disc() launch angle
	var aimed := (flat_dir + Vector3.UP * 0.13).normalized()
	var vel   := aimed * initial_speed

	for _i in range(max_steps):
		points.append(pos)

		var speed: float       = vel.length()
		var speed_ratio: float = speed / initial_speed if initial_speed > 0.0 else 0.0

		vel.y += LIFT_BASE * GLIDE * speed * dt - GRAVITY * dt

		if speed > 0.01:
			vel -= vel.normalized() * speed * DRAG * dt * 60.0

		var flat := Vector3(vel.x, 0.0, vel.z)
		if flat.length() > 0.2:
			var right := flat.normalized().cross(Vector3.DOWN)
			if speed_ratio > 0.42:
				vel += right * TURN * speed_ratio * dt * 6.0
			else:
				vel -= right * FADE * (1.0 - speed_ratio) * dt * 5.0

		pos += vel * dt

		if pos.y <= DISC_H:
			pos.y = 0.0
			points.append(pos)
			break

	if points.is_empty():
		points.append(origin)
	return points

# ── Arc visualisation ───────────────────────────────────────────────────────────

func _draw_arc(path: PackedVector3Array) -> void:
	var n := path.size()
	if n < 2:
		_mmi.multimesh.visible_instance_count = 0
		return

	var shown: int = min(DOT_COUNT, n)
	_mmi.multimesh.visible_instance_count = shown

	for i in range(shown):
		var idx := int(float(i) / float(shown - 1) * float(n - 1))
		idx = clamp(idx, 0, n - 1)
		var t := Transform3D(Basis(), path[idx])
		_mmi.multimesh.set_instance_transform(i, t)
