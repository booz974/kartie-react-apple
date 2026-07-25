import { useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { Input, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import ImageUploader from '@/components/ui/ImageUploader';
import Modal from '@/components/ui/Modal';

interface CreateEventFormProps {
  onCancel: () => void;
  onCreateEvent: (payload: {
    title: string;
    date: string;
    location: string;
    description: string;
    image: string;
  }) => void;
}

export default function CreateEventForm({ onCancel, onCreateEvent }: CreateEventFormProps) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    image: '',
  });
  const [imageError, setImageError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.image) {
      onCreateEvent({ ...form });
    } else {
      // L'erreur reste à côté du champ concerné : elle dit quoi corriger, et où.
      setImageError("Ajoutez une image pour illustrer l'événement.");
    }
  }

  return (
    <Modal
      onClose={onCancel}
      title={
        <>
          <span aria-hidden="true">🎉 </span>Ajouter un événement
        </>
      }
      description="Il rejoindra l'agenda du quartier, avec son affiche, sa date et son lieu."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" form="create-event-form" variant="primary" disabled={!form.image}>
            {form.image ? 'Créer' : 'Ajoutez une image'}
          </Button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Titre de l'événement">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Ex : Fête des voisins"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Date">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="25 décembre 2025"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          )}
        </Field>

        <Field label="Lieu">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Place du marché, salle polyvalente…"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          )}
        </Field>

        <Field label="Description">
          {(props) => (
            <Textarea
              {...props}
              required
              rows={4}
              placeholder="Ce qui se passe, pour qui, et à quelle heure."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          )}
        </Field>

        {/* L'uploader porte déjà son propre libellé lié à son input : on ne
            l'enveloppe pas dans un Field, dont le `for` ne viserait rien. */}
        <div className="k-field">
          <p className="k-field__label">Affiche de l&apos;événement</p>
          <p className="k-field__hint">
            C&apos;est elle qu&apos;on voit en premier dans l&apos;agenda : une bonne photo remplit
            une salle.
          </p>
          <ImageUploader
            onUploadSuccess={(url) => {
              setForm((f) => ({ ...f, image: url }));
              setImageError('');
            }}
          />
          {imageError ? (
            <p className="k-field__error" role="alert">
              <Icon name="alert" size={15} className="mt-px shrink-0" />
              <span>{imageError}</span>
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
