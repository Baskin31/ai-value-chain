class_name ThrowController
extends Node

enum ThrowState { IDLE, BACKSWING, ACCURACY, THROWN }

var disc: DiscFlight
var hud: HUD
var throw_origin: Vector3 = Vector3.ZERO
var throw_direction: Vector3 = Vector3(0.0, 0.0, -1.0)

var state: ThrowState = ThrowState.IDLE
var power: float = 0.0
var accuracy: float = 0.0
var _power_dir: float = 1.0
var _acc_dir: float = 1.0
var _acc_speed: float = 1.8

const POWER_SPEED: float = 0.75   # fills full bar in ~1.33s

func _ready() -> void:
	hud = HUD.new()
	add_child(hud)

func reset() -> void:
	state = ThrowState.IDLE
	power = 0.0
	accuracy = 0.0
	_power_dir = 1.0
	_acc_dir = 1.0
	hud.show_idle()

func _process(delta: float) -> void:
	match state:
		ThrowState.BACKSWING:
			power += POWER_SPEED * _power_dir * delta
			if power >= 1.0:
				power = 1.0
				_power_dir = -1.0
			elif power <= 0.0:
				power = 0.0
				_power_dir = 1.0
			hud.update_power(power)

		ThrowState.ACCURACY:
			accuracy += _acc_speed * _acc_dir * delta
			if accuracy >= 1.0:
				accuracy = 1.0
				_acc_dir = -1.0
			elif accuracy <= -1.0:
				accuracy = -1.0
				_acc_dir = 1.0
			hud.update_accuracy(accuracy)

func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return
	if not (event as InputEventMouseButton).pressed:
		return
	if (event as InputEventMouseButton).button_index != MOUSE_BUTTON_LEFT:
		return

	match state:
		ThrowState.IDLE:
			state = ThrowState.BACKSWING
			power = 0.0
			_power_dir = 1.0

		ThrowState.BACKSWING:
			state = ThrowState.ACCURACY
			accuracy = 0.0
			_acc_dir = 1.0
			# More power = cursor oscillates faster = tighter window
			_acc_speed = 1.6 + power * 2.2

		ThrowState.ACCURACY:
			_execute_throw()

func _execute_throw() -> void:
	state = ThrowState.THROWN
	hud.show_thrown()
	disc.throw_disc(throw_origin, throw_direction, power, accuracy)

# Mouse horizontal movement rotates aim when idle
func _input(event: InputEvent) -> void:
	if state != ThrowState.IDLE:
		return
	if event is InputEventMouseMotion:
		var rot := -(event as InputEventMouseMotion).relative.x * 0.0032
		throw_direction = throw_direction.rotated(Vector3.UP, rot).normalized()
