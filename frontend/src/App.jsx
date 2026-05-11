import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import ArticlePage from './pages/ArticlePage.jsx';
import ArticleEditorPage from './pages/ArticleEditorPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReadingPage from './pages/ReadingPage.jsx';
import UsersListPage from './pages/UsersListPage.jsx';
import UserCreatePage from './pages/UserCreatePage.jsx';
import UserDetailPage from './pages/UserDetailPage.jsx';
import UserEditPage from './pages/UserEditPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route
                    path="/articles/new"
                    element={(
                        <ProtectedRoute requireAdmin>
                            <ArticleEditorPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/articles/:slug/edit"
                    element={(
                        <ProtectedRoute>
                            <ArticleEditorPage />
                        </ProtectedRoute>
                    )}
                />
                <Route path="/articles/:slug" element={<ArticlePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/my-reading"
                    element={(
                        <ProtectedRoute>
                            <ReadingPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/users"
                    element={(
                        <ProtectedRoute requireAdmin>
                            <UsersListPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/users/new"
                    element={(
                        <ProtectedRoute requireAdmin>
                            <UserCreatePage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/users/:id"
                    element={(
                        <ProtectedRoute>
                            <UserDetailPage />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/users/:id/edit"
                    element={(
                        <ProtectedRoute>
                            <UserEditPage />
                        </ProtectedRoute>
                    )}
                />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}

export default App;
