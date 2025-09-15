# Music Filter Frontend

Modern React-based frontend for browsing and filtering music collections with advanced filtering capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

## 🛠️ Technology Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **TanStack Query**: Data fetching and state management
- **TanStack Table**: Powerful table component with sorting/filtering
- **Ant Design**: Professional UI components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles and theme
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── components/             # React components
│   ├── SongTable.tsx      # Main table component
│   ├── EditableTagCell.tsx # Tag editing functionality
│   └── FilterPanel.tsx    # Filter controls
├── lib/                   # Utilities and API
│   ├── api.ts            # API client and types
│   └── providers.tsx     # React Query and theme providers
└── public/               # Static assets
```

## 🎯 Key Features

### SongTable Component
- **TanStack Table**: Efficient virtualized table
- **Sorting**: Click headers to sort columns
- **Filtering**: Global search across all fields
- **Responsive**: Adapts to screen size
- **Audio Features**: Display energy, valence, danceability
- **Actions**: Play button for each song

### FilterPanel Component
- **Text Filters**: Artist, album, genre, year
- **Tag Filters**: Select up to 2 tags with autocomplete
- **Range Sliders**: Filter by audio features
- **Clear Filters**: Reset all filters
- **Responsive**: Mobile-friendly layout

### EditableTagCell Component
- **View Mode**: Display existing tags as colored badges
- **Edit Mode**: Click "Add" to add new tags
- **Autocomplete**: Suggests existing tags
- **Tag Creation**: Create new tags on-the-fly
- **Tag Removal**: Click X to remove tags
- **Group Colors**: Tags colored by group (Speed, Mood, etc.)

### Theme System
- **Light/Dark Modes**: Toggle with button
- **System Preference**: Respects OS theme setting
- **Persistence**: Saves preference to localStorage
- **Ant Design Integration**: Consistent theming

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🎵 Audio Features

### Display Format
- **Energy**: Percentage (0-100%)
- **Valence**: Percentage (0-100%)
- **Danceability**: Percentage (0-100%)
- **Tempo**: BPM (beats per minute)
- **Duration**: mm:ss format

### Filter Ranges
- **Sliders**: Visual range selection
- **Real-time**: Updates as you drag
- **Tooltips**: Show current values
- **Reset**: Clear individual ranges

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Adaptive Layouts
- **Table**: Horizontal scroll on mobile
- **Filters**: Stacked layout on mobile

## 🚀 Performance

### Optimization Techniques
- **React Query Caching**: Minimize API calls
- **Table Virtualization**: Handle large datasets
- **Lazy Loading**: Load components when needed
- **Image Optimization**: Next.js automatic optimization

## 🔮 Future Enhancements

### Planned Features
- **Music Player**: Bottom player component
- **Playlists**: Save and manage playlists
- **User Auth**: Discord integration
- **Sidebar**: Sliding playlist menu
- **Audio Visualization**: Waveforms and spectrums
