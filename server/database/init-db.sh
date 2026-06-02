#!/bin/bash
set -e

echo "Starting Stored Procedure Initialization..."

# The MariaDB image runs this script with the root user and password environment variables available.
# We iterate through the custom procedures folder and execute every .sql file into the library_db.
for f in /custom-init/procedures/*.sql; do
    echo "Loading Stored Procedure: $f"
    mariadb -u root -p"$MARIADB_ROOT_PASSWORD" library_db < "$f"
done

echo "All Stored Procedures loaded successfully!"
