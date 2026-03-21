#!/bin/bash
if [ -f .env ]; then export $(grep -v '^#' .env | xargs); fi
if [ -z "$VPS_PASSWORD" ]; then read -s -p "Enter VPS Password: " VPS_PASSWORD; echo ""; fi
VPS="root@${VPS_HOST:-74.208.171.40}"
MSG="${1:-Auto deploy $(date '+%Y-%m-%d %H:%M')}"
git add -A && git commit -m "$MSG" 2>/dev/null || true
git push origin main || { echo "GitHub push failed!"; exit 1; }
sshpass -p "$VPS_PASSWORD" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" ./ "$VPS:/var/www/alexpavsky.com/html/" --exclude='.git' --exclude='.env' --exclude='deploy-all.sh' --exclude='node_modules'
[ $? -eq 0 ] && echo "Done! https://alexpavsky.com" || echo "Failed."
