import type { AlaUneContent, AlaUneVM } from '@/lib/types/contract';

export function transformAlaUneData(data: AlaUneContent[] | null | undefined): AlaUneVM {
  if (!Array.isArray(data)) {
    return { flashInfos: [] };
  }

  return data.reduce<AlaUneVM>(
    (acc, item) => {
      if (item.type === 'article' && !acc.article) {
        acc.article = { ...item, description: item.content };
      } else if (item.type === 'event' && !acc.event) {
        acc.event = { ...item, date: item.event_date };
      } else if (item.type === 'sondage' && !acc.sondage) {
        acc.sondage = {
          ...item,
          question: item.title,
          consultation_options: item.sondage_options,
        };
      } else if (item.type === 'flash_info') {
        acc.flashInfos.push(item);
      }
      return acc;
    },
    { flashInfos: [] },
  );
}
