import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <section className="page-error" aria-labelledby="not-found-title">
            <div className="page-error__card">
                <p className="page-error__code">404</p>
                <h1 id="not-found-title" className="page-error__title">Page not found</h1>
                <p className="page-error__body">
                    The link you followed no longer points to anything in the encyclopedia.
                </p>
                <Link className="btn btn--primary" to="/">Back to home</Link>
            </div>
        </section>
    );
}
