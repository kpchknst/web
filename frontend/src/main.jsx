import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';

import '../pages/styles/main.css';
import './styles/spa.css';

const container = document.getElementById('root');
const root = createRoot(container);

const ROUTER_FUTURE = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

root.render(
    <React.StrictMode>
        <BrowserRouter future={ROUTER_FUTURE}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
