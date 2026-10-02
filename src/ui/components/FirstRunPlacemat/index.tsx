import './FirstRunPlacemat.css';

interface FirstRunPlacematProps {
  onStartNavigating: () => void;
  onSkip: () => void;
}

export function FirstRunPlacemat({ onStartNavigating, onSkip }: FirstRunPlacematProps) {
  return (
    <section
      className="first-run-placemat"
      aria-labelledby="first-run-placemat-title"
      aria-describedby="first-run-placemat-description"
    >
      <div className="first-run-placemat-heading">
        <img className="first-run-placemat-icon" src="assets/icon.svg" alt="" aria-hidden="true" />
        <div>
          <p className="first-run-placemat-eyebrow">Sheet Navigator</p>
          <h2 id="first-run-placemat-title">Find any worksheet in seconds</h2>
        </div>
      </div>

      <p id="first-run-placemat-description" className="first-run-placemat-description">
        Navigate large Excel workbooks from one focused sidebar instead of scanning crowded tabs.
      </p>

      <ul className="first-run-placemat-features">
        <li>Search worksheets with fuzzy matching.</li>
        <li>Preview a sheet before switching to it.</li>
        <li>Pin and group the sheets you use most.</li>
      </ul>

      <div className="first-run-placemat-actions">
        <button type="button" className="primary-button" onClick={onStartNavigating}>
          Start navigating
        </button>
        <button type="button" className="ghost-button" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </section>
  );
}
