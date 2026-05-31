class_name CameraController
extends Camera3D

var target: Node3D                              # the disc
var throw_direction: Vector3 = Vector3.ZERO    # reference for idle aiming

const FOLLOW_SMOOTHNESS: float = 6.0
const AIM_SMOOTHNESS: float = 4.0
const FLIGHT_OFFSET: Vector3 = Vector3(0.0, 3.5, 7.0)   # behind+above in local space
const AIM_OFFSET: Vector3 = Vector3(0.0, 2.8, 6.5)

var _look_target: Vector3 = Vector3.ZERO

func _process(delta: float) -> void:
	if not target:
		return

	var disc_ref := target as DiscFlight
	var in_flight := disc_ref and disc_ref.state == DiscFlight.State.FLYING or \
					 (disc_ref and disc_ref.state == DiscFlight.State.BOUNCING)

	var desired_pos: Vector3
	var desired_look: Vector3

	if in_flight:
		# Follow behind and above the disc, offset opposite velocity
		var flat_vel := Vector3(disc_ref.velocity.x, 0.0, disc_ref.velocity.z)
		var back_dir := -flat_vel.normalized() if flat_vel.length() > 0.5 else -throw_direction
		desired_pos = target.global_position + back_dir * FLIGHT_OFFSET.z + Vector3.UP * FLIGHT_OFFSET.y
		desired_look = target.global_position + Vector3.UP * 0.4
	else:
		# Idle: camera sits behind player aim direction
		var back := -throw_direction
		desired_pos = target.global_position + back * AIM_OFFSET.z + Vector3.UP * AIM_OFFSET.y
		desired_look = target.global_position + throw_direction * 12.0 + Vector3.UP * 0.5

	var smooth := FOLLOW_SMOOTHNESS if in_flight else AIM_SMOOTHNESS
	global_position = global_position.lerp(desired_pos, smooth * delta)
	_look_target = _look_target.lerp(desired_look, smooth * delta)

	# look_at can error if camera is exactly at look target — guard it
	if global_position.distance_to(_look_target) > 0.01:
		look_at(_look_target, Vector3.UP)
