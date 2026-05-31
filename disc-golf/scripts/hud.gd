class_name HUD
extends CanvasLayer

enum ThrowState { IDLE, BACKSWING, ACCURACY, THROWN }

var _power_bg: ColorRect
var _power_fill: ColorRect
var _accuracy_bg: ColorRect
var _accuracy_cursor: ColorRect
var _hint_label: Label

const BAR_W: float = 220.0
const BAR_H: float = 18.0
const BAR_X: float = 530.0   # centered at 1280/2 - 110
const POWER_Y: float = 640.0
const ACC_Y: float = 618.0

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	# Power bar background
	_power_bg = _make_rect(BAR_X, POWER_Y, BAR_W, BAR_H, Color(0.15, 0.15, 0.15, 0.85))
	# Power bar fill (red→yellow gradient via color update)
	_power_fill = _make_rect(BAR_X, POWER_Y, 0.0, BAR_H, Color(0.95, 0.2, 0.1, 0.9))

	# Accuracy bar background
	_accuracy_bg = _make_rect(BAR_X, ACC_Y, BAR_W, BAR_H, Color(0.15, 0.15, 0.15, 0.85))
	# Center line
	var center_line := _make_rect(BAR_X + BAR_W * 0.5 - 1.0, ACC_Y, 2.0, BAR_H, Color(1, 1, 1, 0.4))
	center_line.visible = false   # made visible when accuracy phase starts
	_accuracy_bg.add_child(center_line)  # parented for hide/show together
	# Accuracy cursor
	_accuracy_cursor = _make_rect(BAR_X + BAR_W * 0.5 - 6.0, ACC_Y, 12.0, BAR_H, Color(1.0, 0.95, 0.0, 0.95))

	# Hint text
	_hint_label = Label.new()
	_hint_label.position = Vector2(BAR_X, POWER_Y + 24.0)
	_hint_label.size = Vector2(BAR_W, 24.0)
	_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.85))
	add_child(_hint_label)

	_set_state(ThrowState.IDLE)

func _make_rect(x: float, y: float, w: float, h: float, col: Color) -> ColorRect:
	var r := ColorRect.new()
	r.position = Vector2(x, y)
	r.size = Vector2(w, h)
	r.color = col
	add_child(r)
	return r

func _set_state(s: ThrowState) -> void:
	_power_bg.visible = s == ThrowState.BACKSWING
	_power_fill.visible = s == ThrowState.BACKSWING
	_accuracy_bg.visible = s == ThrowState.ACCURACY
	_accuracy_cursor.visible = s == ThrowState.ACCURACY

	match s:
		ThrowState.IDLE:
			_hint_label.text = "Click to throw"
		ThrowState.BACKSWING:
			_hint_label.text = "Click — set power"
		ThrowState.ACCURACY:
			_hint_label.text = "Click — aim"
		ThrowState.THROWN:
			_hint_label.text = ""

func update_power(power: float) -> void:
	_set_state(ThrowState.BACKSWING)
	var fill_w := BAR_W * power
	_power_fill.size.x = fill_w
	# Color shifts red → orange → yellow as power increases
	_power_fill.color = Color(0.95, power * 0.75, 0.05, 0.9)

func update_accuracy(accuracy: float) -> void:
	_set_state(ThrowState.ACCURACY)
	# accuracy is -1..1 ; cursor x maps across bar
	var cursor_x := BAR_X + (accuracy + 1.0) * 0.5 * BAR_W - 6.0
	_accuracy_cursor.position.x = cursor_x

func show_idle() -> void:
	_set_state(ThrowState.IDLE)

func show_thrown() -> void:
	_set_state(ThrowState.THROWN)
