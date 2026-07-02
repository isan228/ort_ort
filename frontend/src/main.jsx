import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { ToastProvider } from './components/ux/ToastContext.jsx';
import './index.css';
import './styles/account.css';
import './styles/news.css';
import './styles/tours.css';
import './styles/analysis.css';
import './styles/universities.css';
import './styles/page-shell.css';
import './styles/auth.css';
import './styles/admin.css';
import './styles/landing-how.css';
import './styles/landing-personas.css';
import './styles/landing-features.css';
import './styles/landing-mobile.css';
import './styles/landing-desktop.css';
import './styles/header.css';
import './styles/mobile-catalog.css';
import './styles/ux.css';
import './styles/responsive.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
);
