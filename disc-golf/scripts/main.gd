extends Node3D

# Basket ~20m out, slightly right — reachable at ~50% power
const BASKET_POS := Vector3(8.0, 0.0, -18.0)
const TEE_POS    := Vector3(0.0, 0.0, 0.0)

var _disc: DiscFlight
var _camera: CameraController
var _throw_ctrl: ThrowController
var _hole: Hole

var _player_pos: Vector3 = TEE_POS
var _throw_dir: Vector3 = Vector3(0.0, 0.0, -1.0)
var _strokes: int = 0
var _holed: bool = false

func _ready() -> void:
	_build_environment()
	_build_ground()
	_build_hole()
	_build_trees()
	_spawn_disc()
	_setup_camera()
	_setup_throw_controller()

# ── Environment ────────────────────────────────────────────────────────────────

func _build_environment() -> void:
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48.0, -35.0, 0.0)
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	add_child(sun)

	var env_node := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.18, 0.48, 0.88)
	sky_mat.sky_horizon_color = Color(0.68, 0.84, 1.0)
	sky_mat.ground_bottom_color = Color(0.12, 0.18, 0.10)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env_node.environment = env
	add_child(env_node)

func _build_ground() -> void:
	var body := StaticBody3D.new()

	var mesh_inst := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(300.0, 300.0)
	mesh_inst.mesh = plane

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.22, 0.52, 0.16)
	mat.roughness = 0.9
	mesh_inst.material_override = mat

	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(300.0, 0.2, 300.0)
	col.shape = box
	col.position.y = -0.1

	body.add_child(mesh_inst)
	body.add_child(col)
	add_child(body)

func _build_hole() -> void:
	_hole = Hole.new()
	_hole.position = BASKET_POS
	add_child(_hole)
	_hole.disc_holed.connect(_on_disc_holed)

func _build_trees() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345

	var avoid_radius := 8.0
	var basket_xz := Vector2(BASKET_POS.x, BASKET_POS.z)
	var tee_xz    := Vector2(TEE_POS.x, TEE_POS.z)

	for i in range(30):
		var tx := rng.randf_range(-80.0, 80.0)
		var tz := rng.randf_range(-80.0, 80.0)
		var p2 := Vector2(tx, tz)
		if p2.distance_to(tee_xz) < avoid_radius or p2.distance_to(basket_xz) < avoid_radius:
			continue

		var height := rng.randf_range(4.0, 9.0)
		var tree := MeshInstance3D.new()
		var cap := CapsuleMesh.new()
		cap.radius = rng.randf_range(1.0, 2.0)
		cap.height = height
		tree.mesh = cap
		tree.position = Vector3(tx, height * 0.5, tz)

		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(
			rng.randf_range(0.06, 0.14),
			rng.randf_range(0.32, 0.48),
			rng.randf_range(0.06, 0.14)
		)
		tree.material_override = mat
		add_child(tree)

# ── Game entities ───────────────────────────────────────────────────────────────

func _spawn_disc() -> void:
	_disc = DiscFlight.new()
	_disc.global_position = _player_pos + Vector3(0.0, 1.0, 0.0)
	add_child(_disc)
	_disc.landed.connect(_on_disc_landed)

func _setup_camera() -> void:
	_camera = CameraController.new()
	_camera.target = _disc
	_camera.throw_direction = _throw_dir
	_camera.global_position = _disc.global_position + Vector3(0.0, 2.8, 6.5)
	_camera.current = true
	add_child(_camera)

func _setup_throw_controller() -> void:
	_throw_ctrl = ThrowController.new()
	_throw_ctrl.disc = _disc
	_throw_ctrl.throw_origin = _disc.global_position
	_throw_ctrl.throw_direction = _throw_dir
	_throw_ctrl.thrown.connect(_on_throw_started)
	add_child(_throw_ctrl)

func _process(_delta: float) -> void:
	if _camera:
		_camera.throw_direction = _throw_ctrl.throw_direction

	# Check basket every frame while disc is airborne
	if not _holed and _disc and _disc.state != DiscFlight.State.IDLE:
		if _disc.state != DiscFlight.State.LANDED:
			if _hole.check(_disc):
				# snap disc visually into the basket
				_disc.stop_in_basket(_hole.global_position + Vector3(0.0, 0.7, 0.0))

# ── Event handlers ──────────────────────────────────────────────────────────────

func _on_throw_started() -> void:
	_strokes += 1
	_throw_ctrl.hud.set_strokes(_strokes)

func _on_disc_holed() -> void:
	_holed = true
	_throw_ctrl.hud.show_holed(_strokes)
	await get_tree().create_timer(3.0).timeout
	_reset_to_tee()

func _on_disc_landed(pos: Vector3) -> void:
	if _holed:
		return
	await get_tree().create_timer(2.0).timeout
	_reset_lie(pos)

func _reset_lie(new_pos: Vector3) -> void:
	_player_pos = new_pos
	_throw_dir = _throw_ctrl.throw_direction
	_disc.queue_free()
	_spawn_disc()
	_camera.target = _disc
	_throw_ctrl.disc = _disc
	_throw_ctrl.throw_origin = _disc.global_position
	_throw_ctrl.reset()

func _reset_to_tee() -> void:
	_holed = false
	_strokes = 0
	_player_pos = TEE_POS
	_throw_dir = Vector3(0.0, 0.0, -1.0)
	_disc.queue_free()
	_spawn_disc()
	_camera.target = _disc
	_throw_ctrl.disc = _disc
	_throw_ctrl.throw_origin = _disc.global_position
	_throw_ctrl.throw_direction = _throw_dir
	_throw_ctrl.reset()
	_throw_ctrl.hud.set_strokes(0)
