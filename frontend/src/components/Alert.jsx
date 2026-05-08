const ICON_BY_VARIANT = {
    info: 'i',
    success: '✓',
    danger: '!',
    warning: '⚠',
};

export default function Alert({
    variant = 'info',
    title,
    children,
}) {
    const role = variant === 'danger' ? 'alert' : 'status';
    return (
        <div className={`alert alert--${variant}`} role={role}>
            <span className="alert__icon" aria-hidden="true">
                {ICON_BY_VARIANT[variant] ?? 'i'}
            </span>
            <div>
                {title && <p className="alert__title">{title}</p>}
                <p className="alert__body">{children}</p>
            </div>
        </div>
    );
}
