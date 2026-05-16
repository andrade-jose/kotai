# Adicionar ao /etc/cloudflared/config.yml (no bloco ingress, ANTES do catch-all 404)
#
# - hostname: kotaitracker.online
#     service: http://localhost:3002
#
# Resultado final do ingress:
#
# ingress:
#   - hostname: docs.robitica-ifsp-campinas.online
#     service: http://localhost:3000
#   - hostname: drive.robitica-ifsp-campinas.online
#     service: http://localhost:8080
#   - hostname: kotaitracker.online
#     service: http://localhost:3002
#   - service: http_status:404
#
# Depois:
#   cloudflared tunnel route dns 77b54aec-592f-4506-9306-a45d2a66d38b kotaitracker.online
#   systemctl restart cloudflared
