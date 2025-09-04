# StatusPopup Component Design

## Overview

The StatusPopup component is a modal popup that displays information, success, and error states with a clean, card-based design that matches exactly the User Profile card design shown in the reference image.

## Design Features

### Visual Design

- **Card Layout**: White rectangular card with rounded corners (16px radius)
- **Background**: Very light blue/off-white background (#F8FAFC) matching the image
- **Shadow**: Very subtle shadow for minimal elevation effect
- **Border**: Subtle border with #E2E8F0 color
- **Spacing**: Consistent 20px padding with 16px margins between elements

### Icon System

- **Info State**: Purple person icon (#8B5CF6) - matches the image exactly
- **Success State**: Green check-circle icon (#10B981)
- **Error State**: Red alert-circle icon (#EF4444)
- **Icon Container**: 48x48px circular container with colored border
- **Icon Size**: 24px Feather icons

### Typography

- **Title**: 18px, Bold (700), Dark gray (#1E293B)
- **Description**: 14px, Regular (400), Medium gray (#64748B)
- **Button Text**: 16px, Semi-bold (600), Dark gray (#1E293B)
- **Font Family**: Nunito font family for consistency

### Color Scheme

- **Info Colors**: Purple (#8B5CF6) for icons - matches the image
- **Success Colors**: Green (#10B981) for icons and buttons
- **Error Colors**: Red (#EF4444) for icons and buttons
- **Neutral Colors**: White (#FFFFFF) for card, dark gray for text
- **Background**: Light blue-gray (#F8FAFC) for overlay and icon containers
- **Button**: Light gray (#F1F5F9) with dark text - matches the image

### Button Design

- **Shape**: Rounded rectangle (16px radius)
- **Colors**: Light gray background with dark text (like in the image)
- **Shadow**: No shadow for clean, minimal look
- **Padding**: 16px vertical, 24px horizontal
- **Min Width**: 120px for consistent button sizing

## Usage Examples

### Info Popup (Default - matches the image)

```jsx
<StatusPopup
  visible={showInfo}
  type="info"
  title="User Profile"
  description="A detailed profile view with avatar and user information."
  buttonText="View Profile"
  onButtonPress={handleViewProfile}
  onClose={() => setShowInfo(false)}
/>
```

### Success Popup

```jsx
<StatusPopup
  visible={showSuccess}
  type="success"
  title="Operation Successful"
  description="Your action has been completed successfully."
  buttonText="Continue"
  onButtonPress={handleContinue}
  onClose={() => setShowSuccess(false)}
/>
```

### Error Popup

```jsx
<StatusPopup
  visible={showError}
  type="error"
  title="Operation Failed"
  description="Something went wrong. Please try again."
  buttonText="Retry"
  onButtonPress={handleRetry}
  onClose={() => setShowError(false)}
/>
```

## Accessibility

- Modal is dismissible with back button
- High contrast colors for visibility
- Clear visual hierarchy with icons and text
- Touch-friendly button sizes

## Responsive Design

- Maximum width of 400px for optimal readability
- Centered horizontally and vertically
- Adapts to different screen sizes with padding
- Light blue background that matches the image design
