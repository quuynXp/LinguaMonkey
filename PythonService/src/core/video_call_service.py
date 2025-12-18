import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from src.core.models import VideoCall, VideoCallStatus, VideoCallType

logger = logging.getLogger(__name__)

async def start_or_join_call(session: AsyncSession, room_id: str, user_id: str):
    """
    Xử lý khi user join room:
    - Nếu chưa có call -> Tạo mới (ONGOING).
    - Nếu có call (WAITING/ONGOING) -> Return call đó.
    """
    try:
        room_uuid = uuid.UUID(str(room_id))
        user_uuid = uuid.UUID(str(user_id))

        stmt = select(VideoCall).where(
            and_(
                VideoCall.room_id == room_uuid,
                VideoCall.status.in_([
                    VideoCallStatus.WAITING, 
                    VideoCallStatus.ONGOING, 
                    VideoCallStatus.INITIATED
                ])
            )
        ).order_by(VideoCall.start_time.desc()).limit(1)
        
        result = await session.execute(stmt)
        active_call = result.scalar_one_or_none()

        if not active_call:
            logger.info(f"Creating NEW call for room {room_id}")
            new_call = VideoCall(
                video_call_id=uuid.uuid4(),
                room_id=room_uuid,
                caller_id=user_uuid,
                status=VideoCallStatus.ONGOING, # Set ONGOING ngay vì user đã join
                start_time=datetime.utcnow(),
                video_call_type=VideoCallType.GROUP
            )
            session.add(new_call)
            await session.commit()
            await session.refresh(new_call) # Refresh để lấy data mới nhất
            return new_call
        else:
            logger.info(f"Joining EXISTING call {active_call.video_call_id}")
            if active_call.status != VideoCallStatus.ONGOING:
                active_call.status = VideoCallStatus.ONGOING
                if not active_call.start_time:
                    active_call.start_time = datetime.utcnow()
                await session.commit()
                await session.refresh(active_call)
            
            return active_call

    except Exception as e:
        logger.error(f"Error start_or_join_call: {e}")
        await session.rollback() # Rollback nếu lỗi
        return None

async def end_call_if_empty(session: AsyncSession, room_id: str):
    """
    Kết thúc cuộc gọi khi phòng trống.
    Sửa lỗi: Check cả status WAITING và INITIATED để tránh sót call rác.
    """
    try:
        room_uuid = uuid.UUID(str(room_id))
        
        stmt = select(VideoCall).where(
            and_(
                VideoCall.room_id == room_uuid,
                VideoCall.status.in_([
                    VideoCallStatus.ONGOING, 
                    VideoCallStatus.WAITING, 
                    VideoCallStatus.INITIATED
                ])
            )
        )
        result = await session.execute(stmt)
        active_calls = result.scalars().all() # Có thể có nhiều hơn 1 do lỗi logic cũ

        if active_calls:
            for call in active_calls:
                logger.info(f"Ending call {call.video_call_id} in room {room_id}")
                call.status = VideoCallStatus.ENDED
                call.end_time = datetime.utcnow()
            
            await session.commit()
        else:
            logger.info(f"No active call found to end in room {room_id}")
            
    except Exception as e:
        logger.error(f"Error end_call_if_empty: {e}")
        await session.rollback()