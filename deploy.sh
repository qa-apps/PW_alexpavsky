#!/bin/bash
if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi
if [ -z "$VPS_PASSWORD" ]; then read -s -p "Enter VPS Password: " VPS_PASSWORD; echo ""; fi
VPS="root@${VPS_HOST:-74.208.171.40}"
echo "Deploying to alexpavsky.com..."
sshpass -p "$VPS_PASSWORD" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" ./ "$VPS:/var/www/alexpavsky.com/html/" --exclude='.git' --exclude='.env' --exclude='deploy.sh' --exclude='node_modules'
[ $? -eq 0 ] && echo "Done! https://alexpavsky.com" || echo "Failed."
