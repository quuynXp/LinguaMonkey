# # translate_service.py (grpc server using grpcio)
# import grpc
# from concurrent import futures
# import translate_pb2_grpc, translate_pb2

# class TranslateServiceServicer(translate_pb2_grpc.TranslateServiceServicer):
#     def Translate(self, request, context):
#         # call your model or external API (google/azure/opennmt)
#         translated = your_translate(request.text, request.target_lang)
#         return translate_pb2.TranslateResponse(translated_text=translated, provider="local", cost=0.0)

# def serve():
#     server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
#     translate_pb2_grpc.add_TranslateServiceServicer_to_server(TranslateServiceServicer(), server)
#     server.add_insecure_port('[::]:50051')
#     server.start()
#     server.wait_for_termination()

# if __name__ == '__main__':
#     serve()
