interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="search-field">
      <input
        type="search"
        placeholder="Search sheets"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
