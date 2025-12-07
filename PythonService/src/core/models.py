import uuid
import enum
from datetime import datetime

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
    BigInteger,
    Float,
    PrimaryKeyConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

# --- ENUMS ---

class RoomPurpose(str, enum.Enum):
    QUIZ_TEAM = "QUIZ_TEAM"
    CALL = "CALL"
    PRIVATE_CHAT = "PRIVATE_CHAT"
    GROUP_CHAT = "GROUP_CHAT"
    AI_CHAT = "AI_CHAT"
    COURSE_CHAT = "COURSE_CHAT"

class RoomStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CLOSED = "CLOSED"

class RoomType(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    GROUP = "GROUP"

class RoomTopic(str, enum.Enum):
    WORLD = "WORLD"
    VN = "VN"
    EN_LEARNING = "EN_LEARNING"

class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"

# --- CORE TABLES ---

class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = {"schema": "public"}

    room_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_name = Column(String(255), nullable=False)
    course_id = Column(UUID(as_uuid=True), nullable=True)
    creator_id = Column(UUID(as_uuid=True), nullable=True)
    max_members = Column(Integer, nullable=False, default=2)

    purpose = Column(String(50), nullable=True)
    topic = Column(String(50), nullable=True)
    room_type = Column(String(50), nullable=False, default="PRIVATE")
    status = Column(String(50), nullable=False, default="ACTIVE")

    room_code = Column(String(6), unique=True, nullable=True)
    password = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)


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

    languages = relationship("UserLanguages", back_populates="user")
    goals = relationship("UserGoals", back_populates="user")
    interests = relationship("UserInterests", back_populates="user")
    roadmaps = relationship("UserRoadmaps", back_populates="user")
    lesson_progress = relationship("LessonProgress", back_populates="user")


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
    difficulty_level = Column("difficulty_level ", String)


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
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "roadmap_id"),
        {"schema": "public"}
    )
    
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey("public.roadmaps.roadmap_id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.user_id"), primary_key=True)
    
    current_level = Column(Integer)
    target_level = Column(Integer)
    target_proficiency = Column(String(50))
    estimated_completion_time = Column(Integer)
    completed_items = Column(Integer) 
    status = Column(String(20), default="active")
    is_public = Column(Boolean, default=False, nullable=False)
    language = Column(String(50))

    user = relationship("Users", back_populates="roadmaps")
    roadmap = relationship("Roadmaps", foreign_keys=[roadmap_id])


# --- COURSE & ENROLLMENT TABLES ---

class Course(Base):
    __tablename__ = "courses"
    __table_args__ = {"schema": "public"}

    course_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    approval_status = Column(String, default="PENDING")
    is_admin_created = Column(Boolean, default=False)

    versions = relationship("CourseVersion", back_populates="course")


class CourseVersion(Base):
    __tablename__ = "course_versions"
    __table_args__ = {"schema": "public"}

    version_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("public.courses.course_id"), nullable=False)
    title = Column(String, nullable=False)
    difficulty_level = Column(String)
    status = Column(String)

    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted = Column(Boolean, default=False)

    course = relationship("Course", back_populates="versions")
    enrollments = relationship(
        "CourseVersionEnrollment", back_populates="course_version"
    )


class CourseVersionEnrollment(Base):
    __tablename__ = "course_version_enrollments"
    __table_args__ = {"schema": "public"}

    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.user_id"), nullable=False) 
    course_version_id = Column(
        UUID(as_uuid=True), ForeignKey("public.course_versions.version_id"), nullable=False
    )

    progress = Column(Float, default=0.0)
    status = Column(String)

    enrolled_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    # Đã xóa last_accessed_at vì DB không có

    # Relations
    course_version = relationship("CourseVersion", back_populates="enrollments")
    user = relationship("Users")