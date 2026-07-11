import { describe, it, expect } from 'vitest';
import { transformAlaUneData } from './alaUneUtils';

describe('transformAlaUneData', () => {
  it('returns default when input is empty', () => {
    expect(transformAlaUneData([])).toEqual({ flashInfos: [] });
  });

  it('returns default when input is not an array', () => {
    expect(transformAlaUneData(null)).toEqual({ flashInfos: [] });
    expect(transformAlaUneData(undefined)).toEqual({ flashInfos: [] });
  });

  it('transforms article, event, sondage and flash infos', () => {
    const result = transformAlaUneData([
      { id: 1, type: 'article', title: 'T', content: 'C' },
      { id: 2, type: 'event', title: 'E', event_date: '2023-10-27' },
      { id: 3, type: 'sondage', title: 'Q', sondage_options: [{ id: 1, consultation_id: 3, label: 'A' }] },
      { id: 4, type: 'flash_info', title: 'Flash', content: 'Flash' },
    ]);
    expect(result.article?.description).toBe('C');
    expect(result.event?.date).toBe('2023-10-27');
    expect(result.sondage?.question).toBe('Q');
    expect(result.flashInfos).toHaveLength(1);
  });
});
