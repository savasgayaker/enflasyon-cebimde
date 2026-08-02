import { BACKEND_URL } from '../constants/config';
import { mapM3Response, type M3Response } from './m3Mapper';
import type { ParsedReceipt } from './receiptParser';
import { anonimOturumuGarantile, supabase } from './supabase';

/**
 * Sunucuya gönderilecek erişim jetonu.
 *
 * `getSession()` süresi dolmuş jetonu kendisi tazeler (istemci
 * `autoRefreshToken: true` ile kuruldu); bu yüzden burada ayrıca yenileme
 * mantığı yok. Oturum hiç yoksa anonim oturum açılır — kullanıcıdan hiçbir şey
 * istenmeden, K2'deki söz gereği.
 *
 * Hata yönetimi: `anonimOturumuGarantile()` ağ kopukluğunda Supabase'in kendi
 * hatasını fırlatır ve bu mesaj İNGİLİZCEDİR ("Network request failed" gibi).
 * scan.tsx yakaladığı hatanın `message` alanını doğrudan Alert'te gösterdiği
 * için, o mesaj kullanıcının karşısına çıkardı. Bu yüzden teknik sebep yalnızca
 * geliştirici konsoluna yazılır, kullanıcıya her durumda Türkçe tek bir cümle
 * gider.
 */
async function erisimJetonu(): Promise<string> {
  try {
    await anonimOturumuGarantile();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) throw new Error('oturum bulunamadi');
    return data.session.access_token;
  } catch (err) {
    console.warn('erisim jetonu alinamadi:', err);
    throw new Error(
      'Oturum açılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
    );
  }
}

/**
 * Fiş fotoğrafını backend'deki MiniMax M3 vision proxy'sine yükler ve
 * ParsedReceipt döner. Eski `extractTextFromImage` + `parseReceipt`
 * zincirinin yerini alır (karar kaydı: m3-test/results/RAPOR.md).
 *
 * Yanıt → ParsedReceipt eşlemesi `mapM3Response`'ta (saf, birim testli);
 * bu dosya yalnızca ağ katmanı.
 *
 * @param imageUri Yerel fotoğraf URI'si (kamera veya galeri çıktısı).
 * @throws Ağ hatası, backend hatası veya geçersiz yanıt durumunda
 *   Türkçe mesajlı Error fırlatır; çağıran taraf Alert ile gösterir.
 */
export async function parseReceiptViaM3(imageUri: string): Promise<ParsedReceipt> {
  const token = await erisimJetonu();

  const form = new FormData();
  // React Native'in FormData'sı {uri, name, type} nesnesini dosya olarak yükler.
  form.append('image', {
    uri: imageUri,
    name: 'receipt.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  let response: Response;
  try {
    // Content-Type BİLEREK yazılmıyor: çok parçalı gövdenin sınır (boundary)
    // değerini fetch kendisi üretir; elle yazılırsa istek bozulur.
    response = await fetch(`${BACKEND_URL}/api/parse-receipt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new Error(
      'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
    );
  }

  if (response.status === 401) {
    throw new Error(
      'Oturumunuz doğrulanamadı. Uygulamayı kapatıp yeniden açmayı deneyin.',
    );
  }

  if (response.status === 429) {
    throw new Error(
      'Çok fazla fiş gönderildi. Lütfen bir süre sonra tekrar deneyin.',
    );
  }

  if (!response.ok) {
    let detail = 'Fiş okunamadı, lütfen tekrar deneyin.';
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      // gövde JSON değilse varsayılan mesaj kalır
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as M3Response;
  return mapM3Response(data);
}
