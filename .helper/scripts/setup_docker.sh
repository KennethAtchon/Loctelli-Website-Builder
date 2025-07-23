#!/bin/bash

# Get all container IDs (running or stopped)
CONTAINERS=$(docker ps -aq)

# Stop all running containers
if [ -n "$CONTAINERS" ]; then
  echo "Stopping all containers..."
  docker stop $CONTAINERS

  echo "Removing all containers..."
  docker rm -f $CONTAINERS
else
  echo "No containers to stop or remove."
fi

# Rebuild and start fresh
echo "Starting containers with docker-compose..."
docker-compose up --build
