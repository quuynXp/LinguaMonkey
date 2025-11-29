#!/bin/bash

set -e

echo "-> Chay Maven de sinh code Protobuf/compile..."

./mvnw clean compile

echo "-> Sinh code/compile hoan tat. Khoi dong ung dung..."

# 2. Khởi động ứng dụng Spring Boot
exec ./mvnw spring-boot:run