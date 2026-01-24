# TODO List

## High Priority

### PWA Support
- [ ] Install vite-plugin-pwa properly
- [ ] Configure service worker for offline support
- [ ] Add web app manifest with proper icons
- [ ] Create app icons (192x192, 512x512)
- [ ] Add favicon
- [ ] Test installation on mobile devices
- [ ] Implement offline detection UI

### Program Reevaluation
- [ ] Create "Modify Program" button on program detail page
- [ ] Build reevaluation conversation UI (similar to onboarding)
- [ ] Connect to existing reevaluation prompts
- [ ] Test program modification flow
- [ ] Handle program updates in calendar view

## Medium Priority

### Enhanced Calendar
- [ ] Add month view component
- [ ] Toggle between week and month views
- [ ] Show completed workout indicators
- [ ] Add mini calendar navigation
- [ ] Support scrolling to specific dates

### Workout Enhancements
- [ ] Implement Wake Lock API properly
- [ ] Add haptic feedback on mobile (vibration)
- [ ] Allow editing rest time during workout
- [ ] Add skip exercise functionality
- [ ] Add notes to sets (weight used, form issues)
- [ ] Timer notification sounds
- [ ] Background workout tracking

### History & Progress
- [ ] Weekly/monthly statistics
- [ ] Progress charts (workouts completed, total time)
- [ ] Personal records tracking
- [ ] Filter history by program
- [ ] Search history
- [ ] Export history as CSV/JSON

## Low Priority

### Program Management
- [ ] Duplicate program
- [ ] Archive programs (instead of delete)
- [ ] Program templates
- [ ] Share programs (export JSON)
- [ ] Import programs from JSON
- [ ] Pause/resume programs

### Exercise Library
- [ ] Browse all exercises from programs
- [ ] Search exercises
- [ ] Filter by equipment/muscle group
- [ ] Add custom exercises
- [ ] Exercise video links/GIFs
- [ ] Exercise descriptions

### User Experience
- [ ] Dark mode
- [ ] Custom themes
- [ ] Keyboard shortcuts
- [ ] Swipe gestures
- [ ] Tutorial/onboarding tour
- [ ] Settings: units (kg/lbs)
- [ ] Settings: rest timer sound options

### Data Management
- [ ] Backup to file
- [ ] Restore from file
- [ ] Clear all data option
- [ ] Data usage statistics
- [ ] Sync between devices (future)

### Social/Community
- [ ] Share workout completion
- [ ] Weekly summaries
- [ ] Achievement badges
- [ ] Streak tracking

## Bug Fixes & Polish

### Known Issues
- [ ] Fix accessibility warnings (autofocus, keyboard handlers)
- [ ] Add ARIA labels to icon buttons
- [ ] Improve error messages
- [ ] Add retry logic for failed API calls
- [ ] Better handling of incomplete workouts

### UI Polish
- [ ] Better empty states
- [ ] Skeleton loaders
- [ ] Optimistic updates
- [ ] Smoother transitions
- [ ] Better mobile keyboard handling
- [ ] Pull to refresh on mobile

### Testing
- [ ] Add unit tests (Vitest)
- [ ] Add integration tests
- [ ] Test with various API responses
- [ ] Test offline functionality
- [ ] Test on different browsers
- [ ] Test on different screen sizes

## Future Features

### Advanced AI Features
- [ ] Nutrition advice
- [ ] Form check recommendations
- [ ] Exercise substitutions
- [ ] Progress-based program adjustments
- [ ] Deload week suggestions

### Gamification
- [ ] XP and leveling system
- [ ] Challenges
- [ ] Achievements
- [ ] Leaderboards (optional)

### Integration
- [ ] Apple Health integration
- [ ] Google Fit integration
- [ ] Fitness tracker integration
- [ ] Calendar app integration

### Advanced Analytics
- [ ] Volume tracking (sets × reps × weight)
- [ ] Intensity tracking
- [ ] Fatigue management
- [ ] Recovery recommendations
- [ ] Injury risk indicators

## Technical Debt

### Code Quality
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Add pre-commit hooks
- [ ] Improve TypeScript strictness
- [ ] Add JSDoc comments
- [ ] Refactor large components

### Performance
- [ ] Lazy load routes
- [ ] Optimize bundle size
- [ ] Add image optimization
- [ ] Implement virtual scrolling for long lists
- [ ] Cache AI responses

### Security
- [ ] Validate all user inputs
- [ ] Sanitize AI responses
- [ ] Rate limit API calls client-side
- [ ] Add CSP headers

## Documentation

- [ ] API documentation
- [ ] Component documentation
- [ ] Architecture diagrams
- [ ] Deployment guide
- [ ] Contributing guidelines
- [ ] User guide videos

---

## Priority Guide

- **High Priority**: Essential features from the original plan
- **Medium Priority**: Improves core functionality significantly
- **Low Priority**: Nice-to-have enhancements
- **Future**: Long-term vision items

## Estimated Time to MVP++

- High Priority items: ~15 hours
- Medium Priority items: ~20 hours
- Total enhanced MVP: ~35 hours additional work

---

**Note**: This TODO list is based on the original plan and common fitness app features. Prioritize based on user feedback and actual usage patterns.
