class_name HUD
extends CanvasLayer

enum ThrowState { IDLE, BACKSWING, THROWN }

var _power_bg: ColorRect
var _power_fill: ColorRect
var _power_target_line: ColorRect
var _hint_label: Label
var _stroke_label: Label
var _throw_type_label: Label
var _celebration_label: Label

const BAR_W: float = 220.0
const BAR_H: float = 18.0
const BAR_X: float = 530.0
const POWER_Y: float = 640.0

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	# Power bar — always visible so target line is readable before swinging
	_power_bg = _make_rect(BAR_X, POWER_Y, BAR_W, BAR_H, Color(0.15, 0.15, 0.15, 0.85))
	_power_fill = _make_rect(BAR_X, POWER_Y, 0.0, BAR_H, Color(0.95, 0.2, 0.1, 0.9))
	# Target indicator: white vertical line drawn on top of fill
	_power_target_line = _make_rect(BAR_X, POWER_Y, 3.0, BAR_H, Color(1.0, 1.0, 1.0, 0.95))

	# Hint text
	_hint_label = _make_label(BAR_X, POWER_Y + 24.0, BAR_W, "Click to throw", 14, HORIZONTAL_ALIGNMENT_CENTER)

	# Stroke counter — top left
	_stroke_label = _make_label(20.0, 20.0, 200.0, "Throw: 0", 18, HORIZONTAL_ALIGNMENT_LEFT)
	# Throw type — top left, below stroke counter
	_throw_type_label = _make_label(20.0, 46.0, 200.0, "RHBH", 14, HORIZONTAL_ALIGNMENT_LEFT)
	_throw_type_label.add_theme_color_override("font_color", Color(1.0, 0.88, 0.0, 0.85))

	# Celebration — center screen, hidden until holed
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
	# Power bar stays visible in IDLE and BACKSWING so the target line is always readable
	_power_bg.visible = s != ThrowState.THROWN
	_power_fill.visible = s != ThrowState.THROWN
	_power_target_line.visible = s != ThrowState.THROWN

	match s:
		ThrowState.IDLE:
			_hint_label.text = "Scroll / right-stick: adjust distance   |   Click to throw"
			_power_fill.size.x = 0.0
		ThrowState.BACKSWING:
			_hint_label.text = "Click — set power"
		ThrowState.THROWN:
			_hint_label.text = ""

func update_power(power: float) -> void:
	_power_fill.size.x = BAR_W * power
	_power_fill.color = Color(0.95, power * 0.75, 0.05, 0.9)

# Called every frame during IDLE and BACKSWING to keep the target line current
func set_power_target(ratio: float) -> void:
	_power_target_line.position.x = BAR_X + ratio * BAR_W - 1.5

func show_idle() -> void:
	_celebration_label.visible = false
	_set_state(ThrowState.IDLE)

func show_thrown() -> void:
	_set_state(ThrowState.THROWN)

func set_strokes(n: int) -> void:
	_stroke_label.text = "Throw: %d" % n

func set_throw_type(type_name: String) -> void:
	_throw_type_label.text = type_name + "  [T]"

func show_holed(strokes: int) -> void:
	_set_state(ThrowState.THROWN)
	var msg := "IN THE BASKET!"
	if strokes == 1:
		msg = "HOLE IN ONE!"
	_celebration_label.text = msg + "\n%d throw%s" % [strokes, "s" if strokes != 1 else ""]
	_celebration_label.visible = true
