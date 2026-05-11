/* OrganicBackdrop — two soft drifting blobs behind page content.
   Variants pick which blobs render and where. Pointer-events off, z-index -1.
   Animation halts under prefers-reduced-motion via theme.css kill-switch. */

const ROSE_PATH = 'M421.5,330Q391,400,309,433.5Q227,467,151,419Q75,371,72.5,288'
    + 'Q70,205,131,148Q192,91,275,72Q358,53,407.5,131.5Q457,210,452,275Q447,340,421.5,330Z';
const AMETHYST_PATH = 'M438.5,318Q397,386,326,433.5Q255,481,176,438'
    + 'Q97,395,76.5,310Q56,225,103.5,151Q151,77,234,55Q317,33,388.5,82Q460,131,464.5,219'
    + 'Q469,307,438.5,318Z';

export default function OrganicBackdrop({ variant = 'homepage' }) {
    if (variant === 'off') return null;

    const showRose = variant === 'homepage' || variant === 'article';
    const showAmethyst = variant === 'homepage' || variant === 'auth';

    return (
        <div className={`backdrop backdrop--${variant}`} aria-hidden="true">
            {showRose && (
                <svg
                    className="backdrop__blob backdrop__blob--rose"
                    viewBox="0 0 500 500"
                    preserveAspectRatio="none"
                >
                    <path d={ROSE_PATH} fill="var(--rose)" />
                </svg>
            )}
            {showAmethyst && (
                <svg
                    className="backdrop__blob backdrop__blob--amethyst"
                    viewBox="0 0 500 500"
                    preserveAspectRatio="none"
                >
                    <path d={AMETHYST_PATH} fill="var(--amethyst)" />
                </svg>
            )}
        </div>
    );
}
