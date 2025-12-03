import argparse
import time
import sys
import psycopg2

def wait_for_db(host, port, timeout):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user="linguauser",
                password="linguapass",
                dbname="linguaviet_db"
            )
            conn.close()
            print("Database is ready!")
            return
        except psycopg2.OperationalError:
            print("Database not ready, waiting...")
            time.sleep(1)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            time.sleep(1)

    print(f"Timed out waiting for database at {host}:{port}")
    sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True)
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--timeout", type=int, default=30)
    args = parser.parse_args()
    wait_for_db(args.host, args.port, args.timeout)