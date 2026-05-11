import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';

import '../pages/styles/main.css';
import './styles/spa.css';
import './styles/lab4-forms.css';
import './styles/lab4-editing.css';
import './styles/lab4-pages.css';

const ROUTER_FUTURE = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

async function bootstrap() {
    if (import.meta.env.VITE_USE_MSW === '1') {
        const { worker } = await import('./mocks/browser.js');
        await worker.start({ onUnhandledRequest: 'bypass' });
    }
    const container = document.getElementById('root');
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <BrowserRouter future={ROUTER_FUTURE}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </BrowserRouter>
        </React.StrictMode>,
    );
}

bootstrap();
