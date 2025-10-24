import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key';

// Mã hóa (encrypt)
export const encryptData = (data) => {
  const str = JSON.stringify(data);
  return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
};

// Giải mã (decrypt)
export const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decrypt failed:', err);
    return null;
  }
};
