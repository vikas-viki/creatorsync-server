#!/bin/sh
set -e

SERVICE="${SERVICE:-$1}"

if [ -z "$SERVICE" ]; then
    echo "No service name specified"
    exit 1
fi

echo "Starting service: $SERVICE"

case "$SERVICE" in 
    media-service)
        exec node dist/apps/media-service/src/main.js
        ;;
    server)
        exec node dist/apps/server/src/main.js
        ;;
    *) 
        echo "Unknown service provided"
        exit 1
        ;;
esac
