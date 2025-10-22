import grpc
import learning_service_pb2
import learning_service_pb2_grpc

def test_grpc():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = learning_service_pb2_grpc.LearningServiceStub(channel)
        # Add a valid JWT token
        metadata = [('authorization', 'Bearer your_jwt_token_here')]

        # Test GeneratePassage
        response = stub.GeneratePassage(
            learning_service_pb2.GeneratePassageRequest(user_id="user_uuid", language="vi"),
            metadata=metadata
        )
        print("GeneratePassage:", response.passage, response.error)

        # Test GenerateText
        response = stub.GenerateText(
            learning_service_pb2.GenerateTextRequest(user_id="user_uuid", language="vi"),
            metadata=metadata
        )
        print("GenerateText:", response.text, response.error)

        # Test CheckTranslation
        response = stub.CheckTranslation(
            learning_service_pb2.CheckTranslationRequest(
                reference_text="Hello world",
                translated_text="Xin chào thế giới",
                target_language="vi"
            ),
            metadata=metadata
        )
        print("CheckTranslation:", response.feedback, response.score, response.error)

if __name__ == '__main__':
    test_grpc()