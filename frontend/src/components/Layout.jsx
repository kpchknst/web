import { Outlet } from 'react-router-dom';

import SiteHeader from './SiteHeader.jsx';
import SiteFooter from './SiteFooter.jsx';

export default function Layout() {
    return (
        <div className="site-shell">
            <SiteHeader />
            <main className="page-main">
                <div className="container">
                    <Outlet />
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
