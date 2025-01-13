#!/bin/bash

# Check if the database directory is empty
if [ -z "$(ls -A /usr/src/app/database/database.db 2>/dev/null)" ]; then
  echo "Database folder is empty. Initializing..."
  cp -r /usr/src/app/database-init/* /usr/src/app/database
  rm -rf /usr/src/app/database-init/*
else
  echo "Database folder already initialized."
fi

if [ "$(ls -A /usr/src/app/profile-pictures 2>/dev/null)" = "default2.jpg" ]; then
  echo "profile picture folder contains only default2.jpg. Initializing..."
  cp -r /usr/src/app/profile-pictures-init/* /usr/src/app/profile-pictures
  rm -rf /usr/src/app/profile-pictures-init/*
else
  echo "profile picture folder already initialized or contains additional files."
fi

if [ -z "$(ls -A /usr/src/app/build 2>/dev/null)" ]; then
  echo "Build folder is empty. Initializing..."
  cp -r /usr/src/app/build-init/* /usr/src/app/build
  rm -rf /usr/src/app/build-init/*
else
  echo "Build folder already initialized or contains files."
fi

# Start the application
exec "$@"
