#!/bin/bash

LOGFILE="./update_dns.log"

log() {
  local ts
  ts=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$ts] $1" | tee -a "$LOGFILE"
}

TOKEN="$1"
ZONE_ID="$2"
RECORD_ID="$3"
NEW_IP="$4"

if [ -z "$TOKEN" ] || [ -z "$ZONE_ID" ] || [ -z "$RECORD_ID" ]; then
  log "Error: insufficent parameters."
  log "Usage: $0 <API_TOKEN> <ZONE_ID> <RECORD_ID> [NEW_IP]"
  exit 1
fi

if [ -z "$NEW_IP" ]; then
  NEW_IP=$(curl -s https://api.ipify.org)
  if [ -z "$NEW_IP" ]; then
    log "Error: Could not obtain public IP."
    exit 2
  fi
fi

log "Starting DNS update for ZoneID=$ZONE_ID, RecordID=$RECORD_ID with IP=$NEW_IP"

RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.errors[].message')
  log "Error: Could not obtain DNS record. Details: $ERROR_MSG"
  exit 3
fi

RECORD_NAME=$(echo "$RESPONSE" | jq -r '.result.name')
CURRENT_IP=$(echo "$RESPONSE" | jq -r '.result.content')
PROXIED=$(echo "$RESPONSE" | jq -r '.result.proxied')
TTL=$(echo "$RESPONSE" | jq -r '.result.ttl')

if [ "$CURRENT_IP" = "$NEW_IP" ]; then
  log "No update required. Current IP ($CURRENT_IP) is already set."
  exit 0
fi

UPDATE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"$RECORD_NAME\",\"content\":\"$NEW_IP\",\"ttl\":$TTL,\"proxied\":$PROXIED}")

SUCCESS_UPDATE=$(echo "$UPDATE" | jq -r '.success')

if [ "$SUCCESS_UPDATE" = "true" ]; then
  log "DNS record updated successfully: $RECORD_NAME → $NEW_IP"
  exit 0
else
  ERROR_MSG=$(echo "$UPDATE" | jq -r '.errors[].message')
  log "Error: DNS update failed. Details: $ERROR_MSG"
  exit 4
fi
