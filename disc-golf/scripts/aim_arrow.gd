class_name AimArrow
extends Node3D

const MIN_DIST: float = 5.0
const MAX_DIST: float = 50.0

var _mesh_inst: MeshInstance3D

func _ready() -> void:
	_mesh_inst = MeshInstance3D.new()
	_mesh_inst.mesh = _build_mesh()

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.88, 0.0, 0.88)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mesh_inst.material_override = mat
	add_child(_mesh_inst)

func _build_mesh() -> ArrayMesh:
	var verts := PackedVector3Array()
	var y := 0.04

	# Arrowhead — tip points toward +Z (forward in local space)
	# Front face
	verts.append(Vector3( 0.00, y,  0.55))   # tip
	verts.append(Vector3(-0.28, y,  0.10))   # left
	verts.append(Vector3( 0.28, y,  0.10))   # right
	# Back face (so it's visible from below ground level too)
	verts.append(Vector3( 0.00, y,  0.55))
	verts.append(Vector3( 0.28, y,  0.10))
	verts.append(Vector3(-0.28, y,  0.10))

	# Shaft — from z=0.10 back to z=-0.65, width 0.10
	verts.append(Vector3(-0.10, y,  0.10))
	verts.append(Vector3( 0.10, y,  0.10))
	verts.append(Vector3( 0.10, y, -0.65))

	verts.append(Vector3(-0.10, y,  0.10))
	verts.append(Vector3( 0.10, y, -0.65))
	verts.append(Vector3(-0.10, y, -0.65))

	# Shaft back face
	verts.append(Vector3(-0.10, y,  0.10))
	verts.append(Vector3( 0.10, y, -0.65))
	verts.append(Vector3( 0.10, y,  0.10))

	verts.append(Vector3(-0.10, y,  0.10))
	verts.append(Vector3(-0.10, y, -0.65))
	verts.append(Vector3( 0.10, y, -0.65))

	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts

	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh

# Call every frame while aiming. Player_pos is the tee/lie position.
func update_transform(player_pos: Vector3, direction: Vector3, distance: float) -> void:
	var flat_dir := Vector3(direction.x, 0.0, direction.z).normalized()
	global_position = Vector3(
		player_pos.x + flat_dir.x * distance,
		0.02,
		player_pos.z + flat_dir.z * distance
	)
	if flat_dir.length_squared() > 0.01:
		# atan2(x, z) orients +Z toward the throw direction
		rotation.y = atan2(flat_dir.x, flat_dir.z)

