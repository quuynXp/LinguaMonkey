import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from redis import asyncio as aioredis

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
    CourseVersionEnrollment,
    CourseVersion,
    Course
)

from src.core.cache import get_from_cache, set_to_cache

CACHE_TTL_SECONDS = 3600
CACHE_KEY_PREFIX = "user_profile"

async def _build_user_profile_from_db(user_id: str, db_session: AsyncSession) -> dict:
    logging.info(f"Building comprehensive profile from DB for user: {user_id}")
    try:
        user_query = select(Users).where(Users.user_id == user_id)

        lang_query = (
            select(Languages.language_name, UserLanguages.proficiency_level)
            .join(Languages, UserLanguages.language_code == Languages.language_code)
            .where(UserLanguages.user_id == user_id)
        )

        goals_query = select(
            UserGoals.goal_type,
            UserGoals.target_proficiency,
            UserGoals.custom_description,
        ).where(UserGoals.user_id == user_id)

        interests_query = (
            select(Interests.interest_name)
            .select_from(UserInterests)
            .join(Interests, UserInterests.interest_id == Interests.interest_id)
            .where(UserInterests.user_id == user_id)
        )

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

        roadmap_query = (
            select(Roadmaps.title, Roadmaps.language_code, UserRoadmaps.status, UserRoadmaps.progress)
            .join(Roadmaps, UserRoadmaps.roadmap_id == Roadmaps.roadmap_id)
            .where(UserRoadmaps.user_id == user_id, UserRoadmaps.status == "active")
        )

        course_enrollment_query = (
            select(
                Course.title,
                CourseVersion.difficulty_level,
                CourseVersionEnrollment.progress,
                CourseVersionEnrollment.status,
                CourseVersionEnrollment.last_accessed_at
            )
            .join(CourseVersion, CourseVersionEnrollment.course_version_id == CourseVersion.version_id)
            .join(Course, CourseVersion.course_id == Course.course_id)
            .where(CourseVersionEnrollment.user_id == user_id)
            .order_by(desc(CourseVersionEnrollment.last_accessed_at))
        )

        chat_query = (
            select(ChatMessage.content)
            .where(ChatMessage.sender_id == user_id)
            .order_by(desc(ChatMessage.sent_at))
            .limit(10)
        )

        user_result = await db_session.execute(user_query)
        lang_result = await db_session.execute(lang_query)
        goals_result = await db_session.execute(goals_query)
        interests_result = await db_session.execute(interests_query)
        lessons_result = await db_session.execute(recent_lessons_query)
        roadmap_result = await db_session.execute(roadmap_query)
        enrollment_result = await db_session.execute(course_enrollment_query)
        chat_result = await db_session.execute(chat_query)
        
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
                {"title": row.title, "lang": row.language_code, "status": row.status, "progress": row.progress}
                for row in roadmap_result.all()
            ],
            "course_enrollments": [
                {
                    "title": row.title,
                    "level": row.difficulty_level,
                    "progress": row.progress,
                    "status": row.status,
                }
                for row in enrollment_result.all()
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
    if not user_id:
        return {}

    cache_key = f"{CACHE_KEY_PREFIX}:{user_id}"

    cached_profile = await get_from_cache(redis_client, cache_key)
    if cached_profile:
        return cached_profile

    profile = await _build_user_profile_from_db(user_id, db_session)
    if "error" not in profile:
        await set_to_cache(
            redis_client, cache_key, profile, ttl_seconds=CACHE_TTL_SECONDS
        )
    return profile