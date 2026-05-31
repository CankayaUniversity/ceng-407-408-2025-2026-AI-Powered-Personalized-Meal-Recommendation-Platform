import i18n from '../../i18n';

/**
 * API Key gibi hassas verileri istemci tarafında şifrelemek ve sunucuya göndermek için yardımcı araçlar.
 * AES-GCM algoritmasını kullanır.
 * NOT: Bu anahtarın istemci tarafında bulunması %100 güvenlik sağlamaz ancak yerel depolamadaki 
 * verileri düz metin olmaktan kurtarır.
 */

const ENCRYPTION_KEY = '1234567890123456'; // Backend ile aynı olmalı

/**
 * Metni AES-GCM ile şifreler.
 * @param text Şifrelenecek metin
 * @returns Base64 formatında (IV + Ciphertext)
 */
export async function encryptText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Anahtarı hazırla
  const keyData = encoder.encode(ENCRYPTION_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // IV oluştur (12 byte)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Şifrele
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // IV ve şifreli içeriği birleştir
  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  // Base64'e çevir
  return btoa(String.fromCharCode(...combined));
}

/**
 * Şifrelenmiş metni çözer.
 * @param encryptedBase64 Base64 formatında şifreli veri
 * @returns Orijinal metin
 */
export async function decryptText(encryptedBase64: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Base64'ten çöz
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(char => char.charCodeAt(0))
    );

    // IV'yi ayır (ilk 12 byte)
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Anahtarı hazırla
    const keyData = encoder.encode(ENCRYPTION_KEY);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Şifreyi çöz
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    return decoder.decode(decryptedContent);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(i18n.t('common.encryptionDecryptFailed'));
  }
}
