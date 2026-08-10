import Link from "next/link";

type TrustFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
};

export function TrustField({ label, htmlFor, required, hint, children }: TrustFieldProps) {
  return (
    <label htmlFor={htmlFor} className="trust-field block space-y-2">
      <span className="trust-field__label">
        {label}
        {required ? (
          <>
            {" "}
            <span aria-hidden="true">*</span>
            <span className="sr-only">(필수)</span>
          </>
        ) : null}
      </span>
      {children}
      {hint ? <span className="trust-field__hint">{hint}</span> : null}
    </label>
  );
}

type TrustInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TrustInput({ className = "", ...props }: TrustInputProps) {
  return <input className={`corp-trust-input corp-trust-focus trust-input ${className}`.trim()} {...props} />;
}

type TrustTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TrustTextarea({ className = "", ...props }: TrustTextareaProps) {
  return (
    <textarea className={`corp-trust-input corp-trust-focus trust-textarea ${className}`.trim()} {...props} />
  );
}

type TrustButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function TrustButton({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: TrustButtonProps) {
  const variantClass =
    variant === "primary"
      ? "corp-trust-btn-primary"
      : variant === "secondary"
        ? "corp-trust-btn-secondary"
        : "corp-trust-btn-ghost";

  return (
    <button
      type={type}
      className={`${variantClass} corp-trust-focus shell-focus-ring trust-btn ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

type TrustButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function TrustButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: TrustButtonLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "corp-trust-focus shell-focus-ring trust-btn",
        variant === "primary" ? "corp-trust-btn-primary" : "corp-trust-btn-secondary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

type TrustAlertProps = {
  tone: "info" | "success" | "error";
  children: React.ReactNode;
};

export function TrustAlert({ tone, children }: TrustAlertProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`trust-alert trust-alert--${tone}`}>
      {children}
    </div>
  );
}

type TrustTabSwitchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export function TrustTabSwitch({ label, value, onChange, options }: TrustTabSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="trust-tab-switch"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`trust-tab-switch__item${value === option.value ? " trust-tab-switch__item--active" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
