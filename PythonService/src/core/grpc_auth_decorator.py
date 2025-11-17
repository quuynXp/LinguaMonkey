import grpc
import logging
from functools import wraps

from .. import learning_service_pb2 as learning_pb2

def authenticated_grpc_method(func):
    """
    Một decorator để tự động xác thực token cho các phương thức gRPC.
    Nó giả định hàm được bọc (wrapped) là một phương thức của class
    Servicer (có 'self') và có 'context' là tham số thứ ba.
    
    Nó sẽ inject 'claims' (nội dung token) vào làm kwarg cho hàm.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        servicer_instance = args[0]
        context = args[2]
        
        try:
            claims = servicer_instance._verify_token(context)
            
            if claims is None:
                return func.__annotations__.get('return')()
            
            kwargs['claims'] = claims
            
            return await func(*args, **kwargs)
        
        except Exception as e:
            logging.error(f"Lỗi không mong muốn trong gRPC auth decorator: {e}", exc_info=True)
            context.abort(grpc.StatusCode.INTERNAL, "Lỗi server nội bộ trong quá trình xác thực")
            return func.__annotations__.get('return')()

    return wrapper