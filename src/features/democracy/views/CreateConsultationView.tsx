import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Button from '@/components/ui/Button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import ImageUploader from '@/components/ui/ImageUploader';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { createConsultationTransaction } from '@/api/democracy';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin as checkIsAdmin } from '@/lib/types/contract';

export default function CreateConsultationView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();

  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; question?: string }>({});
  const [form, setForm] = useState({
    title: '',
    question: '',
    options: ['', ''],
    summary: '',
    description: '',
    cover_image: null as string | null,
    multiple_choices: false,
  });

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, ''] }));
  }

  function removeOption(index: number) {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;
      return { ...prev, options: prev.options.filter((_, i) => i !== index) };
    });
  }

  function updateOption(index: number, value: string) {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  function handleImageUpload(url: string) {
    setForm((prev) => ({ ...prev, cover_image: url }));
  }

  function handleImageError(err: unknown) {
    console.error('Erreur upload image:', err);
    toast.error("Impossible d'envoyer l'image", 'Réessayez avec un autre fichier.');
  }

  async function submitConsultation(event: React.FormEvent) {
    event.preventDefault();

    if (!session || !profile || !checkIsAdmin(profile)) {
      setFieldErrors({});
      setFormError('Accès refusé : la création d’un sondage est réservée aux administrateurs.');
      return;
    }

    if (!form.title.trim() || !form.question.trim()) {
      // Les erreurs de saisie se posent sur les champs concernés, pas dans une
      // notification qui disparaît avant d'avoir servi.
      setFormError('');
      setFieldErrors({
        title: form.title.trim() ? undefined : 'Le titre est obligatoire.',
        question: form.question.trim() ? undefined : 'La question est obligatoire.',
      });
      return;
    }

    const validOptions = form.options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      setFieldErrors({});
      setFormError('Renseignez au moins deux options de réponse.');
      return;
    }

    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      const quartierId = parseInt(idParam ?? '', 10);
      if (Number.isNaN(quartierId)) throw new Error('ID du quartier invalide.');

      const payload = {
        p_quartier_id: quartierId,
        p_title: form.title,
        p_question: form.question,
        p_options: validOptions,
        p_summary: form.summary || null,
        p_description: form.description || null,
        p_cover_image: form.cover_image || null,
        p_multiple_choices: form.multiple_choices,
      };

      const { error } = await createConsultationTransaction(payload);

      if (error) {
        console.error("Détails de l'erreur Supabase:", error);
        throw error;
      }

      toast.success('Sondage publié', 'Il apparaît désormais dans le quartier.');
      navigate(`/quartiers/${quartierId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur attrapée :', message);
      setFormError(`La création a échoué : ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Page className="k-page--reading pt-6">
      <PageHeader
        eyebrow={
          <>
            <span aria-hidden="true">🗳️ </span>Consultation
          </>
        }
        title="Créer un sondage"
        description="Une question claire, deux réponses au minimum. C'est ce que verront les habitants du quartier."
      />

      <form onSubmit={(e) => void submitConsultation(e)}>
        <Section>
          <div className="flex flex-col gap-5">
            <Field label="Titre du sondage" error={fieldErrors.title}>
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  required
                  placeholder="Ex : Aménagement du parc"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Question posée" error={fieldErrors.question}>
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  required
                  placeholder="Ex : Quel type d'équipement préférez-vous ?"
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section
          title={
            <>
              <span aria-hidden="true">📝 </span>Options de réponse
            </>
          }
          description="Deux au minimum. Formulez-les à la même échelle pour que le choix reste comparable."
          action={
            <Button
              variant="tinted"
              size="sm"
              onClick={addOption}
              leading={<Icon name="plus" size={15} />}
            >
              Ajouter
            </Button>
          }
        >
          <ul className="flex flex-col gap-3">
            {form.options.map((option, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="k-footnote k-ink-tertiary w-5 shrink-0 text-right tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Input
                    type="text"
                    required
                    aria-label={`Option ${index + 1}`}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                </span>
                <Button
                  variant="ghost"
                  iconOnly
                  onClick={() => removeOption(index)}
                  disabled={form.options.length <= 2}
                  aria-label={`Supprimer l'option ${index + 1}`}
                >
                  <Icon name="trash" size={18} />
                </Button>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={
            <>
              <span aria-hidden="true">💡 </span>Contexte
            </>
          }
          description="Facultatif, mais cela aide à répondre en connaissance de cause."
        >
          <div className="flex flex-col gap-5">
            <Field
              label="Résumé court"
              optional
              hint="Apparaît dans la liste des sondages."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  placeholder="Une phrase pour situer le sujet."
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Description détaillée" optional>
              {(props) => (
                <Textarea
                  {...props}
                  rows={5}
                  placeholder="Expliquez le contexte du sondage…"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              )}
            </Field>

            {/* L'uploader porte son propre libellé lié à son input : on ne
                l'enveloppe pas dans un Field, dont le `for` ne viserait rien. */}
            <div className="k-field">
              <p className="k-field__label">
                Image de couverture <span className="k-field__optional">(facultatif)</span>
              </p>
              <p className="k-field__hint">
                Elle porte la carte du sondage dans la liste : une photo du lieu concerné vaut
                mieux qu&apos;un long résumé.
              </p>
              <ImageUploader
                bucketName="post_images"
                onUploadSuccess={handleImageUpload}
                onUploadError={handleImageError}
              />

              {/* L'aperçu est déjà rendu par l'uploader : on n'ajoute que le
                  retrait, qui seul remet la valeur du formulaire à zéro. */}
              {form.cover_image ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  leading={<Icon name="close" size={15} />}
                  onClick={() => setForm((prev) => ({ ...prev, cover_image: null }))}
                >
                  Retirer l&apos;image de couverture
                </Button>
              ) : null}
            </div>

            <Checkbox
              checked={form.multiple_choices}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, multiple_choices: e.target.checked }))
              }
              label="Autoriser plusieurs réponses par personne"
            />
          </div>
        </Section>

        <div className="k-hairline-top mt-10 flex flex-col gap-4 pt-6">
          {formError ? <Notice tone="danger">{formError}</Notice> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Publier le sondage
            </Button>
          </div>
        </div>
      </form>
    </Page>
  );
}
