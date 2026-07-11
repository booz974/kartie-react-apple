import { useState, type FormEvent } from 'react';
import { signInWithPassword, signUpWithPassword } from '@/api/auth';
import './auth-ui-mirror.css';

interface AuthModalProps {
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

const SIGN_IN = {
  emailLabel: 'Email address',
  passwordLabel: 'Your Password',
  emailPlaceholder: 'Your email address',
  passwordPlaceholder: 'Your password',
  buttonLabel: 'Sign in',
  loadingLabel: 'Signing in ...',
  linkText: "Don't have an account?",
  linkAction: 'Sign up',
};

const SIGN_UP = {
  emailLabel: 'Email address',
  passwordLabel: 'Create a Password',
  emailPlaceholder: 'Your email address',
  passwordPlaceholder: 'Your password',
  buttonLabel: 'Sign up',
  loadingLabel: 'Signing up ...',
  linkText: 'Already have an account?',
  linkAction: 'Sign in',
};

function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Email not confirmed': 'Veuillez confirmer votre adresse e-mail.',
    'User already registered': 'Un compte existe déjà avec cet e-mail.',
    'Password should be at least 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères.',
    'Unable to validate email address: invalid format':
      'Adresse e-mail invalide.',
  };

  return translations[message] ?? message;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const copy = mode === 'signin' ? SIGN_IN : SIGN_UP;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Une erreur est survenue.';
      setErrorMessage(translateAuthError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          aria-label="Fermer"
        >
          &times;
        </button>

        <div className="supabase-auth-ui_ui-container">
          <form onSubmit={handleSubmit} className="supabase-auth-ui_ui-divider">
            <div className="mb-4">
              <label htmlFor="auth-email" className="supabase-auth-ui_ui-label">
                {copy.emailLabel}
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="supabase-auth-ui_ui-input"
                placeholder={copy.emailPlaceholder}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="auth-password" className="supabase-auth-ui_ui-label">
                {copy.passwordLabel}
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="supabase-auth-ui_ui-input"
                placeholder={copy.passwordPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="supabase-auth-ui_ui-button"
            >
              {loading ? copy.loadingLabel : copy.buttonLabel}
            </button>

            <div className="supabase-auth-ui_ui-anchor">
              {copy.linkText}{' '}
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setErrorMessage('');
                }}
              >
                {copy.linkAction}
              </a>
            </div>

            {errorMessage ? (
              <div className="supabase-auth-ui_ui-message">{errorMessage}</div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
