import logging
import inspect
import grpc
from functools import wraps
from src.grpc_generated import learning_service_pb2 as learning_pb2

def authenticated_grpc_method(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        servicer_instance = args[0]
        context = args[2]
        
        try:
            claims = servicer_instance._verify_token(context)
            
            if claims is None:
                return func.__annotations__.get('return')()
            
            kwargs['claims'] = claims
            
            response = func(*args, **kwargs)
            
            if inspect.isasyncgen(response):
                return response
            
            return await response
        
        except Exception as e:
            logging.error(f"Error in gRPC auth decorator: {e}", exc_info=True)
            await context.abort(grpc.StatusCode.INTERNAL, "Internal server error during authentication")
            return func.__annotations__.get('return')()

    return wrapper