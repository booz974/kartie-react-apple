import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Field, { Input, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Segmented from '@/components/ui/Segmented';

interface CreateCircleModalProps {
  isAdmin: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (data: { name: string; description: string; type: 'public' | 'private' }) => void;
}

export default function CreateCircleModal({
  isAdmin,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CreateCircleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('private');
  const [nameError, setNameError] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setNameError('Donnez un nom à votre cercle.');
      return;
    }

    setNameError('');
    onSubmit({ name: name.trim(), description: description.trim(), type });
  }

  return (
    <Modal
      onClose={onCancel}
      size="narrow"
      title="Créer un cercle"
      description="Un espace de discussion réservé à celles et ceux qui le rejoignent."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="primary"
            form="create-circle-form"
            type="submit"
            loading={isSubmitting}
          >
            Créer
          </Button>
        </>
      }
    >
      <form id="create-circle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="k-card k-card--flat flex items-center gap-3 p-3">
          <Chip tone="asso" size={44}>
            🌱
          </Chip>
          <p className="k-footnote k-ink-secondary">
            Jardinage, covoiturage, coups de main : un cercle réunit les voisins autour d’un sujet.
          </p>
        </div>

        <Field label="Nom du cercle" error={nameError || undefined}>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="Jardiniers du Chaudron"
              maxLength={80}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Description" optional hint="En une phrase : à qui s’adresse ce cercle ?">
          {(props) => (
            <Textarea
              {...props}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="On échange nos boutures et nos coups de main au jardin."
              rows={3}
            />
          )}
        </Field>

        {isAdmin ? (
          <div className="k-field">
            <span className="k-field__label">Visibilité</span>
            <Segmented
              label="Visibilité du cercle"
              block
              value={type}
              onChange={setType}
              options={[
                {
                  value: 'private',
                  label: (
                    <>
                      <span aria-hidden="true">🔒</span>
                      Privé
                    </>
                  ),
                },
                {
                  value: 'public',
                  label: (
                    <>
                      <span aria-hidden="true">🌍</span>
                      Public
                    </>
                  ),
                },
              ]}
            />
            <p className="k-field__hint">
              Un cercle public est visible et rejoignable par tout le quartier.
            </p>
          </div>
        ) : (
          <p className="k-footnote k-ink-tertiary flex items-start gap-2">
            <Icon name="lock" size={15} className="mt-0.5" />
            Votre cercle sera privé : seuls les membres invités y accèdent.
          </p>
        )}
      </form>
    </Modal>
  );
}
