# Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is in use).

### 3. Configure Your API Key

1. Click on the **Settings** tab in the bottom navigation
2. Enter your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
3. Click **Save API Key**

Your API key is stored locally in your browser's localStorage and never leaves your device except to make API calls to Anthropic.

## Creating Your First Workout Program

### Step 1: Start Onboarding

1. From the home page, click **"Create New Program"**
2. You'll see a text area where you can describe your fitness goals

### Step 2: Describe Your Goals

Enter your fitness objective in natural language. Examples:

- "I want to build muscle and get stronger"
- "I want to lose weight and improve my cardio"
- "I want to train for a marathon"
- "I'm a beginner and want to get in shape"

Click **"Start Conversation"** to begin.

### Step 3: Answer Claude's Questions

Claude will ask you questions to understand:
- Your current fitness level (beginner/intermediate/advanced)
- What equipment you have access to
- How many days per week you can train
- Any injuries or limitations
- Your preferences

Answer naturally - you can type freely as if talking to a personal trainer.

### Step 4: Generate Your Program

When Claude has enough information, you'll see a **"Generate My Program"** button. Click it to create your personalized workout program.

This takes about 10-30 seconds as Claude generates a complete program with:
- Multiple workouts tailored to your goals
- Specific exercises with sets, reps, and rest times
- A weekly schedule that fits your availability
- Warmup and cooldown exercises

### Step 5: View Your Program

After generation, you'll be taken to your program details page where you can see:
- Program description and goals
- Your weekly schedule (which days you'll work out)
- All the workouts in your program

## Using Your Program

### View the Calendar

1. Click the **Calendar** tab in the bottom navigation
2. You'll see your weekly schedule with workouts on the appropriate days
3. Navigate between weeks using the arrow buttons

### Start a Workout

1. From the calendar, click on a day with a scheduled workout
2. Or click on the workout card below the calendar
3. This opens the workout session

### During Your Workout

**Exercise Display:**
- See the current exercise name, sets, reps, and equipment needed
- View exercise notes and technique cues

**Completing Sets:**
- Tap each set button as you complete it
- Completed sets turn green with a checkmark
- All sets must be completed before moving to the next exercise

**Rest Timer:**
- After completing all sets, a rest timer automatically starts
- You'll see a countdown and progress bar
- A sound plays when rest is complete
- The next exercise automatically loads

**Progress Bar:**
- At the top of the screen, see your overall workout progress
- Shows which exercise you're on (e.g., "Exercise 3 of 10")

**Abandoning a Workout:**
- Click the X button in the top right if you need to stop
- You'll be asked to confirm
- Abandoned workouts are marked but not counted as completed

### Completing a Workout

1. After the last exercise, you'll see a completion modal
2. Click **"Finish Workout"** to complete
3. Your workout is saved to your history

### View History

1. Click the **History** tab
2. See all your completed workouts
3. View details like duration, sets completed, and date

## Tips for Best Results

### Program Creation

- **Be specific**: "I want to build muscle in my chest and arms" is better than "I want to get stronger"
- **Mention equipment**: Tell Claude exactly what you have (dumbbells, barbell, resistance bands, etc.)
- **Be honest about your level**: This ensures appropriate exercise selection and volume
- **Include constraints**: Mention injuries, time limits, or dislikes

### During Workouts

- **Keep your phone awake**: The app will try to keep the screen on during workouts
- **Have equipment ready**: Check the workout beforehand
- **Use the rest timer**: Don't skip rest periods - they're part of the program
- **Mark sets honestly**: Only mark sets as complete when you've actually done them

### General Usage

- **Offline capability**: Once programs are created, you can do workouts offline
- **Multiple programs**: You can create multiple programs for different goals
- **Delete old programs**: Clean up programs you're no longer using

## Troubleshooting

### "API key is required" Error

- Go to Settings and make sure your API key is saved
- Make sure the key starts with `sk-ant-`
- Try copying and pasting it again

### Programs Not Saving

- Check your browser's IndexedDB isn't disabled
- Make sure you have enough storage space
- Try using a different browser

### Workout Won't Start

- Make sure you clicked on a day with a scheduled workout
- Check that the program still exists (view it from the home page)
- Try refreshing the page

### Rest Timer Not Working

- Make sure your browser allows audio playback
- Check that your device isn't in silent mode
- The timer is timestamp-based, so closing the app will reset it

## Keyboard Shortcuts

- **Enter**: Send message in conversation (Shift+Enter for new line)
- **Escape**: Close modals

## Browser Compatibility

- **Recommended**: Chrome, Edge, Safari (latest versions)
- **Required features**: IndexedDB, localStorage, modern JavaScript
- **Mobile**: Works on iOS Safari and Android Chrome

## Data Storage

All data is stored locally in your browser:

- **Programs**: Stored in IndexedDB
- **Workout sessions**: Stored in IndexedDB
- **API key**: Stored in localStorage
- **Nothing** is sent to any server except Claude API calls for program generation

To backup your data, you can export your programs (feature coming soon) or manually backup your browser's IndexedDB.

## Next Steps

- Create your first program and complete a workout
- Try modifying a program by creating a new conversation
- Explore different workout types and schedules
- Track your progress over time

Enjoy your AI-powered fitness journey! 💪
