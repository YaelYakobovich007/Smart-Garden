# ArticlesSection Component

This component displays a horizontal scrollable list of gardening tips and articles.

## Features

- Horizontal scrollable article cards
- Article thumbnails with category badges
- Read time indicators
- "See All" functionality
- Clean, modern design matching the app's green/nature theme

## Usage

```javascript
import ArticlesSection from "./ArticlesSection/ArticlesSection";

// In your main screen
<ArticlesSection />;
```

## Navigation

The component handles navigation to:

- `ArticleDetails` screen when an article is tapped
- `ArticlesList` screen when "See All" is tapped

## Data Structure

Articles are defined in `client/src/data/articles.js` with the following structure:

```javascript
{
  id: 1,
  title: "Article Title",
  description: "Article description",
  category: "Care Tips",
  readTime: "5 min read",
  image: require('path/to/image'),
  content: "Full article content in markdown format"
}
```

## Styling

The component uses a clean, modern design with:

- Rounded corners and subtle shadows
- Green accent color (#4CAF50) matching the app theme
- Proper typography using Nunito font family
- Responsive card width (75% of screen width)

## Dependencies

- React Navigation for screen navigation
- Expo Vector Icons for icons
- React Native core components
