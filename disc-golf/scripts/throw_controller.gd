class_name ThrowController
extends Node

enum ThrowState { IDLE, BACKSWING, THROWN }

var disc: DiscFlight
var hud: HUD
var throw_origin: Vector3 = Vector3.ZERO
var throw_direction: Vector3 = Vector3(0.0, 0.0, -1.0)

signal thrown

var state: ThrowState = ThrowState.IDLE
var power: float = 0.0
var _power_dir: float = 1.0
var _aim_distance: float = 15.0

var _aim_arrow: AimArrow
var _predictor: FlightPredictor

const POWER_SPEED: float = 0.75
const DIST_SCROLL_STEP: float = 2.0
const DIST_STICK_SPEED: float = 15.0

func _ready() -> void:
	hud = HUD.new()
	add_child(hud)

	_aim_arrow = AimArrow.new()
	add_child(_aim_arrow)

	_predictor = FlightPredictor.new()
	add_child(_predictor)

func reset() -> void:
	state = ThrowState.IDLE
	power = 0.0
	_power_dir = 1.0
	_aim_arrow.visible = true
	_predictor.set_path_visible(true)
	hud.show_idle()

func _process(delta: float) -> void:
	if state == ThrowState.IDLE:
		# Left stick — rotate aim
		var stick_x: float = Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
		if abs(stick_x) > 0.15:
			throw_direction = throw_direction.rotated(Vector3.UP, -stick_x * 2.5 * delta).normalized()

		# Right stick Y — adjust target distance
		var stick_y: float = Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
		if abs(stick_y) > 0.15:
			_aim_distance = clamp(
				_aim_distance - stick_y * DIST_STICK_SPEED * delta,
				AimArrow.MIN_DIST, AimArrow.MAX_DIST
			)

	var showing: bool = state == ThrowState.IDLE or state == ThrowState.BACKSWING
	_aim_arrow.visible = showing
	_predictor.set_path_visible(showing)

	if showing:
		_aim_arrow.update_transform(throw_origin, throw_direction, _aim_distance)
		_predictor.update(throw_origin, throw_direction, _aim_distance)
		hud.set_power_target(_predictor.power_target)

	if state == ThrowState.BACKSWING:
		power += POWER_SPEED * _power_dir * delta
		if power >= 1.0:
			power = 1.0
			_power_dir = -1.0
		elif power <= 0.0:
			power = 0.0
			_power_dir = 1.0
		hud.update_power(power)

func _unhandled_input(event: InputEvent) -> void:
	var is_throw := false
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		is_throw = mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT
	elif event is InputEventJoypadButton:
		var jb := event as InputEventJoypadButton
		is_throw = jb.pressed and jb.button_index == JOY_BUTTON_A
	if not is_throw:
		return

	match state:
		ThrowState.IDLE:
			state = ThrowState.BACKSWING
			power = 0.0
			_power_dir = 1.0
		ThrowState.BACKSWING:
			_execute_throw()

func _execute_throw() -> void:
	state = ThrowState.THROWN
	hud.show_thrown()
	disc.throw_disc(throw_origin, throw_direction, power, 0.0)
	thrown.emit()

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and state == ThrowState.IDLE:
		var rot := -(event as InputEventMouseMotion).relative.x * 0.0032
		throw_direction = throw_direction.rotated(Vector3.UP, rot).normalized()

	if event is InputEventMouseButton and state == ThrowState.IDLE:
		var mb := event as InputEventMouseButton
		if mb.pressed:
			if mb.button_index == MOUSE_BUTTON_WHEEL_UP:
				_aim_distance = clamp(_aim_distance + DIST_SCROLL_STEP, AimArrow.MIN_DIST, AimArrow.MAX_DIST)
			elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
				_aim_distance = clamp(_aim_distance - DIST_SCROLL_STEP, AimArrow.MIN_DIST, AimArrow.MAX_DIST)
