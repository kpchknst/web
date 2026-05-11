import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import OrganicBackdrop from './OrganicBackdrop.jsx';
import SiteHeader from './SiteHeader.jsx';
import SiteFooter from './SiteFooter.jsx';

function backdropVariantFor(pathname) {
    if (pathname === '/') return 'homepage';
    if (pathname.startsWith('/articles/')) return 'article';
    if (pathname === '/login' || pathname === '/register') return 'auth';
    if (pathname === '/moderation' || pathname === '/tags' || pathname.startsWith('/users')) {
        return 'off';
    }
    return 'homepage';
}

export default function Layout() {
    const location = useLocation();
    const [routeKey, setRouteKey] = useState(location.pathname);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        if (location.pathname === routeKey) return undefined;
        setTransitioning(true);
        const id = window.setTimeout(() => {
            setRouteKey(location.pathname);
            setTransitioning(false);
        }, 180);
        return () => window.clearTimeout(id);
    }, [location.pathname, routeKey]);

    return (
        <div className="site-shell">
            <OrganicBackdrop variant={backdropVariantFor(location.pathname)} />
            <SiteHeader />
            <main className={`page-main${transitioning ? ' is-transitioning' : ''}`}>
                <div className="container">
                    <Outlet />
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
