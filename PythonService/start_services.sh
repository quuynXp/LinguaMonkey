#!/bin/bash

# Bật chế độ log lỗi
set -e

echo "Starting Python Service..."

# 1. Chạy gRPC Server ở background (&)
# Lưu ý: Cần đảm bảo file chạy gRPC server là đúng đường dẫn. 
# Giả sử bạn có file grpc_server.py hoặc tương tự. 
# Nếu logic gRPC nằm chung main.py thì bạn cần tách hoặc dùng multiprocessing trong python.
# Dựa trên log cũ "Starting gRPC Server...", tôi đoán bạn có logic này.
# Tạm thời tôi dùng giả định bạn có file chạy gRPC riêng hoặc tham số riêng.
# NẾU BẠN CHẠY CHUNG TRONG MAIN.PY thì không cần dòng dưới, nhưng code main.py phải handle cả 2.
# Tuy nhiên, thường microservice tách ra:

# Nếu bạn chưa có file riêng, tôi sẽ start file main.py (FastAPI) vì Render cần HTTP port 10000
# và main.py của bạn đang chạy uvicorn trên port đó.

# Logic gRPC Server của bạn đang nằm ở đâu? 
# Dựa vào file main.py bạn gửi, nó KHÔNG có code `Starting gRPC Server`.
# Code đó chắc chắn nằm ở file khác hoặc thread khác mà start_services.sh cũ gọi.
# Tôi sẽ giả định bạn có file `src/grpc_server.py` hoặc tương tự.
# Nếu không, hãy chạy dòng dưới đây để start gRPC (Background):
python -m src.grpc_server & 
PID_GRPC=$!
echo "gRPC Server started with PID $PID_GRPC on port 50051"

# 2. Chạy FastAPI Server ở foreground (Blocking) để giữ container sống
# Port 10000 (được set bởi Render qua biến $PORT)
echo "Starting FastAPI Server on port $PORT..."
python PythonService/src/main.py

# Nếu main.py dừng, script sẽ kết thúc và container sẽ restart