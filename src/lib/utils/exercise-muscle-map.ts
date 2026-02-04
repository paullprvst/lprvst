import type { MuscleTarget, MuscleGroup } from '$lib/types/program';

interface ExerciseMapping {
	patterns: RegExp[];
	targets: MuscleTarget[];
}

// Common exercise patterns mapped to target muscles
const EXERCISE_MAPPINGS: ExerciseMapping[] = [
	// Chest exercises
	{
		patterns: [/bench\s*press/i, /chest\s*press/i, /floor\s*press/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/push[\s-]*up/i, /pushup/i, /wall\s*push/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/wide[\s-]*grip\s*push/i, /wide\s*push[\s-]*up/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/diamond\s*push/i, /close[\s-]*grip\s*push/i, /narrow\s*push/i, /tricep\s*push[\s-]*up/i],
		targets: [
			{ muscle: 'triceps', activation: 'primary' },
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/decline\s*push[\s-]*up/i, /feet[\s-]*elevated\s*push/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/pike\s*push[\s-]*up/i, /pike\s*pushup/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'chest', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/handstand\s*push[\s-]*up/i, /hspu/i, /wall\s*handstand/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'traps', activation: 'secondary' }
		]
	},
	{
		patterns: [/archer\s*push/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/pseudo\s*planche/i, /planche\s*push/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/ring\s*push[\s-]*up/i, /ring\s*pushup/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
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
		patterns: [/cable\s*cross[\s-]*over/i, /crossover/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/pec[\s-]*deck/i, /machine\s*fl[yi]/i, /butterfly/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' }
		]
	},
	{
		patterns: [/landmine\s*press/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/pull[\s-]*over/i, /pullover/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'triceps', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/svend\s*press/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
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
	{
		patterns: [/ring\s*dip/i],
		targets: [
			{ muscle: 'chest', activation: 'primary' },
			{ muscle: 'triceps', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/tricep\s*dip/i, /bench\s*dip/i],
		targets: [
			{ muscle: 'triceps', activation: 'primary' },
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},

	// Back exercises
	{
		patterns: [/pull[\s-]*up/i, /pullup/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'rhomboids', activation: 'secondary' }
		]
	},
	{
		patterns: [/chin[\s-]*up/i, /chinup/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'biceps', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'secondary' }
		]
	},
	{
		patterns: [/neutral[\s-]*grip\s*pull/i, /hammer\s*grip\s*pull/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'forearms', activation: 'secondary' }
		]
	},
	{
		patterns: [/muscle[\s-]*up/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/scapular\s*pull/i, /scap\s*pull/i],
		targets: [
			{ muscle: 'lats', activation: 'secondary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'traps', activation: 'secondary' }
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
		patterns: [/straight[\s-]*arm\s*pull/i, /stiff[\s-]*arm\s*pull/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'triceps', activation: 'stabilizer' }
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
		patterns: [/seal\s*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
	{
		patterns: [/meadows\s*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'secondary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/inverted\s*row/i, /body\s*row/i, /australian\s*row/i, /ring\s*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/chest[\s-]*supported.*row/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'rhomboids', activation: 'primary' },
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
		patterns: [/sumo\s*deadlift/i, /sumo\s*dead\s*lift/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'inner_thighs', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'secondary' }
		]
	},
	{
		patterns: [/deficit\s*deadlift/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'quads', activation: 'secondary' }
		]
	},
	{
		patterns: [/rack\s*pull/i, /block\s*pull/i],
		targets: [
			{ muscle: 'lower_back', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'traps', activation: 'primary' },
			{ muscle: 'forearms', activation: 'secondary' }
		]
	},
	{
		patterns: [/trap[\s-]*bar\s*deadlift/i, /hex[\s-]*bar/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'secondary' }
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
		patterns: [/jefferson\s*curl/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'primary' }
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
		patterns: [/z[\s-]*press/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/push\s*press/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'quads', activation: 'secondary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/jerk/i, /split\s*jerk/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'triceps', activation: 'secondary' },
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/behind.*neck.*press/i, /btn\s*press/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'shoulders_rear', activation: 'secondary' },
			{ muscle: 'triceps', activation: 'secondary' }
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
		patterns: [/goblet\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' }
		]
	},
	{
		patterns: [/box\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/zercher/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'biceps', activation: 'secondary' }
		]
	},
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
		patterns: [/pistol\s*squat/i, /single[\s-]*leg\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/skater\s*squat/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/single[\s-]*leg.*deadlift/i, /one[\s-]*leg.*deadlift/i, /sldl/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'secondary' },
			{ muscle: 'abs', activation: 'stabilizer' }
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
		patterns: [/nordic/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'secondary' }
		]
	},
	{
		patterns: [/glute[\s-]*ham\s*raise/i, /ghr/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'lower_back', activation: 'secondary' }
		]
	},
	{
		patterns: [/reverse\s*hyper/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' },
			{ muscle: 'lower_back', activation: 'secondary' }
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
		patterns: [/cable\s*pull[\s-]*through/i, /pull[\s-]*through/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
		]
	},
	{
		patterns: [/band\s*walk/i, /monster\s*walk/i, /lateral\s*band/i, /crab\s*walk/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'quads', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/fire\s*hydrant/i],
		targets: [
			{ muscle: 'glutes', activation: 'primary' }
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
		patterns: [/side\s*plank/i],
		targets: [
			{ muscle: 'obliques', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'glutes', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/l[\s-]*sit/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'hip_flexors', activation: 'primary' },
			{ muscle: 'quads', activation: 'secondary' }
		]
	},
	{
		patterns: [/pallof/i, /anti[\s-]*rotation/i],
		targets: [
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'obliques', activation: 'primary' }
		]
	},
	{
		patterns: [/wood[\s-]*chop/i, /cable\s*chop/i],
		targets: [
			{ muscle: 'obliques', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/landmine\s*rotation/i, /landmine\s*twist/i],
		targets: [
			{ muscle: 'obliques', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'stabilizer' }
		]
	},
	{
		patterns: [/copenhagen/i],
		targets: [
			{ muscle: 'inner_thighs', activation: 'primary' },
			{ muscle: 'obliques', activation: 'secondary' },
			{ muscle: 'abs', activation: 'secondary' }
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
	{
		patterns: [/medicine\s*ball\s*slam/i, /ball\s*slam/i],
		targets: [
			{ muscle: 'lats', activation: 'primary' },
			{ muscle: 'abs', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/battle\s*rope/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'abs', activation: 'secondary' },
			{ muscle: 'forearms', activation: 'secondary' }
		]
	},
	{
		patterns: [/sled\s*push/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'calves', activation: 'secondary' }
		]
	},
	{
		patterns: [/sled\s*pull/i, /sled\s*drag/i],
		targets: [
			{ muscle: 'hamstrings', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'lats', activation: 'secondary' }
		]
	},
	{
		patterns: [/prowler/i],
		targets: [
			{ muscle: 'quads', activation: 'primary' },
			{ muscle: 'glutes', activation: 'primary' },
			{ muscle: 'shoulders_front', activation: 'secondary' }
		]
	},
	{
		patterns: [/man[\s-]*maker/i],
		targets: [
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'lats', activation: 'secondary' },
			{ muscle: 'quads', activation: 'secondary' }
		]
	},
	{
		patterns: [/devil[\s-]*press/i],
		targets: [
			{ muscle: 'shoulders_front', activation: 'primary' },
			{ muscle: 'chest', activation: 'secondary' },
			{ muscle: 'glutes', activation: 'secondary' },
			{ muscle: 'hamstrings', activation: 'secondary' }
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

// Cache for inferred muscle targets to avoid repeated regex matching
const muscleCache = new Map<string, MuscleTarget[] | undefined>();

/**
 * Infer target muscles for an exercise based on its name
 */
export function inferTargetMuscles(exerciseName: string): MuscleTarget[] | undefined {
	const normalizedName = exerciseName.toLowerCase().trim();

	if (muscleCache.has(normalizedName)) {
		return muscleCache.get(normalizedName);
	}

	for (const mapping of EXERCISE_MAPPINGS) {
		for (const pattern of mapping.patterns) {
			if (pattern.test(normalizedName)) {
				muscleCache.set(normalizedName, mapping.targets);
				return mapping.targets;
			}
		}
	}

	muscleCache.set(normalizedName, undefined);
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
