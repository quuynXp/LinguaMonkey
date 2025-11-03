# src/core/user_profile_service.py
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, join
from sqlalchemy.orm import selectinload
import aioredis
import asyncio

# Import các model đã định nghĩa
from src.core.models import (
    ChatMessage,
    Users,
    UserLanguages,
    UserGoals,
    Interests,
    UserInterests,
    Lessons,
    LessonProgress,
    Roadmaps,
    UserRoadmaps,
    Languages,
)
from src.core.cache import get_from_cache, set_to_cache

CACHE_TTL_SECONDS = 3600
CACHE_KEY_PREFIX = "user_profile"


async def _build_user_profile_from_db(user_id: str, db_session: AsyncSession) -> dict:
    """
    Tập hợp thông tin người dùng chi tiết từ nhiều bảng trong cơ sở dữ liệu.
    """
    logging.info(
        f"Cache miss. Building comprehensive profile from DB for user: {user_id}"
    )
    try:
        # 1. Truy vấn thông tin cơ bản của User
        user_query = select(Users).where(Users.user_id == user_id)

        # 2. Truy vấn ngôn ngữ đang học (JOIN với bảng Languages để lấy tên)
        lang_query = (
            select(Languages.language_name, UserLanguages.proficiency_level)
            .join(Languages, UserLanguages.language_code == Languages.language_code)
            .where(UserLanguages.user_id == user_id)
        )

        # 3. Truy vấn mục tiêu học tập
        goals_query = select(
            UserGoals.goal_type,
            UserGoals.target_proficiency,
            UserGoals.custom_description,
        ).where(UserGoals.user_id == user_id)

        # 4. Truy vấn sở thích (JOIN với bảng Interests để lấy tên)
        interests_query = (
            select(Interests.interest_name)
            .join(Interests, UserInterests.interest_id == Interests.interest_id)
            .where(UserInterests.user_id == user_id)
        )

        # 5. Truy vấn các bài học gần đây (JOIN với Lessons để lấy tên)
        recent_lessons_query = (
            select(
                Lessons.title,
                LessonProgress.score,
                LessonProgress.needs_review,
                LessonProgress.updated_at,
            )
            .join(Lessons, LessonProgress.lesson_id == Lessons.lesson_id)
            .where(LessonProgress.user_id == user_id)
            .order_by(desc(LessonProgress.updated_at))
            .limit(5)
        )

        # 6. Truy vấn lộ trình học tập (JOIN với Roadmaps)
        roadmap_query = (
            select(Roadmaps.title, Roadmaps.language_code, UserRoadmaps.status)
            .join(Roadmaps, UserRoadmaps.roadmap_id == Roadmaps.roadmap_id)
            .where(UserRoadmaps.user_id == user_id, UserRoadmaps.status == "active")
        )

        # 7. Truy vấn tin nhắn gần đây (như cũ)
        chat_query = (
            select(ChatMessage.content)
            .where(ChatMessage.sender_id == user_id)
            .order_by(desc(ChatMessage.sent_at))
            .limit(10)
        )

        # Thực thi tất cả truy vấn song song
        results = await asyncio.gather(
            db_session.execute(user_query),
            db_session.execute(lang_query),
            db_session.execute(goals_query),
            db_session.execute(interests_query),
            db_session.execute(recent_lessons_query),
            db_session.execute(roadmap_query),
            db_session.execute(chat_query),
        )

        (
            user_result,
            lang_result,
            goals_result,
            interests_result,
            lessons_result,
            roadmap_result,
            chat_result,
        ) = results

        # --- Xử lý kết quả ---
        user_data = user_result.scalar_one_or_none()
        if not user_data:
            return {"error": "User not found"}

        user_profile = {
            "user_id": str(user_data.user_id),
            "nickname": user_data.nickname,
            "level": user_data.level,
            "exp": user_data.exp,
            "streak": user_data.streak,
            "bio": user_data.bio,
            "proficiency": user_data.proficiency,
            "last_active_at": user_data.last_active_at,
            "learning_languages": [
                {"lang": row.language_name, "level": row.proficiency_level}
                for row in lang_result.all()
            ],
            "learning_goals": [
                {
                    "type": row.goal_type,
                    "target": row.target_proficiency,
                    "desc": row.custom_description,
                }
                for row in goals_result.all()
            ],
            "interests": [row.interest_name for row in interests_result.all()],
            "recent_lessons": [
                {
                    "title": row.title,
                    "score": row.score,
                    "needs_review": row.needs_review,
                }
                for row in lessons_result.all()
            ],
            "active_roadmaps": [
                {"title": row.title, "lang": row.language_code, "status": row.status}
                for row in roadmap_result.all()
            ],
            "recent_chat_summary": "; ".join(
                [row.content for row in chat_result.all() if row.content]
            ),
        }

        return user_profile

    except Exception as e:
        logging.error(
            f"Failed to build comprehensive profile from DB for user {user_id}: {e}",
            exc_info=True,
        )
        return {"user_id": user_id, "error": "Failed to load profile"}


async def get_user_profile(
    user_id: str, db_session: AsyncSession, redis_client: aioredis.Redis
) -> dict:
    """
    Cache-aside pattern for fetching a user's aggregated profile.
    """
    if not user_id:
        return {}

    cache_key = f"{CACHE_KEY_PREFIX}:{user_id}"

    # 1. Try to get from cache
    cached_profile = await get_from_cache(redis_client, cache_key)
    if cached_profile:
        logging.debug(f"Cache HIT for user profile: {user_id}")
        return cached_profile

    # 2. Cache MISS: Build from DB
    logging.debug(f"Cache MISS for user profile: {user_id}")
    profile = await _build_user_profile_from_db(user_id, db_session)

    # 3. Set to cache
    if "error" not in profile:
        await set_to_cache(
            redis_client, cache_key, profile, ttl_seconds=CACHE_TTL_SECONDS
        )

    return profile
