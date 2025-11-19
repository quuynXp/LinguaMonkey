# --- CẤU HÌNH ---
$containerName = "app-database"
$dbUser = "linguauser"
$dbName = "linguaviet_db"
$dbPass = "linguapass"
$backupFolder = "C:\backups"

# Tạo tên file theo ngày giờ để không bị ghi đè
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fileName = "linguaviet_db_$timestamp.dump"
$containerPath = "/tmp/$fileName"
$hostPath = "$backupFolder\$fileName"

# --- BẮT ĐẦU BACKUP ---
Write-Host "Starting backup for $dbName at $timestamp..."

# 1. Tạo file dump BÊN TRONG container (An toàn nhất)
#  Dùng -e để truyền password an toàn
docker exec -e PGPASSWORD=$dbPass $containerName pg_dump -U $dbUser -d $dbName -Fc -f $containerPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dump created inside container successfully."

    docker cp "$containerName`:$containerPath" $hostPath
    
    if (Test-Path $hostPath) {
        Write-Host "Backup saved to: $hostPath"
        
        # 3. Dọn dẹp: Xóa file tạm trong container để tránh đầy ổ cứng container
        docker exec $containerName rm $containerPath
        Write-Host "Temp file inside container deleted."
    } else {
        Write-Error "Failed to copy file to host."
    }
} else {
    Write-Error "pg_dump failed inside container."
}
