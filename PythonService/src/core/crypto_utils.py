import base64
import os
import logging
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

class AESUtils:
    @staticmethod
    def encrypt(content: str, base64_key: str) -> str:
        try:
            if not content: return None
            key = base64.b64decode(base64_key)
            iv = os.urandom(16)
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            encryptor = cipher.encryptor()
            
            padder = padding.PKCS7(128).padder()
            padded_data = padder.update(content.encode('utf-8')) + padder.finalize()
            
            ciphertext = encryptor.update(padded_data) + encryptor.finalize()
            
            combined = iv + ciphertext
            return base64.b64encode(combined).decode('utf-8')
        except Exception as e:
            logger.error(f"AES Encrypt Error: {e}")
            return None

    @staticmethod
    def decrypt(base64_content: str, base64_key: str) -> str:
        try:
            if not base64_content or not base64_key: return None
            
            data = base64.b64decode(base64_content)
            key = base64.b64decode(base64_key)
            
            if len(data) < 16: return None
            
            iv = data[:16]
            ciphertext = data[16:]
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            
            padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            unpadder = padding.PKCS7(128).unpadder()
            plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
            
            return plaintext.decode('utf-8')
        except Exception as e:
            logger.error(f"AES Decrypt Error: {e}")
            return None

aes_utils = AESUtils()