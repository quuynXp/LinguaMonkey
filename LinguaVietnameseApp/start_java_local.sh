#!/bin/bash

set -e

echo "-> Chay Maven de Package/sinh JAR executable..."

# 1. Chạy package để tạo JAR executable (bao gồm tất cả dependencies)
./mvnw clean package -DskipTests

echo "-> Package hoan tat. Khoi dong ung dung bang JAR..."

# 2. Tìm JAR vừa được repackage và chạy
JAR_FILE=$(find target -name '*.jar' -not -name '*-sources.jar' | head -n 1)

if [ -z "$JAR_FILE" ]; then
    echo "ERROR: Khong tim thay JAR file trong thu muc target."
    exit 1
fi

echo "-> Khoi dong: $JAR_FILE"

# 3. Khởi động ứng dụng bằng java -jar
exec java -jar $JAR_FILE