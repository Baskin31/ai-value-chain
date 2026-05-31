class_name HUD
extends CanvasLayer

enum ThrowState { IDLE, BACKSWING, ACCURACY, THROWN }

var _power_bg: ColorRect
var _power_fill: ColorRect
var _accuracy_bg: ColorRect
var _accuracy_cursor: ColorRect
var _hint_label: Label
var _stroke_label: Label
var _celebration_label: Label

const BAR_W: float = 220.0
const BAR_H: float = 18.0
const BAR_X: float = 530.0
const POWER_Y: float = 640.0
const ACC_Y: float = 618.0

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	# Power bar background
	_power_bg = _make_rect(BAR_X, POWER_Y, BAR_W, BAR_H, Color(0.15, 0.15, 0.15, 0.85))
	_power_fill = _make_rect(BAR_X, POWER_Y, 0.0, BAR_H, Color(0.95, 0.2, 0.1, 0.9))

	# Accuracy bar
	_accuracy_bg = _make_rect(BAR_X, ACC_Y, BAR_W, BAR_H, Color(0.15, 0.15, 0.15, 0.85))
	var center_line := _make_rect(BAR_X + BAR_W * 0.5 - 1.0, ACC_Y, 2.0, BAR_H, Color(1, 1, 1, 0.4))
	center_line.visible = false
	_accuracy_bg.add_child(center_line)
	_accuracy_cursor = _make_rect(BAR_X + BAR_W * 0.5 - 6.0, ACC_Y, 12.0, BAR_H, Color(1.0, 0.95, 0.0, 0.95))

	# Throw hint (below bars)
	_hint_label = _make_label(BAR_X, POWER_Y + 24.0, BAR_W, "Click to throw", 14, HORIZONTAL_ALIGNMENT_CENTER)

	# Stroke counter (top-left)
	_stroke_label = _make_label(20.0, 20.0, 200.0, "Throw: 0", 18, HORIZONTAL_ALIGNMENT_LEFT)

	# Celebration (center screen, hidden by default)
	_celebration_label = _make_label(240.0, 260.0, 800.0, "", 42, HORIZONTAL_ALIGNMENT_CENTER)
	_celebration_label.add_theme_color_override("font_color", Color(1.0, 0.9, 0.1))
	_celebration_label.visible = false

	_set_state(ThrowState.IDLE)

func _make_rect(x: float, y: float, w: float, h: float, col: Color) -> ColorRect:
	var r := ColorRect.new()
	r.position = Vector2(x, y)
	r.size = Vector2(w, h)
	r.color = col
	add_child(r)
	return r

func _make_label(x: float, y: float, w: float, text: String, size: int, align: HorizontalAlignment) -> Label:
	var l := Label.new()
	l.position = Vector2(x, y)
	l.size = Vector2(w, 60.0)
	l.text = text
	l.horizontal_alignment = align
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color(1, 1, 1, 0.9))
	add_child(l)
	return l

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
	_power_fill.size.x = BAR_W * power
	_power_fill.color = Color(0.95, power * 0.75, 0.05, 0.9)

func update_accuracy(accuracy: float) -> void:
	_set_state(ThrowState.ACCURACY)
	_accuracy_cursor.position.x = BAR_X + (accuracy + 1.0) * 0.5 * BAR_W - 6.0

func show_idle() -> void:
	_celebration_label.visible = false
	_set_state(ThrowState.IDLE)

func show_thrown() -> void:
	_set_state(ThrowState.THROWN)

func set_strokes(n: int) -> void:
	_stroke_label.text = "Throw: %d" % n

func show_holed(strokes: int) -> void:
	_set_state(ThrowState.THROWN)
	var msg := "IN THE BASKET!"
	if strokes == 1:
		msg = "HOLE IN ONE!"
	_celebration_label.text = msg + "\n%d throw%s" % [strokes, "s" if strokes != 1 else ""]
	_celebration_label.visible = true
