/**
 * Backend adresi — tek doğruluk noktası.
 *
 * Geliştirmede fiziksel iPhone, Metro'yu çalıştıran Mac'e LAN üzerinden
 * bağlanır; bu yüzden localhost DEĞİL Mac'in yerel IP'si kullanılır.
 * IP'nizi öğrenmek için: `ipconfig getifaddr en1` (Wi-Fi) veya `en0`.
 * Backend'i başlatmak için: `cd backend && uvicorn server:app --host 0.0.0.0`
 *
 * Üretim dağıtımında burası gerçek sunucu adresiyle değiştirilecek
 * (veya EAS ortam değişkenine taşınacak).
 */
export const BACKEND_URL = 'http://192.168.1.26:8000';
