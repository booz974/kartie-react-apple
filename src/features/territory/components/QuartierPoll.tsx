import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Progress from '@/components/ui/Progress';
import {
  getConsultationOptions,
  getOptionText,
  getResultPercentage,
} from '@/features/territory/utils/quartierHelpers';
import type { Consultation, ConsultationDetails } from '@/lib/types/contract';

type QuartierPollProps = {
  consultation: Consultation | null;
  showResults: boolean;
  details: ConsultationDetails | null;
  isVoting: boolean;
  selectedOptions: number[];
  onOptionClick: (consultation: Consultation, optionId: number) => void;
  onSubmitMultiple: () => void;
  onNext: () => void;
  onSeeAll: () => void;
};

/**
 * Consultation express — le moment de participation le plus direct du produit.
 *
 * Il porte l'accent chaud, réservé à ce type d'instant : c'est le seul endroit
 * de la page où la couleur appelle réellement à agir.
 */
export default function QuartierPoll({
  consultation,
  showResults,
  details,
  isVoting,
  selectedOptions,
  onOptionClick,
  onSubmitMultiple,
  onNext,
  onSeeAll,
}: QuartierPollProps) {
  if (!consultation) {
    return (
      <div className="rounded-xl border border-separator bg-surface p-6 text-center">
        <p className="k-subhead k-ink-tertiary">Aucune consultation ouverte pour le moment.</p>
        <Button variant="plain" size="sm" className="mt-2" onClick={onSeeAll}>
          Voir les consultations passées
        </Button>
      </div>
    );
  }

  const summary = (consultation as { summary?: string }).summary ?? '';
  const options = getConsultationOptions(consultation);
  const isMultiple = Boolean(consultation.multiple_choices);

  return (
    <div className="overflow-hidden rounded-xl border border-separator bg-surface">
      <div className="border-b border-separator bg-warm-soft px-5 py-4 md:px-6">
        <p className="k-eyebrow flex items-center gap-2 text-warm">
          <Icon name="ballot" size={15} />
          Consultation express
        </p>
        <h3 className="k-title-3 mt-2 text-balance">{consultation.title}</h3>
        {summary ? <p className="k-subhead k-ink-secondary mt-2">{summary}</p> : null}
      </div>

      <div className="p-5 md:p-6">
        {showResults && details ? (
          <div>
            <p className="k-subhead mb-5 flex items-center gap-2 font-medium text-success">
              <Icon name="checkCircle" size={17} />
              Votre vote a bien été pris en compte.
            </p>

            <ul className="flex flex-col gap-4">
              {(details.options ?? []).map((option) => {
                const opt = option as { id: number; option_text?: string; votes?: number };
                const votes = opt.votes || 0;
                const percentage = getResultPercentage(votes, details);

                return (
                  <li key={opt.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="k-subhead font-medium">{opt.option_text}</span>
                      <span className="k-footnote k-ink-tertiary tabular-nums">
                        {percentage} % · {votes} vote{votes > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      tone="warm"
                      label={`${opt.option_text} : ${percentage} %`}
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={onNext}>
                Consultation suivante
                <Icon name="arrowRight" size={17} />
              </Button>
              <Button variant="ghost" onClick={onSeeAll}>
                Tout voir
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div
              role={isMultiple ? 'group' : 'radiogroup'}
              aria-label={consultation.title ?? 'Consultation'}
              className="flex flex-col gap-2"
            >
              {options.map((option, index) => {
                const selected = isMultiple && selectedOptions.includes(option.id);

                return (
                  <button
                    key={option.id || index}
                    type="button"
                    role={isMultiple ? 'checkbox' : 'radio'}
                    aria-checked={isMultiple ? selected : false}
                    onClick={() => onOptionClick(consultation, option.id)}
                    disabled={isVoting}
                    className={`k-press flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left k-body transition-colors disabled:opacity-50 ${
                      selected
                        ? 'border-warm bg-warm-soft font-medium text-warm'
                        : 'border-separator-strong hover:border-ink-quaternary hover:bg-surface-secondary'
                    }`}
                  >
                    {isMultiple ? (
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          selected ? 'border-warm bg-warm text-ink-on-warm' : 'border-ink-quaternary'
                        }`}
                      >
                        {selected ? <Icon name="check" size={13} strokeWidth={2.6} /> : null}
                      </span>
                    ) : null}
                    <span className="flex-1">{getOptionText(option)}</span>
                    {!isMultiple ? (
                      <Icon name="chevronRight" size={17} className="k-ink-quaternary" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {isMultiple ? (
              <Button
                variant="warm"
                block
                className="mt-4"
                loading={isVoting}
                disabled={selectedOptions.length === 0}
                onClick={onSubmitMultiple}
              >
                {selectedOptions.length > 0
                  ? `Valider mon vote (${selectedOptions.length})`
                  : 'Sélectionnez au moins une réponse'}
              </Button>
            ) : null}

            <Button variant="plain" size="sm" className="mt-4" onClick={onSeeAll}>
              Voir toutes les consultations
              <Icon name="chevronRight" size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
