import { jsPDF } from 'jspdf';
import type { Program, Workout, Exercise } from '$lib/types/program';
import { DAY_NAMES } from '$lib/utils/date-helpers';

const COLORS = {
	primary: [15, 23, 42] as [number, number, number], // slate-900
	secondary: [100, 116, 139] as [number, number, number], // slate-500
	accent: [6, 182, 212] as [number, number, number], // cyan-500
	warmup: [245, 158, 11] as [number, number, number], // amber-500
	cooldown: [16, 185, 129] as [number, number, number], // emerald-500
	divider: [226, 232, 240] as [number, number, number] // slate-200
};

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

export function exportProgramToPdf(program: Program): void {
	const doc = new jsPDF();
	let y = MARGIN;

	// Title
	doc.setFontSize(24);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...COLORS.primary);
	doc.text(program.name, MARGIN, y);
	y += 10;

	// Description
	if (program.description) {
		doc.setFontSize(11);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...COLORS.secondary);
		const descLines = doc.splitTextToSize(program.description, CONTENT_WIDTH);
		doc.text(descLines, MARGIN, y);
		y += descLines.length * 5 + 5;
	}

	// Schedule
	const scheduleDays = program.schedule.weeklyPattern.map((p) => DAY_NAMES[p.dayOfWeek]).join(', ');
	doc.setFontSize(10);
	doc.setTextColor(...COLORS.accent);
	doc.text(`Schedule: ${scheduleDays}`, MARGIN, y);
	y += 10;

	// Divider
	doc.setDrawColor(...COLORS.divider);
	doc.setLineWidth(0.5);
	doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
	y += 10;

	// Workouts - ordered by schedule (day of week)
	const sortedPattern = [...program.schedule.weeklyPattern].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

	for (let i = 0; i < sortedPattern.length; i++) {
		const pattern = sortedPattern[i];
		const workout = program.workouts[pattern.workoutIndex];
		if (!workout) continue;

		// Check if we need a new page
		if (y > 250) {
			doc.addPage();
			y = MARGIN;
		}

		y = renderWorkout(doc, workout, y, DAY_NAMES[pattern.dayOfWeek]);
		y += 10;
	}

	// Save
	const filename = `${program.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
	doc.save(filename);
}

function renderWorkout(doc: jsPDF, workout: Workout, startY: number, dayName: string): number {
	let y = startY;

	// Workout header
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...COLORS.primary);
	doc.text(`${dayName} - ${workout.name}`, MARGIN, y);

	// Duration badge
	const duration = formatDuration(workout.estimatedDuration);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...COLORS.secondary);
	doc.text(duration, PAGE_WIDTH - MARGIN, y, { align: 'right' });
	y += 6;

	// Notes
	if (workout.notes) {
		doc.setFontSize(9);
		doc.setTextColor(...COLORS.secondary);
		const notesLines = doc.splitTextToSize(workout.notes, CONTENT_WIDTH);
		doc.text(notesLines, MARGIN, y);
		y += notesLines.length * 4 + 3;
	}

	// Group exercises by type
	const warmupExercises = workout.exercises.filter((e) => e.type === 'warmup');
	const mainExercises = workout.exercises.filter((e) => e.type === 'main');
	const cooldownExercises = workout.exercises.filter((e) => e.type === 'cooldown');

	if (warmupExercises.length > 0) {
		y = renderExerciseSection(doc, 'Warm-up', warmupExercises, y, COLORS.warmup);
	}

	if (mainExercises.length > 0) {
		y = renderExerciseSection(doc, 'Main', mainExercises, y, COLORS.accent);
	}

	if (cooldownExercises.length > 0) {
		y = renderExerciseSection(doc, 'Cool-down', cooldownExercises, y, COLORS.cooldown);
	}

	return y;
}

function renderExerciseSection(
	doc: jsPDF,
	title: string,
	exercises: Exercise[],
	startY: number,
	color: [number, number, number]
): number {
	let y = startY + 3;

	// Check page break
	if (y > 270) {
		doc.addPage();
		y = MARGIN;
	}

	// Section header
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...color);
	doc.text(title.toUpperCase(), MARGIN, y);
	y += 5;

	// Exercises
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...COLORS.primary);

	for (const exercise of exercises) {
		// Check page break
		if (y > 280) {
			doc.addPage();
			y = MARGIN;
		}

		// Exercise name
		doc.setFontSize(10);
		doc.text(`• ${exercise.name}`, MARGIN + 2, y);

		// Sets/reps
		const details = formatExerciseDetails(exercise);
		doc.setFontSize(9);
		doc.setTextColor(...COLORS.secondary);
		doc.text(details, PAGE_WIDTH - MARGIN, y, { align: 'right' });
		doc.setTextColor(...COLORS.primary);

		y += 5;
	}

	return y;
}

function formatExerciseDetails(exercise: Exercise): string {
	const parts: string[] = [];

	if (exercise.sets) {
		if (exercise.reps) {
			parts.push(`${exercise.sets} × ${exercise.reps}`);
		} else if (exercise.duration) {
			parts.push(`${exercise.sets} × ${exercise.duration}s`);
		} else {
			parts.push(`${exercise.sets} sets`);
		}
	}

	if (exercise.restBetweenSets > 0) {
		parts.push(`${exercise.restBetweenSets}s rest`);
	}

	return parts.join(' · ');
}

function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
