import type { MuscleTarget, MuscleGroup } from '$lib/types/program';

interface ExerciseMapping {
	patterns: RegExp[];
	targets: MuscleTarget[];
}

// Common exercise patterns mapped to target muscles
const EXERCISE_MAPPINGS: ExerciseMapping[] = [
	// Chest exercises
	{
		patterns: [/bench\s*press/i, /chest\s*press/i, /push[\s-]*up/i, /pushup/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/incline.*press/i, /incline.*bench/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/decline.*press/i, /decline.*bench/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/chest\s*fl[yi]/i, /pec\s*fl[yi]/i, /dumbbell\s*fl[yi]/i, /cable\s*fl[yi]/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/dip/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'triceps', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},

	// Back exercises
	{
		patterns: [/pull[\s-]*up/i, /pullup/i, /chin[\s-]*up/i, /chinup/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'rhomboids', activation: 'secondary' }
		]
	},
	{
		patterns: [/lat\s*pull/i, /pulldown/i, /pull[\s-]*down/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'rhomboids', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/bent[\s-]*over.*row/i, /barbell\s*row/i, /pendlay/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/cable\s*row/i, /seated\s*row/i, /machine\s*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/dumbbell\s*row/i, /one[\s-]*arm.*row/i, /single[\s-]*arm.*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'secondary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/t[\s-]*bar\s*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'secondary' }
		]
	},
	{
		patterns: [/face\s*pull/i],
		targets: [
			{ muscle: 'shoulders_rear', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'secondary' },
			{ muscle: 'traps', activation: 'secondary' }
		]
	},
	{
		patterns: [/deadlift/i, /dead\s*lift/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'traps', activation: 'secondary' }
		]
	},
	{
		patterns: [/romanian/i, /rdl/i, /stiff[\s-]*leg/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'secondary' }
		]
	},
	{
		patterns: [/good\s*morning/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/back\s*extension/i, /hyper[\s-]*extension/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/shrug/i],
		targets: [{ muscle: 'traps', activation: 'primary' }]
	},

	// Shoulder exercises
	{
		patterns: [/shoulder\s*press/i, /overhead\s*press/i, /ohp/i, /military\s*press/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'traps', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/arnold/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'shoulders_rear', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/lateral\s*raise/i, /side\s*raise/i, /lat\s*raise/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'shoulders_rear', activation: 'secondary' }
		]
	},
	{
		patterns: [/front\s*raise/i],
		targets: [{ muscle: 'shoulders_front', activation: 'primary' }]
	},
	{
		patterns: [/rear\s*delt/i, /reverse\s*fl[yi]/i, /bent[\s-]*over.*raise/i],
		targets: [
			{ muscle: 'shoulders_rear', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'secondary' }
		]
	},
	{
		patterns: [/upright\s*row/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'traps', activation: 'primary' }
		]
	},

	// Arm exercises - Biceps
	{
		patterns: [/bicep.*curl/i, /barbell\s*curl/i, /dumbbell\s*curl/i, /ez[\s-]*bar\s*curl/i],
		targets: [
			{ muscle: 'biceps', activation: 'primary' },
			{ muscle: 'forearms', activation: 'secondary' }
		]
	},
	{
		patterns: [/hammer\s*curl/i],
		targets: [
			{ muscle: 'biceps', activation: 'primary' },
			{ muscle: 'forearms', activation: 'primary' }
		]
	},
	{
		patterns: [/preacher\s*curl/i, /concentration\s*curl/i, /spider\s*curl/i],
		targets: [{ muscle: 'biceps', activation: 'primary' }]
	},
	{
		patterns: [/cable\s*curl/i],
		targets: [
			{ muscle: 'biceps', activation: 'primary' },
			{ muscle: 'forearms', activation: 'stabilizer' }
		]
	},

	// Arm exercises - Triceps
	{
		patterns: [/tricep.*extension/i, /skull\s*crusher/i, /lying.*extension/i],
		targets: [{ muscle: 'triceps', activation: 'primary' }]
	},
	{
		patterns: [/tricep.*push[\s-]*down/i, /cable.*push[\s-]*down/i, /rope.*push[\s-]*down/i],
		targets: [{ muscle: 'triceps', activation: 'primary' }]
	},
	{
		patterns: [/close[\s-]*grip.*bench/i, /cgbp/i],
		targets: [
			{ muscle: 'triceps', activation: 'primary' },
			{ muscle: 'chest', activation: 'secondary' }
		]
	},
	{
		patterns: [/overhead.*tricep/i, /french\s*press/i],
		targets: [{ muscle: 'triceps', activation: 'primary' }]
	},
	{
		patterns: [/kick[\s-]*back/i, /tricep.*kick/i],
		targets: [{ muscle: 'triceps', activation: 'primary' }]
	},

	// Forearm exercises
	{
		patterns: [/wrist\s*curl/i, /forearm\s*curl/i],
		targets: [{ muscle: 'forearms', activation: 'primary' }]
	},
	{
		patterns: [/reverse.*curl/i],
		targets: [
			{ muscle: 'forearms', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/farmer.*walk/i, /farmer.*carry/i],
		targets: [
			{ muscle: 'forearms', activation: 'primary' },
			{ muscle: 'traps', activation: 'secondary' }
		]
	},

	// Leg exercises - Quads
	{
		patterns: [/squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/leg\s*press/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/leg\s*extension/i, /quad\s*extension/i],
		targets: [{ muscle: 'quads', activation: 'primary' }]
	},
	{
		patterns: [/lunge/i, /split\s*squat/i, /bulgarian/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/step[\s-]*up/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/hack\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/sissy\s*squat/i],
		targets: [{ muscle: 'quads', activation: 'primary' }]
	},
	{
		patterns: [/front\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},

	// Leg exercises - Hamstrings
	{
		patterns: [/leg\s*curl/i, /hamstring\s*curl/i, /lying.*curl/i, /seated.*curl/i],
		targets: [{ muscle: 'hamstrings', activation: 'primary' }]
	},
	{
		patterns: [/nordic/i, /ham.*raise/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},

	// Leg exercises - Glutes
	{
		patterns: [/hip\s*thrust/i, /glute\s*bridge/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/glute.*kick/i, /donkey\s*kick/i, /cable.*kick/i],
		targets: [{ muscle: 'glutes', activation: 'primary' }]
	},
	{
		patterns: [/abduct/i, /clam/i],
		targets: [{ muscle: 'glutes', activation: 'primary' }]
	},
	{
		patterns: [/adduct/i],
		targets: [{ muscle: 'inner_thighs', activation: 'primary' }]
	},

	// Leg exercises - Calves
	{
		patterns: [/calf\s*raise/i, /standing.*calf/i, /seated.*calf/i],
		targets: [{ muscle: 'calves', activation: 'primary' }]
	},
	{
		patterns: [/tibialis/i, /toe\s*raise/i],
		targets: [{ muscle: 'tibialis', activation: 'primary' }]
	},

	// Core exercises
	{
		patterns: [/crunch/i, /sit[\s-]*up/i, /situp/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'hip_flexors', activation: 'secondary' }
		]
	},
	{
		patterns: [/plank/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'obliques', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/leg\s*raise/i, /hanging.*raise/i, /knee\s*raise/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'hip_flexors', activation: 'primary' }
		]
	},
	{
		patterns: [/russian\s*twist/i, /oblique.*twist/i],
		targets: [
			{ muscle: 'obliques', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' }
		]
	},
	{
		patterns: [/side\s*bend/i, /oblique.*crunch/i],
		targets: [{ muscle: 'obliques', activation: 'primary' }]
	},
	{
		patterns: [/bicycle/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'obliques', activation: 'primary' }
		]
	},
	{
		patterns: [/mountain\s*climber/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'hip_flexors', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/ab\s*wheel/i, /ab\s*roller/i, /rollout/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'lats', activation: 'secondary' }
		]
	},
	{
		patterns: [/hollow/i, /dead\s*bug/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'hip_flexors', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/bird[\s-]*dog/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/superman/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},

	// Hip flexor exercises
	{
		patterns: [/hip\s*flexor/i, /psoas/i],
		targets: [{ muscle: 'hip_flexors', activation: 'primary' }]
	},

	// Compound/full body
	{
		patterns: [/burpee/i],
		targets: [
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'quads', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/clean/i, /snatch/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'traps', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/thruster/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/kettlebell\s*swing/i, /kb\s*swing/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/turkish\s*get[\s-]*up/i, /tgu/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},

	// Cardio with muscle engagement
	{
		patterns: [/rowing/i, /row.*machine/i, /erg/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'quads', activation: 'secondary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/cycling/i, /bike/i, /spin/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'calves', activation: 'secondary' }
		]
	},
	{
		patterns: [/stair/i, /step.*mill/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'calves', activation: 'secondary' }
		]
	},
	{
		patterns: [/running/i, /jogging/i, /sprint/i, /treadmill/i],
		targets: [
			{ muscle: 'quads', activation: 'secondary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'calves', activation: 'secondary' },
			{ muscle: 'hip_flexors', activation: 'secondary' }
		]
	},
	{
		patterns: [/jump.*rope/i, /skipping/i],
		targets: [
			{ muscle: 'calves', activation: 'primary' },
			{ muscle: 'quads', activation: 'secondary' }
		]
	},
	{
		patterns: [/box\s*jump/i, /jump.*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'calves', activation: 'secondary' }
		]
	},

	// Stretching/mobility with muscle targeting
	{
		patterns: [/cat[\s-]*cow/i],
		targets: [
			{ muscle: 'lower_back', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/child.*pose/i],
		targets: [
			{ muscle: 'lats', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'secondary' }
		]
	},
	{
		patterns: [/pigeon/i],
		targets: [
			{ muscle: 'glutes', activation: 'secondary' },
			{ muscle: 'hip_flexors', activation: 'secondary' }
		]
	},
	{
		patterns: [/cobra/i, /upward.*dog/i],
		targets: [
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'hip_flexors', activation: 'secondary' }
		]
	},
	{
		patterns: [/downward.*dog/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'calves', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/world.*greatest.*stretch/i, /wgs/i],
		targets: [
			{ muscle: 'hip_flexors', activation: 'secondary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'quads', activation: 'secondary' }
		]
	}
];

/**
 * Infer target muscles for an exercise based on its name
 */
export function inferTargetMuscles(exerciseName: string): MuscleTarget[] | undefined {
	const normalizedName = exerciseName.toLowerCase().trim();

	for (const mapping of EXERCISE_MAPPINGS) {
		for (const pattern of mapping.patterns) {
			if (pattern.test(normalizedName)) {
				return mapping.targets;
			}
		}
	}

	return undefined;
}

/**
 * Get inferred target muscles, falling back to exercise's existing targetMuscles if available
 */
export function getTargetMuscles(
	exerciseName: string,
	existingTargets?: MuscleTarget[]
): MuscleTarget[] | undefined {
	if (existingTargets && existingTargets.length > 0) {
		return existingTargets;
	}
	return inferTargetMuscles(exerciseName);
}
