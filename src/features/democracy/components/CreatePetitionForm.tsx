import { useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { Input, Select, Textarea } from '@/components/ui/Field';
import ImageUploader from '@/components/ui/ImageUploader';
import Modal from '@/components/ui/Modal';

interface CreatePetitionFormProps {
  onCancel: () => void;
  onCreatePetition: (payload: {
    title: string;
    theme: string;
    summary: string;
    source: string;
    image: string | null;
  }) => void;
}

const THEMES = ['Logement', 'Sécurité', 'Environnement', 'Transport', 'Emploi', 'Autre'];

export default function CreatePetitionForm({
  onCancel,
  onCreatePetition,
}: CreatePetitionFormProps) {
  const [form, setForm] = useState({
    title: '',
    theme: '',
    summary: '',
    source: '',
    image: null as string | null,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onCreatePetition({ ...form });
  }

  return (
    <Modal
      onClose={onCancel}
      title="Lancer une pétition"
      description="Formulez une demande claire : c'est elle que vos voisins soutiendront."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" form="create-petition-form" variant="warm">
            Lancer
          </Button>
        </>
      }
    >
      <form id="create-petition-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Titre de la pétition">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Ex : Un passage piéton devant l'école"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Thème">
          {(props) => (
            <Select
              {...props}
              required
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
            >
              <option disabled value="">
                Choisissez un thème
              </option>
              {THEMES.map((theme) => (
                <option key={theme}>{theme}</option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Résumé" hint="C'est ce qui s'affiche dans la liste des pétitions.">
          {(props) => (
            <Textarea
              {...props}
              required
              rows={3}
              placeholder="Une description courte de ce que vous demandez."
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          )}
        </Field>

        {/* L'uploader porte son propre libellé lié à son input : on ne
            l'enveloppe pas dans un Field, dont le `for` ne viserait rien. */}
        <div className="k-field">
          <p className="k-field__label">
            Image <span className="k-field__optional">— facultatif</span>
          </p>
          <ImageUploader onUploadSuccess={(url) => setForm((f) => ({ ...f, image: url }))} />
        </div>

        <Field label="Source / contexte" hint="D'où vient la demande, ce qui l'a déclenchée.">
          {(props) => (
            <Textarea
              {...props}
              required
              rows={2}
              placeholder="Ex : demande évoquée lors du conseil de quartier du 3 mars."
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
