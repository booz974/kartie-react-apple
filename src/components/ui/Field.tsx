import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import Icon from './Icon';

type FieldProps = {
  label?: ReactNode;
  /** Consigne affichée en permanence, avant la saisie — pas après l'échec. */
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  /**
   * Reçoit les identifiants à poser sur le contrôle : c'est ce qui relie le
   * libellé, la consigne et l'erreur au champ pour les lecteurs d'écran.
   */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => ReactNode;
};

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={['k-field', className].filter(Boolean).join(' ')}>
      {label ? (
        <label className="k-field__label" htmlFor={id}>
          {label}
          {optional ? <span className="k-field__optional"> — facultatif</span> : null}
        </label>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}

      {hint && !error ? (
        <p className="k-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        // L'erreur est annoncée dès qu'elle apparaît, sans voler le focus.
        <p className="k-field__error" id={errorId} role="alert">
          <Icon name="alert" size={15} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  seamless,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { seamless?: boolean }) {
  return (
    <input
      className={['k-input', seamless ? 'k-input--seamless' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  seamless,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { seamless?: boolean }) {
  return (
    <textarea
      className={['k-input', seamless ? 'k-input--seamless' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={['k-input', className].filter(Boolean).join(' ')} {...rest} />;
}

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={['k-checkbox', className].filter(Boolean).join(' ')}>
      <input type="checkbox" {...rest} />
      <span className="k-subhead k-ink">{label}</span>
    </label>
  );
}

export default Field;
