class_name Hole
extends Node3D

# World-space Y of the basket opening
const RIM_Y: float = 1.05
# Horizontal catch radius (inside the ring)
const CATCH_RADIUS: float = 0.28
# Vertical window around the rim that counts as "in"
const CATCH_HEIGHT: float = 0.60

signal disc_holed

func _ready() -> void:
	_build_visual()

func _build_visual() -> void:
	# --- Pole ---
	var pole := MeshInstance3D.new()
	var pcyl := CylinderMesh.new()
	pcyl.top_radius = 0.025
	pcyl.bottom_radius = 0.025
	pcyl.height = 1.7
	pole.mesh = pcyl
	pole.position.y = 0.85
	var pole_mat := StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.82, 0.82, 0.82)
	pole.material_override = pole_mat
	add_child(pole)

	# --- Rim ring ---
	var rim := MeshInstance3D.new()
	var rcyl := CylinderMesh.new()
	rcyl.top_radius = 0.30
	rcyl.bottom_radius = 0.30
	rcyl.height = 0.025
	rcyl.rings = 1
	rim.mesh = rcyl
	rim.position.y = RIM_Y
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(1.0, 0.55, 0.0)
	rim.material_override = rim_mat
	add_child(rim)

	# --- Chains (three thin vertical cylinders around the pole) ---
	var chain_mat := StandardMaterial3D.new()
	chain_mat.albedo_color = Color(0.65, 0.65, 0.65, 0.75)
	chain_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for i in range(6):
		var angle := i * PI / 3.0
		var cx := sin(angle) * 0.18
		var cz := cos(angle) * 0.18
		var chain := MeshInstance3D.new()
		var ccyl := CylinderMesh.new()
		ccyl.top_radius = 0.008
		ccyl.bottom_radius = 0.008
		ccyl.height = 0.55
		chain.mesh = ccyl
		chain.position = Vector3(cx, 0.77, cz)
		chain.material_override = chain_mat
		add_child(chain)

	# --- Basket cage (catches the disc below the rim) ---
	var cage := MeshInstance3D.new()
	var cage_cyl := CylinderMesh.new()
	cage_cyl.top_radius = 0.28
	cage_cyl.bottom_radius = 0.22
	cage_cyl.height = 0.30
	cage_cyl.rings = 1
	cage.mesh = cage_cyl
	cage.position.y = 0.55
	var cage_mat := StandardMaterial3D.new()
	cage_mat.albedo_color = Color(0.55, 0.55, 0.55, 0.55)
	cage_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cage.material_override = cage_mat
	add_child(cage)

# Call this every frame while the disc is airborne.
# Returns true if the disc entered the basket this frame.
func check(disc: DiscFlight) -> bool:
	if disc.state == DiscFlight.State.LANDED:
		return false
	var rim_world := global_position + Vector3(0.0, RIM_Y, 0.0)
	var d := disc.global_position
	var horiz: float = Vector2(d.x - rim_world.x, d.z - rim_world.z).length()
	var vert: float = abs(d.y - rim_world.y)
	if horiz < CATCH_RADIUS and vert < CATCH_HEIGHT:
		disc_holed.emit()
		return true
	return false
