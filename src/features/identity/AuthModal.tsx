import { useState, type FormEvent } from 'react';
import { signInWithPassword, signUpWithPassword } from '@/api/auth';
import Button from '@/components/ui/Button';
import Field, { Input } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Notice from '@/components/ui/Notice';
import Segmented from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';

interface AuthModalProps {
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

const COPY: Record<AuthMode, { submit: string; passwordLabel: string; hint?: string }> = {
  signin: { submit: 'Se connecter', passwordLabel: 'Mot de passe' },
  signup: {
    submit: 'Créer mon compte',
    passwordLabel: 'Choisir un mot de passe',
    hint: 'Au moins 6 caractères.',
  },
};

function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Email not confirmed': 'Confirmez votre adresse e-mail avant de vous connecter.',
    'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
    'User already registered': 'Un compte existe déjà avec cet e-mail.',
    'Password should be at least 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères.',
    'Unable to validate email address: invalid format': 'Cette adresse e-mail n’est pas valide.',
  };

  return translations[message] ?? message;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();

  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
        toast.success(
          'Compte créé',
          'Vérifiez votre boîte mail pour confirmer votre adresse.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      setErrorMessage(translateAuthError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="narrow"
      title="Rejoindre Kartie"
      description="Participez aux consultations, soutenez les pétitions et échangez avec votre quartier."
    >
      <Segmented
        label="Connexion ou inscription"
        className="mb-6 w-full"
        block
        value={mode}
        onChange={(next) => {
          setMode(next);
          setErrorMessage('');
        }}
        options={[
          { value: 'signin', label: 'Connexion' },
          { value: 'signup', label: 'Inscription' },
        ]}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Adresse e-mail">
          {(props) => (
            <Input
              {...props}
              type="email"
              required
              autoComplete="email"
              placeholder="vous@exemple.re"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              data-autofocus
            />
          )}
        </Field>

        <Field label={copy.passwordLabel} hint={copy.hint}>
          {(props) => (
            <Input
              {...props}
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}

        <Button type="submit" variant="primary" size="lg" block loading={loading} className="mt-2">
          {copy.submit}
        </Button>

        <p className="k-caption k-ink-tertiary flex items-start gap-2">
          <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
          Votre adresse sert uniquement à sécuriser votre compte et n’est jamais affichée
          publiquement.
        </p>
      </form>
    </Modal>
  );
}
