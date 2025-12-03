# src/core/models.py
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Enum,
    TIMESTAMP,
    ForeignKey,
    Text,
    Integer,
    Numeric,
    DATE,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import declarative_base, relationship
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, BigInteger
from sqlalchemy.sql import func

Base = declarative_base()

class TranslationLexicon(Base):
    __tablename__ = "translation_lexicon"
    __table_args__ = {"schema": "public"}

    id = Column(BigInteger, primary_key=True, index=True)
    original_text = Column(Text, nullable=False)
    original_lang = Column(String(10), nullable=False)
    translations = Column(JSONB, default={})
    usage_count = Column(BigInteger, default=1)
    last_used_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class MessageType(str, Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "public"}

    chat_message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text)
    room_id = Column(UUID(as_uuid=True), ForeignKey("public.rooms.room_id"))
    sender_id = Column(UUID(as_uuid=True), ForeignKey("public.users.user_id"))
    message_type = Column(String(20))
    sent_at = Column(
        TIMESTAMP(timezone=True), default=datetime.utcnow, primary_key=True
    )
    translated_text = Column(Text, nullable=True)
    translated_lang = Column(String(10), nullable=True)


class Users(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True)
    fullname = Column(String(255))
    nickname = Column(String(50))
    avatar_url = Column(String(255))
    native_language_code = Column(
        String(2), ForeignKey("public.languages.language_code")
    )
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    bio = Column(String(255))
    proficiency = Column(String(50))
    last_active_at = Column(TIMESTAMP(timezone=True))

    # Relationships
    languages = relationship("UserLanguages", back_populates="user")
    goals = relationship("UserGoals", back_populates="user")
    interests = relationship("UserInterests", back_populates="user")
    roadmaps = relationship("UserRoadmaps", back_populates="user")
    lesson_progress = relationship("LessonProgress", back_populates="user")


# --- Các bảng liên quan (Nhiều-Nhiều hoặc 1-Nhiều) ---


class Languages(Base):
    __tablename__ = "languages"
    __table_args__ = {"schema": "public"}
    language_code = Column(String(2), primary_key=True)
    language_name = Column(String(50))


class UserLanguages(Base):
    __tablename__ = "user_languages"
    __table_args__ = {"schema": "public"}

    language_code = Column(
        String(2), ForeignKey("public.languages.language_code"), primary_key=True
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("public.users.user_id"), primary_key=True
    )
    proficiency_level = Column(String(50))

    user = relationship("Users", back_populates="languages")
    language = relationship("Languages", foreign_keys=[language_code])


class UserGoals(Base):
    __tablename__ = "user_goals"
    __table_args__ = {"schema": "public"}

    goal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.user_id"))
    goal_type = Column(String(50))
    target_proficiency = Column(String(50))
    target_skill = Column(String(50))
    custom_description = Column(Text)

    user = relationship("Users", back_populates="goals")


class Interests(Base):
    __tablename__ = "interests"
    __table_args__ = {"schema": "public"}

    interest_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interest_name = Column(String(50), unique=True)


class UserInterests(Base):
    __tablename__ = "user_interests"
    __table_args__ = {"schema": "public"}

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("public.users.user_id"), primary_key=True
    )
    interest_id = Column(
        UUID(as_uuid=True), ForeignKey("public.interests.interest_id"), primary_key=True
    )

    user = relationship("Users", back_populates="interests")
    interest = relationship("Interests", foreign_keys=[interest_id])


class Lessons(Base):
    __tablename__ = "lessons"
    __table_args__ = {"schema": "public"}

    lesson_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255))
    skill_types = Column(Text)
    difficulty_level = Column(
        "difficulty_level ", String
    )  # Chú ý tên cột có khoảng trắng


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = {"schema": "public"}

    lesson_id = Column(
        UUID(as_uuid=True), ForeignKey("public.lessons.lesson_id"), primary_key=True
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("public.users.user_id"), primary_key=True
    )
    score = Column(Integer)
    completed_at = Column(TIMESTAMP(timezone=True))
    needs_review = Column(Boolean, default=False)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    user = relationship("Users", back_populates="lesson_progress")
    lesson = relationship("Lessons", foreign_keys=[lesson_id])


class Roadmaps(Base):
    __tablename__ = "roadmaps"
    __table_args__ = {"schema": "public"}

    roadmap_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255))
    language_code = Column(String(10))


class UserRoadmaps(Base):
    __tablename__ = "user_roadmaps"
    __table_args__ = {"schema": "public"}

    user_roadmap_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey("public.roadmaps.roadmap_id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.user_id"))
    status = Column(String(20), default="active")

    user = relationship("Users", back_populates="roadmaps")
    roadmap = relationship("Roadmaps", foreign_keys=[roadmap_id])
