import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from src.core.models import VideoCall, VideoCallStatus, VideoCallType

async def start_or_join_call(session: AsyncSession, room_id: str, user_id: str):
    """
    Khi user join room:
    1. Kiểm tra xem có call nào đang ONGOING hoặc WAITING trong room này không.
    2. Nếu chưa có -> Tạo mới (INITIATED -> ONGOING).
    3. Nếu có -> Giữ nguyên, update metrics hoặc người tham gia nếu cần.
    """
    try:
        room_uuid = uuid.UUID(str(room_id))
        user_uuid = uuid.UUID(str(user_id))

        # Tìm cuộc gọi đang diễn ra gần nhất
        stmt = select(VideoCall).where(
            and_(
                VideoCall.room_id == room_uuid,
                VideoCall.status.in_([VideoCallStatus.WAITING, VideoCallStatus.ONGOING, VideoCallStatus.INITIATED])
            )
        ).order_by(VideoCall.start_time.desc()).limit(1)
        
        result = await session.execute(stmt)
        active_call = result.scalar_one_or_none()

        if not active_call:
            # Tạo cuộc gọi mới
            new_call = VideoCall(
                video_call_id=uuid.uuid4(),
                room_id=room_uuid,
                caller_id=user_uuid, # Người đầu tiên join coi như caller
                status=VideoCallStatus.ONGOING, # Chuyển ngay sang ONGOING khi connect WebSocket
                start_time=datetime.utcnow(),
                video_call_type=VideoCallType.GROUP # Mặc định set Group, logic chi tiết tùy bạn
            )
            session.add(new_call)
            await session.commit()
            return new_call
        else:
            # Nếu đang WAITING/INITIATED thì chuyển sang ONGOING vì đã có người vào signal
            if active_call.status != VideoCallStatus.ONGOING:
                active_call.status = VideoCallStatus.ONGOING
                if not active_call.start_time:
                    active_call.start_time = datetime.utcnow()
                await session.commit()
            return active_call

    except Exception as e:
        print(f"Error starting call: {e}")
        return None

async def end_call_if_empty(session: AsyncSession, room_id: str):
    """
    Được gọi khi WebSocket disconnect.
    Logic: Chúng ta sẽ update trạng thái thành ENDED.
    Lưu ý: Logic kiểm tra "phòng trống" nằm ở ConnectionManager, 
    hàm này chỉ thực hiện việc ghi DB.
    """
    try:
        room_uuid = uuid.UUID(str(room_id))
        
        # Tìm cuộc gọi đang active
        stmt = select(VideoCall).where(
            and_(
                VideoCall.room_id == room_uuid,
                VideoCall.status == VideoCallStatus.ONGOING
            )
        )
        result = await session.execute(stmt)
        active_call = result.scalar_one_or_none()

        if active_call:
            active_call.status = VideoCallStatus.ENDED
            active_call.end_time = datetime.utcnow()
            await session.commit()
            print(f"Call in room {room_id} has ENDED.")
            
    except Exception as e:
        print(f"Error ending call: {e}")