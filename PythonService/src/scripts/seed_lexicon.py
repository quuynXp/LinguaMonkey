# # # FILE: src/scripts/seed_lexicon.py

# # import csv
# # import logging
# # import asyncio
# # import os
# # from sqlalchemy import select
# # from sqlalchemy.dialects.postgresql import insert
# # from src.core.session import AsyncSessionLocal
# # from src.core.models import TranslationLexicon
# # from src.worker.tasks import warm_up_redis_task
# # from datetime import datetime, timezone, timedelta
# # from sqlalchemy.sql import func

# # logging.basicConfig(level=logging.INFO)
# # logger = logging.getLogger(__name__)

# # DATA_FILE_PATH = "/app/PythonService/src/data/dictionary.csv"

# # VN_TZ = timezone(timedelta(hours=7))

# # STATIC_TIMESTAMP_NAIVE = datetime.strptime("2025-01-01 00:00:00", "%Y-%m-%d %H:%M:%S")
# # STATIC_TIMESTAMP = STATIC_TIMESTAMP_NAIVE.replace(tzinfo=VN_TZ)

# # async def seed_data():
# #     if not os.path.exists(DATA_FILE_PATH):
# #         logger.error(f"File not found: {DATA_FILE_PATH}")
# #         return

# #     async with AsyncSessionLocal() as session:
# #         batch_size = 5000
# #         batch_data = []
# #         total_inserted = 0

# #         with open(DATA_FILE_PATH, 'r', encoding='utf-8', errors='ignore') as f:
# #             for line in f:
# #                 parts = line.strip().split('\t')
# #                 if len(parts) < 2:
# #                     parts = line.strip().split(',')
                
# #                 if len(parts) >= 2:
                    
# #                     # CỘT GỐC đang chứa cả 'vi' và 'en' (VD: 'a la hán  arhant')
# #                     # Tách từ đầu tiên (ngôn ngữ gốc) và bản dịch còn lại
                    
# #                     # Lấy toàn bộ nội dung cột 0
# #                     full_original_col = parts[0].strip().lower()
                    
# #                     # Tách theo khoảng trắng đầu tiên
# #                     split_on_space = full_original_col.split(' ', 1)

# #                     if len(split_on_space) > 1:
# #                         # Nếu tách thành công (có khoảng trắng)
# #                         original = split_on_space[0].strip()
# #                         # Phần còn lại của cột 0 được thêm vào bản dịch cũ (cột 1)
# #                         translated_from_col_0 = split_on_space[1].strip()
# #                         translated_from_col_1 = parts[1].strip() if len(parts) > 1 else ""
                        
# #                         # Gộp tất cả các phần bản dịch lại
# #                         translated_list = [t for t in [translated_from_col_0, translated_from_col_1] if t]
# #                         translated_text = ', '.join(translated_list)
# #                     else:
# #                         # Nếu cột 0 chỉ chứa từ gốc (không có khoảng trắng)
# #                         original = full_original_col
# #                         translated_text = parts[1].strip() if len(parts) > 1 else ""

# #                     if len(original) > 1 and len(translated_text) > 1:
# #                         batch_data.append({
# #                             "original_text": original,
# #                             "original_lang": "vi",
# #                             "translations": {"en": translated_text},
# #                             "usage_count": 100, 
# #                             "last_used_at": STATIC_TIMESTAMP,
# #                         })

# #                 if len(batch_data) >= batch_size:
# #                     stmt = insert(TranslationLexicon).values(batch_data)
# #                     stmt = stmt.on_conflict_do_nothing(
# #                         index_elements=['original_text', 'original_lang']
# #                     )
# #                     await session.execute(stmt)
# #                     await session.commit()
# #                     total_inserted += len(batch_data)
# #                     logger.info(f"Inserted batch: {total_inserted} words")
# #                     batch_data = []

# #             if batch_data:
# #                 stmt = insert(TranslationLexicon).values(batch_data)
# #                 stmt = stmt.on_conflict_do_nothing(
# #                     index_elements=['original_text', 'original_lang']
# #                 )
# #                 await session.execute(stmt)
# #                 await session.commit()
# #                 total_inserted += len(batch_data)
            
# #             logger.info(f"Seeding complete. Total: {total_inserted} words.")
# #             warm_up_redis_task.delay()

# # if __name__ == "__main__":
# #     asyncio.run(seed_data())
# ## 🛠️ src/scripts/seed_lexicon.py (Cập nhật)

# import logging
# import asyncio
# import os
# from sqlalchemy import select, func # Thêm select và func
# from sqlalchemy.dialects.postgresql import insert
# from src.core.session import AsyncSessionLocal
# from src.core.models import TranslationLexicon
# from src.worker.tasks import warm_up_redis_task
# from datetime import datetime, timezone, timedelta

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # CHỈNH SỬA TÊN FILE NẾU CẦN: Đổi từ dictionary.csv sang dictionary.txt
# DATA_FILE_PATH = "/app/PythonService/src/data/dictionary.txt"

# VN_TZ = timezone(timedelta(hours=7))

# STATIC_TIMESTAMP_NAIVE = datetime.strptime("2025-01-01 00:00:00", "%Y-%m-%d %H:%M:%S")
# STATIC_TIMESTAMP = STATIC_TIMESTAMP_NAIVE.replace(tzinfo=VN_TZ)

# async def seed_data():
#     if not os.path.exists(DATA_FILE_PATH):
#         logger.error(f"File not found: {DATA_FILE_PATH}")
#         return

#     async with AsyncSessionLocal() as session:
#         # 1. KIỂM TRA SỐ LƯỢNG BẢN GHI HIỆN CÓ 
#         try:
#             # Đếm số lượng bản ghi trong bảng TranslationLexicon
#             count_stmt = select(func.count()).select_from(TranslationLexicon)
#             result = await session.execute(count_stmt)
#             count = result.scalar_one()

#             if count > 0:
#                 logger.info(f"Bảng TranslationLexicon đã có {count} bản ghi. Bỏ qua bước Seeding.")
#                 # Vẫn gọi warm_up_redis_task để đảm bảo Redis được làm nóng nếu cần
#                 warm_up_redis_task.delay()
#                 return # Dừng hàm nếu bảng không trống
            
#             logger.info("Bảng TranslationLexicon trống. Bắt đầu Seeding dữ liệu...")

#         except Exception as e:
#             logger.error(f"Lỗi khi kiểm tra bảng: {e}")
#             return # Dừng nếu có lỗi khi kiểm tra

#         # 2. BẮT ĐẦU SEEDING NẾU BẢNG TRỐNG
#         batch_size = 5000
#         batch_data = []
#         total_inserted = 0

#         current_original_text = None
#         current_translations = []

#         with open(DATA_FILE_PATH, 'r', encoding='utf-8', errors='ignore') as f:
#             for line in f:
#                 line = line.strip()
#                 if not line:
#                     continue

#                 if line.startswith('@'):
#                     # Bắt đầu một entry mới, lưu entry cũ nếu có
#                     if current_original_text and current_translations:
#                         translated_text = ', '.join(current_translations)
#                         if len(current_original_text) > 1 and len(translated_text) > 1:
#                             batch_data.append({
#                                 "original_text": current_original_text,
#                                 "original_lang": "vi",
#                                 "translations": {"en": translated_text},
#                                 "usage_count": 100, 
#                                 "last_used_at": STATIC_TIMESTAMP,
#                             })
#                             total_inserted += 1
                        
#                         # Kiểm tra và flush batch nếu cần
#                         if len(batch_data) >= batch_size:
#                             stmt = insert(TranslationLexicon).values(batch_data)
#                             stmt = stmt.on_conflict_do_nothing(
#                                 index_elements=['original_text', 'original_lang']
#                             )
#                             await session.execute(stmt)
#                             await session.commit()
#                             logger.info(f"Inserted batch: {total_inserted} words")
#                             batch_data = []

#                     # Reset và khởi tạo entry mới
#                     current_original_text = line[1:].strip().lower()
#                     current_translations = []

#                 elif current_original_text and line.startswith('-'):
#                     # Thêm bản dịch
#                     translation_line = line[1:].strip()
#                     translation_parts = [t.strip() for t in translation_line.split(',')]
#                     current_translations.extend(translation_parts)

#                 elif current_original_text and line.startswith('='):
#                     # Bỏ qua dòng ví dụ
#                     pass

#                 elif current_original_text and line.startswith('*'):
#                     # Bỏ qua dòng metadata (part-of-speech)
#                     pass

#             # Xử lý entry cuối cùng sau khi hết file
#             if current_original_text and current_translations:
#                 translated_text = ', '.join(current_translations)
#                 if len(current_original_text) > 1 and len(translated_text) > 1:
#                     batch_data.append({
#                         "original_text": current_original_text,
#                         "original_lang": "vi",
#                         "translations": {"en": translated_text},
#                         "usage_count": 100, 
#                         "last_used_at": STATIC_TIMESTAMP,
#                     })
#                     total_inserted += 1

#             # Flush batch cuối cùng
#             if batch_data:
#                 stmt = insert(TranslationLexicon).values(batch_data)
#                 stmt = stmt.on_conflict_do_nothing(
#                     index_elements=['original_text', 'original_lang']
#                 )
#                 await session.execute(stmt)
#                 await session.commit()
            
#             logger.info(f"Seeding complete. Total: {total_inserted} words.")
#             warm_up_redis_task.delay()

# if __name__ == "__main__":
#     asyncio.run(seed_data())