class_name ThrowMath

## Maximum meaningful deviation angle (±180°). Deviations beyond this are clamped.
const MAX_DEVIATION: float = PI

## Returns +1 (clockwise spin from above) or -1 (counterclockwise).
##
## Clockwise:       RHBH — right hand pulls disc across body left-to-right
##                  LHFH — left hand forehand swings left-to-right
## Counterclockwise: RHFH — right hand forehand swings right-to-left
##                   LHBH — left hand pulls disc across body right-to-left
static func spin_direction_for_type(throw_type: ThrowInput.Type) -> int:
	match throw_type:
		ThrowInput.Type.RHBH, ThrowInput.Type.LHFH:
			return 1
		_:
			return -1

## Signed deviation of follow-through from pull-back, normalised to -PI..PI.
## Positive = clockwise deviation (follow-through swings right of pull-back line)
## when viewed from above.
static func deviation(input: ThrowInput) -> float:
	var d: float = input.follow_through_angle - input.pull_back_angle
	# Normalise to -PI..PI
	while d > PI:
		d -= TAU
	while d < -PI:
		d += TAU
	return d

## curve_intensity in [-1, +1]:
##   +1 = full anhyzer in the disc's spin direction  (amplifies natural turn)
##   -1 = full hyzer against the disc's spin direction (amplifies natural fade)
##    0 = flat release (natural turn/fade only)
##
## Formula: curve_intensity = spin_direction × deviation / MAX_DEVIATION
##   This means: for RHBH (spin=+1), rightward deviation → positive (anhyzer)
##               for RHFH (spin=-1), rightward deviation → negative (hyzer)
##   Either way, world-space lateral result from rightward deviation = curves RIGHT.
static func curve_intensity(input: ThrowInput) -> float:
	var spin: float = float(spin_direction_for_type(input.throw_type))
	var dev: float = deviation(input)
	return clamp(spin * dev / MAX_DEVIATION, -1.0, 1.0)

## Main entry — returns a dict with "spin_direction" (int) and "curve_intensity" (float).
static func compute_spin_and_curve(input: ThrowInput) -> Dictionary:
	return {
		"spin_direction": spin_direction_for_type(input.throw_type),
		"curve_intensity": curve_intensity(input),
	}
