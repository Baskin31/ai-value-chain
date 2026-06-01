class_name ThrowTest

## Scenario: pull_back = 0°, follow_through = +45° (rightward deviation)
## All four throw types should produce a world-right curve, via different mechanisms.
const DEVIATION_DEG: float = 45.0

static func run() -> void:
	print("=" .repeat(64))
	print("ThrowTest — pull_back=0°, follow_through=+45° (right deviation)")
	print("=" .repeat(64))

	var types := [
		ThrowInput.Type.RHBH,
		ThrowInput.Type.RHFH,
		ThrowInput.Type.LHBH,
		ThrowInput.Type.LHFH,
	]
	var type_names := ["RHBH", "RHFH", "LHBH", "LHFH"]

	# Expected: [disc_label, world_curve_dir, physical_label, flight_note]
	var expected := [
		["RHBH", "RIGHT", "anhyzer", "turns right (high-speed, CW spin)"],
		["RHFH", "RIGHT", "hyzer",   "fades right (low-speed, CCW spin)"],
		["LHBH", "RIGHT", "hyzer",   "fades right (low-speed, CCW spin)"],
		["LHFH", "RIGHT", "anhyzer", "turns right (high-speed, CW spin)"],
	]

	var all_pass := true
	for i in range(4):
		var input := ThrowInput.new()
		input.throw_type        = types[i]
		input.pull_back_angle   = 0.0
		input.follow_through_angle = deg_to_rad(DEVIATION_DEG)
		input.power             = 0.75

		var result := ThrowMath.compute_spin_and_curve(input)
		var spin: int    = result["spin_direction"]
		var curve: float = result["curve_intensity"]

		# World-space lateral is the product; positive = curves right
		var world_right: float = float(spin) * curve
		var world_dir := "RIGHT" if world_right > 0.001 else \
						 ("LEFT"  if world_right < -0.001 else "STRAIGHT")
		var phys_label := "anhyzer" if curve > 0.001 else \
						  ("hyzer"  if curve < -0.001 else "flat")

		var exp: Array     = expected[i]
		var exp_dir: String  = exp[1]
		var exp_phys: String = exp[2]
		var pass_dir:  bool  = world_dir  == exp_dir
		var pass_phys: bool  = phys_label == exp_phys
		var ok: bool         = pass_dir and pass_phys

		print("[%s] spin=%+d | curve=%+.3f (%s) | world=%s | expected %s(%s) | %s" % [
			type_names[i], spin, curve, phys_label,
			world_dir, exp_dir, exp_phys,
			"PASS" if ok else "FAIL <- expected dir=%s phys=%s" % [exp_dir, exp_phys]
		])
		if not ok:
			all_pass = false

	print("-" .repeat(64))
	print("Straight throw (deviation = 0°) — baseline spin directions:")
	for i in range(4):
		var spin: int = ThrowMath.spin_direction_for_type(types[i])
		var spin_label := "CW  → turn-R fade-L" if spin > 0 else "CCW → turn-L fade-R"
		print("[%s] spin=%+d (%s)" % [type_names[i], spin, spin_label])

	print("=" .repeat(64))
	print("ThrowTest result: %s" % ("ALL PASS" if all_pass else "FAILURES DETECTED"))
	print("=" .repeat(64))
