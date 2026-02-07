import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { initStorage } from './lib/initStorage.ts'
import { ThemeProvider, getAllThemesCSS } from './lib/theme.ts'

// Initialize storage before rendering React
initStorage().then(() => {
  // Inject theme CSS variables
  const themeStyles = document.createElement('style');
  themeStyles.innerHTML = getAllThemesCSS();
  document.head.appendChild(themeStyles);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  )
}).catch((error) => {
  console.error('Failed to initialize storage:', error);
  // Render error state
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Failed to initialize storage</h1>
        <p>Please check your browser's localStorage settings and refresh the page.</p>
      </div>
    </div>
  );
});

