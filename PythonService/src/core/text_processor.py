import re

FILLER_WORDS = {
    'vi': {'à', 'ờ', 'ừ', 'kiểu', 'kiểu như', 'thì', 'là', 'um', 'hả', 'nhỉ', 'nhé', 'đấy', 'rồi'},
    'en': {'um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'actually', 'basically', 'literally', 'ah', 'er'},
    'zh': {'那个', '呃', '嗯', '就是', '这个', '啊', '那个', '哎'},
    'ja': {'あの', 'えっと', 'うーん', 'なんか', 'まあ', 'えー', 'その'}
}

class TextProcessor:
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Chuẩn hóa text cơ bản: trim, bỏ khoảng trắng thừa.
        """
        if not text:
            return ""
        return re.sub(r'\s+', ' ', text).strip()

    @staticmethod
    def is_filler_only(text: str, lang: str = 'vi') -> bool:
        """
        Kiểm tra xem câu nói có phải chỉ toàn từ đệm không.
        Ví dụ: "À ừ..." -> True
        """
        if not text:
            return True
            
        lang_code = lang.split('-')[0].lower()
        fillers = FILLER_WORDS.get(lang_code, set())
        
        clean_text = re.sub(r'[^\w\s]', '', text.lower())
        words = clean_text.split()
        
        if not words:
            return True
            
        is_all_filler = all(word in fillers for word in words)
        return is_all_filler

    @staticmethod
    def simplify_filler_display(text: str, lang: str = 'vi') -> str:
        """
        Nếu là filler words, trả về "..." để UI hiển thị gọn.
        Nếu không, trả về text gốc.
        """
        if TextProcessor.is_filler_only(text, lang):
            return "..."
        return text

text_processor = TextProcessor()