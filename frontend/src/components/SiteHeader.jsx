import { NavLink, useNavigate } from 'react-router-dom';

import useAuth from '../auth/useAuth.js';
import Badge from './Badge.jsx';

export default function SiteHeader() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="site-header">
            <div className="container site-header__inner">
                <NavLink className="site-header__logo" to="/">Stones &amp; Scents</NavLink>
                <nav className="site-nav" aria-label="Primary">
                    <NavLink
                        className={({ isActive }) => (
                            isActive
                                ? 'site-nav__link site-nav__link--active'
                                : 'site-nav__link'
                        )}
                        to="/"
                        end
                    >
                        Home
                    </NavLink>
                    {user && (
                        <NavLink
                            className={({ isActive }) => (
                                isActive
                                    ? 'site-nav__link site-nav__link--active'
                                    : 'site-nav__link'
                            )}
                            to="/my-reading"
                        >
                            My reading
                        </NavLink>
                    )}
                    {user?.role === 'admin' && (
                        <NavLink
                            className={({ isActive }) => (
                                isActive
                                    ? 'site-nav__link site-nav__link--active'
                                    : 'site-nav__link'
                            )}
                            to="/moderation"
                        >
                            Moderation
                        </NavLink>
                    )}
                    {user && (
                        <NavLink
                            className={({ isActive }) => (
                                isActive
                                    ? 'site-nav__link site-nav__link--active'
                                    : 'site-nav__link'
                            )}
                            to="/profile"
                        >
                            Profile
                        </NavLink>
                    )}
                    {user?.role === 'admin' && (
                        <NavLink
                            className={({ isActive }) => (
                                isActive
                                    ? 'site-nav__link site-nav__link--active'
                                    : 'site-nav__link'
                            )}
                            to="/tags"
                        >
                            Tags
                        </NavLink>
                    )}
                    {user?.role === 'admin' && (
                        <NavLink
                            className={({ isActive }) => (
                                isActive
                                    ? 'site-nav__link site-nav__link--active'
                                    : 'site-nav__link'
                            )}
                            to="/users"
                        >
                            Users
                        </NavLink>
                    )}
                    {user ? (
                        <span className="site-nav__user">
                            <Badge variant={`role-${user.role}`}>{user.role}</Badge>
                            {' '}
                            <NavLink className="site-nav__username" to={`/users/${user.id}`}>
                                {user.username}
                            </NavLink>
                            {' '}
                            <button
                                type="button"
                                className="btn btn--secondary btn--small"
                                onClick={handleLogout}
                            >
                                Log out
                            </button>
                        </span>
                    ) : (
                        <NavLink className="btn btn--secondary btn--small" to="/login">
                            Log in
                        </NavLink>
                    )}
                </nav>
            </div>
        </header>
    );
}
