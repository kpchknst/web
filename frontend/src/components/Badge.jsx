export default function Badge({ variant = 'tag', children }) {
    return (
        <span className={`badge badge--${variant}`}>{children}</span>
    );
}
