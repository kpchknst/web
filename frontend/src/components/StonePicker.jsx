import { getStoneImageUrl } from '../utils/stoneImages.js';

const STONES = [
    { slug: 'rose-quartz', title: 'Rose Quartz' },
    { slug: 'aventurine', title: 'Aventurine' },
    { slug: 'amethyst', title: 'Amethyst' },
    { slug: 'black-tourmaline', title: 'Black Tourmaline' },
    { slug: 'lapis-lazuli', title: 'Lapis Lazuli' },
    { slug: 'citrine', title: 'Citrine' },
    { slug: 'moonstone', title: 'Moonstone' },
    { slug: 'tigers-eye', title: "Tiger's Eye" },
    { slug: 'selenite', title: 'Selenite' },
    { slug: 'carnelian', title: 'Carnelian' },
];

const MAX_SELECT = 3;

export default function StonePicker({ selected, onToggle, disabled = false }) {
    const handleClick = (slug) => {
        if (disabled) return;
        if (selected.includes(slug)) {
            onToggle(selected.filter((s) => s !== slug));
            return;
        }
        if (selected.length >= MAX_SELECT) return;
        onToggle([...selected, slug]);
    };

    return (
        <div className="stone-picker">
            <p className="stone-picker__hint">
                {`Pick up to ${MAX_SELECT} stones — you have selected ${selected.length}.`}
            </p>
            <div className="stone-picker__grid">
                {STONES.map((stone) => {
                    const isSelected = selected.includes(stone.slug);
                    const cap = !isSelected && selected.length >= MAX_SELECT;
                    const className = isSelected
                        ? 'stone-picker__card stone-picker__card--selected'
                        : 'stone-picker__card';
                    return (
                        <button
                            type="button"
                            key={stone.slug}
                            className={className}
                            onClick={() => handleClick(stone.slug)}
                            disabled={disabled || cap}
                            aria-pressed={isSelected}
                            title={cap ? `Maximum ${MAX_SELECT} stones` : stone.title}
                        >
                            <img
                                className="stone-picker__thumb"
                                src={getStoneImageUrl(stone.slug)}
                                alt={`${stone.title} illustration`}
                                loading="lazy"
                            />
                            <span className="stone-picker__name">{stone.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
