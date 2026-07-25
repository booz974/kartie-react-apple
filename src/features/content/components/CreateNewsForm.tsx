import { useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { Input, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';

interface CreateNewsFormProps {
  onCancel: () => void;
  onCreateNews: (payload: { title: string; content: string; date: string }) => void;
}

export default function CreateNewsForm({ onCancel, onCreateNews }: CreateNewsFormProps) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    date: new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onCreateNews({ ...form });
  }

  return (
    <Modal
      onClose={onCancel}
      title={
        <>
          <span aria-hidden="true">📰 </span>Publier une actualité
        </>
      }
      description={`Elle sera datée du ${form.date} et apparaîtra en tête du fil du quartier.`}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" form="create-news-form" variant="primary">
            Publier
          </Button>
        </>
      }
    >
      <form id="create-news-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Titre de l'actualité">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Ex : Nouvelle ligne de bus dès lundi"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Contenu">
          {(props) => (
            <Textarea
              {...props}
              required
              rows={7}
              placeholder="L'essentiel d'abord : ce qui change, à partir de quand, pour qui."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
