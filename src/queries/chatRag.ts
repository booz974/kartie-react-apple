import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDoc,
  listDocs,
  uploadDoc,
  type RagDocument,
} from '@/api/chatRag';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const chatRagKeys = {
  all: ['chat-rag'] as const,
  docs: ['chat-rag', 'docs'] as const,
};

export function useRagDocuments() {
  return useQuery({
    queryKey: chatRagKeys.docs,
    queryFn: listDocs,
    ...queryDefaults,
  });
}

export function useUploadRagDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      fileName: string;
      mimeType: string;
      fileBase64: string;
    }) => uploadDoc(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatRagKeys.docs });
    },
  });
}

export function useDeleteRagDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docId: string | number) => deleteDoc(docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatRagKeys.docs });
    },
  });
}

export type { RagDocument };
