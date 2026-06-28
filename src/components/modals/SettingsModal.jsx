import { useTheme } from "../../context/ThemeContext.jsx";
import { Modal } from "../common/Modal.jsx";
import Icon from "../common/Icon.jsx";

const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "Always use the light theme" },
  { value: "dark", label: "Dark", hint: "Always use the dark theme" },
  { value: "system", label: "System", hint: "Match your device setting" },
];

export default function SettingsModal({ onClose }) {
  const { preference, setTheme } = useTheme();

  return (
    <Modal title="Settings" subtitle="Personalize how RSMC looks and behaves." onClose={onClose} width={560}>
      <div className="settings">
        <Section
          icon="settings"
          title="Appearance"
          desc="Choose a color theme for this device. Your choice is remembered."
        >
          <div className="settings-themes">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`settings-theme ${preference === opt.value ? "active" : ""}`}
                onClick={() => setTheme(opt.value)}
                aria-pressed={preference === opt.value}
              >
                <span className={`theme-swatch theme-swatch-${opt.value}`} aria-hidden="true" />
                <span className="settings-theme-label">{opt.label}</span>
                <span className="settings-theme-hint">{opt.hint}</span>
                {preference === opt.value && (
                  <span className="settings-theme-check">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Future settings (notifications, language, accessibility, etc.) slot
            in here as additional <Section> blocks. */}
        <div className="settings-more muted">
          <Icon name="bell" size={15} />
          <span>More settings — notifications, language, and accessibility — are coming soon.</span>
        </div>
      </div>
    </Modal>
  );
}

function Section({ icon, title, desc, children }) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <span className="settings-section-icon">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h3 className="settings-section-title">{title}</h3>
          {desc && <p className="muted settings-section-desc">{desc}</p>}
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}
