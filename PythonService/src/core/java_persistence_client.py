import os
import grpc.aio
import logging
import uuid
import typing
from src.grpc_generated import learning_service_pb2
from src.grpc_generated import learning_service_pb2_grpc

logger = logging.getLogger(__name__)

JAVA_GRPC_ADDRESS = os.getenv("JAVA_GRPC_ADDRESS", "localhost:9090")

async def send_chat_to_java_via_grpc(payload: dict):
    sender_id_str = payload.get("userId")
    room_id_str = payload.get("roomId")
    
    if sender_id_str == "AI_BOT":
        sender_id_str = "00000000-0000-0000-0000-000000000001" 
    try:
        uuid.UUID(room_id_str)
        uuid.UUID(sender_id_str)
    except Exception:
        logger.error(f"Invalid UUID format for persistence: Room={room_id_str}, Sender={sender_id_str}")
        return
    
    try:
        async with grpc.aio.insecure_channel(JAVA_GRPC_ADDRESS) as channel:
            stub = learning_service_pb2_grpc.PersistenceServiceStub(channel)
            
            request = learning_service_pb2.SaveChatRequest(
                sender_id=sender_id_str,
                room_id=room_id_str,
                content=payload.get("content"),
                message_type=payload.get("messageType", "TEXT"),
                timestamp=payload.get("sentAt", "")
            )
            
            logger.info(f"Sending persistence request to {JAVA_GRPC_ADDRESS}")
            # wait_for_ready=True fixes the startup race condition
            response = await stub.SaveChatMessage(request, wait_for_ready=True)
            
            if not response.success:
                logger.error(f"Java persistence failed: {response.error}")
            else:
                logger.info("Chat message saved via gRPC")
                
    except Exception as e:
        logger.error(f"gRPC Error: {e}")