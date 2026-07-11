import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'Le fichier est trop lourd (max 2Mo).';
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format de fichier non supporté (PNG, JPG, GIF).';
  }
  return null;
}

export async function uploadImage(
  file: File,
  bucketName = 'uploads',
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileExt = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error("Impossible de récupérer l'URL publique.");
  }

  return urlData.publicUrl;
}
