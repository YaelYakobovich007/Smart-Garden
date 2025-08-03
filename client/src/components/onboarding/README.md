# Onboarding Implementation

## Overview

The onboarding system provides a smooth introduction to the Smart Garden app for new users. It consists of three screens that highlight key app features with custom illustrations.

## Components

### OnboardingScreen.js

- Main onboarding component with swipe navigation
- Handles skip and completion logic
- Uses custom illustrations for each screen
- Integrates with onboarding service for state management

### OnboardingImage.js

- Custom illustration component for onboarding screens
- Provides three themed illustrations:
  - **Grow**: Plant with pot and sun (growth theme)
  - **Monitor**: Phone with app interface and sensors (monitoring theme)
  - **Notify**: Bell with notifications and calendar (reminders theme)

### onboardingService.js

- Manages onboarding completion state
- Uses AsyncStorage for persistence
- Provides methods to check, mark, and reset onboarding status

## Features

### Navigation

- Horizontal swipe between screens
- Page indicators for current position
- Skip button to bypass onboarding
- Next/Get Started buttons for progression

### Content

1. **Grow with Us**: Introduces the app's core value proposition
2. **Real-Time Monitoring**: Highlights plant monitoring capabilities
3. **Stay Informed**: Emphasizes notification and reminder features

### State Management

- Onboarding completion is stored in AsyncStorage
- Users see onboarding only once
- State can be reset for testing purposes

## Integration

### App.js Integration

- Onboarding check happens before session check
- Routes to Onboarding → Login → Main flow
- Onboarding completion is marked when user skips or completes

### Navigation Flow

```
App Start → Onboarding Check → Onboarding (if first time) → Login → Main
```

## Customization

### Adding New Screens

1. Add new data object to `onboardingData` array
2. Create corresponding illustration in `OnboardingImage.js`
3. Update navigation logic if needed

### Styling

- Uses green/nature theme colors
- Responsive design with device dimensions
- Smooth animations and transitions

### Testing

- Use `onboardingService.resetOnboarding()` to test onboarding flow
- Check `onboardingService.getOnboardingInfo()` for debugging

## Usage

The onboarding automatically shows for first-time users. To test:

```javascript
// Reset onboarding state
await onboardingService.resetOnboarding();

// Check onboarding status
const info = await onboardingService.getOnboardingInfo();
console.log(info);
```
