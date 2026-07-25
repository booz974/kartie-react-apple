import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Field, { Input, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';

interface CreateArticleFormProps {
  onCancel: () => void;
  onCreateArticle: (payload: {
    title: string;
    category: string;
    description: string;
    image_url: string;
    content: string;
  }) => void;
}

export default function CreateArticleForm({
  onCancel,
  onCreateArticle,
}: CreateArticleFormProps) {
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    image_url: '',
    content: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateAndSubmit() {
    const nextErrors: Record<string, string> = {};

    if (!form.title) {
      nextErrors.title = 'Le titre est obligatoire.';
    }
    if (!form.content) {
      nextErrors.content = "Le contenu de l'article ne peut pas être vide.";
    }
    if (!form.image_url) {
      nextErrors.image_url = "L'URL de l'image de couverture est requise.";
    } else {
      try {
        new URL(form.image_url);
      } catch {
        nextErrors.image_url =
          'URL invalide. Elle doit commencer par http:// ou https://';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onCreateArticle({ ...form });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    validateAndSubmit();
  }

  return (
    <Modal
      onClose={onCancel}
      size="wide"
      title="Nouvel article"
      description="Racontez une réalisation du quartier : ce qui a changé, pour qui, et pourquoi."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" form="create-article-form" variant="primary">
            Publier
          </Button>
        </>
      }
    >
      <form id="create-article-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Titre de la réalisation" error={errors.title}>
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Ex : La médiathèque rouvre ses portes"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-autofocus
            />
          )}
        </Field>

        <Field label="Catégorie" hint="Un mot qui situe la réalisation dans la vie du quartier.">
          {(props) => (
            <Input
              {...props}
              type="text"
              required
              placeholder="Rénovation, Social, Mobilité…"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          )}
        </Field>

        <Field label="Description courte" hint="C'est ce qui s'affiche dans la liste.">
          {(props) => (
            <Textarea
              {...props}
              required
              rows={3}
              placeholder="Une ou deux phrases pour donner envie de lire."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          )}
        </Field>

        <Field label="URL de l'image de couverture" error={errors.image_url}>
          {(props) => (
            <Input
              {...props}
              type="url"
              required
              placeholder="https://…"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            />
          )}
        </Field>

        <Field
          label="Contenu de l'article"
          hint="Les balises HTML simples sont acceptées : <h2>, <p>, <img src=…>."
          error={errors.content}
        >
          {(props) => (
            <Textarea
              {...props}
              required
              rows={14}
              placeholder="Racontez votre histoire ici…"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
