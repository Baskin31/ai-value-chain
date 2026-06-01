class_name ThrowInput
extends Resource

enum Type { RHBH, RHFH, LHBH, LHFH }

## Angle of the pull-back stroke (radians from throw direction, in horizontal plane)
@export var pull_back_angle: float = 0.0
## Angle of the follow-through stroke (radians from throw direction, in horizontal plane)
@export var follow_through_angle: float = 0.0
## Throw power 0..1
@export var power: float = 1.0
## Which hand and throw style
@export var throw_type: Type = Type.RHBH
