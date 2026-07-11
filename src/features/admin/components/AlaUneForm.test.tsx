import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AlaUneForm from './AlaUneForm';
import type { AlaUneFormValues } from '@/api/alaUne';

vi.mock('@/components/ui/ImageUploader', () => ({
  default: ({
    onUploadSuccess,
  }: {
    onUploadSuccess?: (url: string) => void;
  }) => (
    <button type="button" onClick={() => onUploadSuccess?.('https://cdn.test/img.png')}>
      MockUpload
    </button>
  ),
}));

describe('AlaUneForm', () => {
  it('shows conditional fields for article by default', () => {
    render(<AlaUneForm onCancel={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('Titre')).toBeTruthy();
    expect(screen.getByText('Contenu')).toBeTruthy();
    expect(screen.getByText('Image')).toBeTruthy();
    expect(screen.queryByText('Options de réponse')).toBeNull();
  });

  it('switches to sondage conditional fields', () => {
    render(<AlaUneForm onCancel={() => {}} onSubmit={() => {}} />);
    fireEvent.change(screen.getByDisplayValue('Article'), {
      target: { value: 'sondage' },
    });
    expect(screen.getByText('Question du sondage')).toBeTruthy();
    expect(screen.getByText('Options de réponse')).toBeTruthy();
    expect(screen.queryByText('Contenu')).toBeNull();
    expect(screen.queryByText('Image')).toBeNull();
  });

  it('adds and removes sondage options', () => {
    render(<AlaUneForm onCancel={() => {}} onSubmit={() => {}} />);
    fireEvent.change(screen.getByDisplayValue('Article'), {
      target: { value: 'sondage' },
    });

    expect(screen.getAllByPlaceholderText("Texte de l'option")).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter une option' }));
    expect(screen.getAllByPlaceholderText("Texte de l'option")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /^X$/ })[0]);
    expect(screen.getAllByPlaceholderText("Texte de l'option")).toHaveLength(1);
  });

  it('submits sondage form values with draft options', () => {
    const onSubmit = vi.fn();
    render(<AlaUneForm onCancel={() => {}} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByDisplayValue('Article'), {
      target: { value: 'sondage' },
    });

    const textboxes = screen.getAllByRole('textbox');
    // First textbox = question title; subsequent = options
    fireEvent.change(textboxes[0], { target: { value: 'Votre avis ?' } });
    fireEvent.change(screen.getByPlaceholderText("Texte de l'option"), {
      target: { value: 'Oui' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter une option' }));
    fireEvent.change(screen.getAllByPlaceholderText("Texte de l'option")[1], {
      target: { value: 'Non' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const form = onSubmit.mock.calls[0][0] as AlaUneFormValues;
    expect(form.type).toBe('sondage');
    expect(form.title).toBe('Votre avis ?');
    expect(form.sondage_options).toEqual([
      { text: 'Oui', votes: 0 },
      { text: 'Non', votes: 0 },
    ]);
  });

  it('shows event date and location for event type', () => {
    render(<AlaUneForm onCancel={() => {}} onSubmit={() => {}} />);
    fireEvent.change(screen.getByDisplayValue('Article'), {
      target: { value: 'event' },
    });
    expect(screen.getByText("Date de l'événement")).toBeTruthy();
    expect(screen.getByText('Lieu')).toBeTruthy();
  });

  it('shows only content for flash_info', () => {
    render(<AlaUneForm onCancel={() => {}} onSubmit={() => {}} />);
    fireEvent.change(screen.getByDisplayValue('Article'), {
      target: { value: 'flash_info' },
    });
    expect(screen.getByText('Contenu')).toBeTruthy();
    expect(screen.queryByText('Titre')).toBeNull();
    expect(screen.queryByText('Image')).toBeNull();
    expect(screen.queryByText('Options de réponse')).toBeNull();
  });
});
