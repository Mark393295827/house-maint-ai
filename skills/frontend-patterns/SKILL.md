---
name: Frontend Patterns
description: React and Next.js patterns for the project
---

# Frontend Patterns Skill

Modern React patterns used in house-maint-ai.

## Component Patterns

### Container/Presentational

```jsx
// Presentational (dumb) - just renders UI
function UserCard({ name, avatar, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <img src={avatar} alt={name} />
      <h3>{name}</h3>
    </div>
  );
}

// Container (smart) - handles logic
function UserCardContainer({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <Loading />;
  return <UserCard {...user} onClick={() => selectUser(user.id)} />;
}
```

### Compound Components

```jsx
function Tabs({ children, defaultTab }) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabContext.Provider value={{ active, setActive }}>
      {children}
    </TabContext.Provider>
  );
}

Tabs.List = function TabList({ children }) { /*...*/ };
Tabs.Panel = function TabPanel({ id, children }) { /*...*/ };

// Usage
<Tabs defaultTab="home">
  <Tabs.List>
    <Tabs.Tab id="home">Home</Tabs.Tab>
    <Tabs.Tab id="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="home">Home content</Tabs.Panel>
  <Tabs.Panel id="settings">Settings content</Tabs.Panel>
</Tabs>
```

### Custom Hooks

```jsx
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

## State Management

### Context Pattern

```jsx
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const value = {
    theme,
    toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light')
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

## Performance

### Memoization

```jsx
// Memoize expensive calculations
const sortedItems = useMemo(() => 
  items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedChild = memo(ChildComponent);
```

### Code Splitting

```jsx
const LazyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```
