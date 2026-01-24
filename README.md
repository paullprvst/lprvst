# AI Fitness Coach

An AI-powered workout program generator built with SvelteKit 5 and Claude API.

## Features

- **AI-Powered Program Generation**: Describe your fitness goals in natural language and get a personalized workout program
- **Interactive Onboarding**: Conversational flow to gather your fitness level, equipment, and schedule
- **Calendar View**: Weekly calendar showing scheduled workouts
- **Workout Execution**: Step-by-step workout tracking with rest timers
- **History Tracking**: View completed workout sessions
- **Offline Support**: Programs and workouts stored locally using IndexedDB

## Tech Stack

- **Frontend**: Svelte 5 + SvelteKit
- **AI**: Anthropic Claude API
- **Storage**: Dexie.js (IndexedDB)
- **Styling**: TailwindCSS
- **Icons**: Lucide Svelte
- **Utilities**: date-fns, Zod

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Configuration

1. Open the app in your browser
2. Go to Settings (bottom navigation)
3. Enter your Anthropic API key
4. The key is stored locally in your browser's localStorage

## Usage

### Creating a Program

1. Click "Create New Program" on the home page
2. Describe your fitness goals (e.g., "I want to build muscle")
3. Answer Claude's questions about your fitness level, equipment, and schedule
4. Review and confirm the generated program

### Following Your Program

1. Go to the Calendar tab to see your weekly schedule
2. Click on a scheduled workout day to start the workout
3. Follow the exercises, mark sets as complete
4. Rest timers will automatically start between exercises
5. Complete the workout and view it in your History

### Modifying a Program

- View your program details
- Use the conversation feature to request modifications
- Claude will update your program based on your feedback

## Development

```bash
# Type checking
npm run check

# Format code (if Prettier is configured)
npm run format

# Lint code (if ESLint is configured)
npm run lint
```

## Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte components
│   │   ├── calendar/     # Calendar views
│   │   ├── onboarding/   # Onboarding flow
│   │   ├── program/      # Program display
│   │   ├── workout/      # Workout execution
│   │   └── shared/       # Reusable UI components
│   ├── services/
│   │   ├── ai/          # Claude API integration
│   │   └── storage/     # IndexedDB repositories
│   ├── stores/          # Svelte stores
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
└── routes/              # SvelteKit routes
    ├── onboarding/      # Program creation
    ├── programs/        # Program views
    ├── calendar/        # Calendar view
    ├── workout/         # Active workout
    ├── history/         # Workout history
    └── settings/        # App settings
```

## Features to Add

- PWA support (offline app installation)
- Program reevaluation/modification
- Export/import programs
- Exercise video demonstrations
- Progress statistics and charts
- Multiple user profiles

## License

MIT

## Credits

Built with Claude Code
