extends Node3D

var _disc: DiscFlight
var _camera: CameraController
var _throw_ctrl: ThrowController
var _player_pos: Vector3 = Vector3(0.0, 0.0, 0.0)
var _throw_dir: Vector3 = Vector3(0.0, 0.0, -1.0)

func _ready() -> void:
	_build_environment()
	_build_ground()
	_build_basket(Vector3(55.0, 0.0, -40.0))
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

func _build_basket(pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)

	# Pole
	var pole := MeshInstance3D.new()
	var pcyl := CylinderMesh.new()
	pcyl.top_radius = 0.025
	pcyl.bottom_radius = 0.025
	pcyl.height = 1.6
	pole.mesh = pcyl
	pole.position.y = 0.8
	var pole_mat := StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.78, 0.78, 0.78)
	pole.material_override = pole_mat
	root.add_child(pole)

	# Basket ring
	var ring := MeshInstance3D.new()
	var rcyl := CylinderMesh.new()
	rcyl.top_radius = 0.30
	rcyl.bottom_radius = 0.30
	rcyl.height = 0.022
	rcyl.rings = 1
	ring.mesh = rcyl
	ring.position.y = 1.05
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = Color(1.0, 0.55, 0.0)
	ring.material_override = ring_mat
	root.add_child(ring)

	# Chains suggestion: a slightly smaller darker ring below
	var chain_ring := MeshInstance3D.new()
	var ccyl := CylinderMesh.new()
	ccyl.top_radius = 0.20
	ccyl.bottom_radius = 0.20
	ccyl.height = 0.35
	ccyl.rings = 1
	chain_ring.mesh = ccyl
	chain_ring.position.y = 0.82
	var chain_mat := StandardMaterial3D.new()
	chain_mat.albedo_color = Color(0.6, 0.6, 0.6, 0.6)
	chain_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	chain_ring.material_override = chain_mat
	root.add_child(chain_ring)

func _build_trees() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345

	var avoid_radius := 15.0  # keep clear around tee and basket
	var basket_xz := Vector2(55.0, -40.0)
	var tee_xz := Vector2(0.0, 0.0)

	for i in range(30):
		var tx := rng.randf_range(-120.0, 120.0)
		var tz := rng.randf_range(-120.0, 120.0)
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
	add_child(_throw_ctrl)

	# Keep camera throw_direction in sync with controller's aim
	# We do this by sharing the same vector reference via _process polling
	set_process(true)

func _process(_delta: float) -> void:
	if _camera:
		_camera.throw_direction = _throw_ctrl.throw_direction

func _on_disc_landed(pos: Vector3) -> void:
	await get_tree().create_timer(2.2).timeout
	_reset(pos)

func _reset(new_pos: Vector3) -> void:
	_player_pos = new_pos
	_throw_dir = _throw_ctrl.throw_direction

	_disc.queue_free()
	_spawn_disc()

	_camera.target = _disc
	_throw_ctrl.disc = _disc
	_throw_ctrl.throw_origin = _disc.global_position
	_throw_ctrl.reset()
