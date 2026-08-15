/**
 * Supabase yazici adaptoru.
 *
 * sunucuYazma modulunun bekledigi Yazici arayuzunu gercek
 * istemciyle karsilar.
 *
 * HATA YUTMAZ: Supabase istemcisi hata atmaz, sonuc nesnesinde
 * bir hata alani dondurur. Bu adaptor onu istisnaya cevirir.
 * Aksi halde gonderilmemis bir fis gonderildi sayilirdi.
 */
import { supabase } from './supabase';
import type { Yazici } from './sunucuYazma';

export const supabaseYazici: Yazici = {
  async upsert(tablo, satirlar) {
    const { error } = await supabase.from(tablo).upsert(satirlar);
    if (error) {
      throw new Error(tablo + ' upsert: ' + error.message);
    }
  },

  async sil(tablo, kullanici, alan, deger) {
    const { error } = await supabase
      .from(tablo)
      .delete()
      .eq('kullanici', kullanici)
      .eq(alan, deger);
    if (error) {
      throw new Error(tablo + ' sil: ' + error.message);
    }
  },
};
