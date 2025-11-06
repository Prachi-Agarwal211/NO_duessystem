# Issue: Duplicate SearchBar Components

## Problem Description
There are two SearchBar components with nearly identical functionality but different styling and SVG icons:

1. `src/components/ui/SearchBar.jsx` - Used in admin dashboard and other UI components
2. `src/components/staff/SearchBar.jsx` - Used in staff dashboard

## Code Duplication Details

### Component 1: `src/components/ui/SearchBar.jsx`
```jsx
export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}
```

### Component 2: `src/components/staff/SearchBar.jsx`
```jsx
const SearchBar = ({ value, onChange, placeholder }) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder || "Search..."}
        className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-md bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>
  );
};
```

## Issues Identified

1. **Code Duplication**: Nearly identical functionality implemented twice
2. **Inconsistent Styling**: Different CSS classes and icon positioning
3. **Different SVG Icons**: Two different search icons used
4. **Maintenance Overhead**: Changes need to be made in two places

## Impact
- **Maintainability**: High - changes need to be synchronized across both components
- **Consistency**: Medium - different visual appearance across the application
- **Bundle Size**: Low - minimal impact on bundle size

## Recommended Solution

### Option 1: Consolidate into Single Component (Recommended)
1. Keep the more feature-rich version (`src/components/ui/SearchBar.jsx`)
2. Remove `src/components/staff/SearchBar.jsx`
3. Update all imports to use the unified component
4. Standardize styling across the application

### Option 2: Create Shared Component with Variants
1. Create a base SearchBar component with configurable styling
2. Use props to control appearance variants
3. Update both existing components to use the shared base

## Files to Modify
- `src/components/staff/SearchBar.jsx` - Remove this file
- `src/app/staff/dashboard/page.js` - Update import to use `src/components/ui/SearchBar.jsx`
- Any other files importing the staff SearchBar

## Priority
**High** - This should be fixed before deployment to ensure consistent UI and reduce maintenance overhead.