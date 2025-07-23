#!/bin/bash

# Load R2 env vars
# set -a
# source ./project/.env
# set +a

# export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
# export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

# echo "Deleting all objects in R2 bucket: $R2_BUCKET_NAME"
# aws s3 rm s3://$R2_BUCKET_NAME --recursive \
#   --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
#   --no-verify-ssl \
#   --region auto


# Stop all running containers
sleep 1
docker stop $(docker ps -aq)

# Remove all containers
sleep 1
docker rm -f $(docker ps -aq)

# Remove all volumes
sleep 1
docker volume rm -f $(docker volume ls -q)

# Remove all images 
sleep 1
docker rmi -f $(docker images -q)

# Repopagrate docker
sleep 3
docker-compose up --build

