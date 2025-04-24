#!/usr/bin/env bash
set -e

# 1. Crée les répertoires nécessaires
mkdir -p certs/ca

# 2. Génération de la CA
echo "1️⃣ Génération de la CA"
openssl genrsa -out certs/ca/ca.key 4096
openssl req -x509 -new -nodes \
  -key certs/ca/ca.key \
  -sha256 -days 3650 \
  -out certs/ca/ca.crt \
  -subj "/CN=Local-CA"

# 3. Certificat pour nginx-exporter (via exporter-proxy)
echo "2️⃣ Certificat serveur pour nginx-exporter"
openssl genrsa -out Backend/monitoring/nginx-exporter/certs/exporter.key 2048
openssl req -new \
  -key Backend/monitoring/nginx-exporter/certs/exporter.key \
  -out Backend/monitoring/nginx-exporter/certs/exporter.csr \
  -subj "/CN=exporter-proxy"

cat > Backend/monitoring/nginx-exporter/certs/san-ext-exporter.cnf <<EOF
subjectAltName = DNS:exporter-proxy, DNS:nginx-exporter, DNS:localhost, IP:127.0.0.1, IP:::1
EOF

openssl x509 -req \
  -in Backend/monitoring/nginx-exporter/certs/exporter.csr \
  -CA certs/ca/ca.crt \
  -CAkey certs/ca/ca.key \
  -CAcreateserial \
  -out Backend/monitoring/nginx-exporter/certs/exporter.crt \
  -days 365 \
  -sha256 \
  -extfile Backend/monitoring/nginx-exporter/certs/san-ext-exporter.cnf

# 4. Certificat pour Prometheus
echo "3️⃣ Certificat serveur pour Prometheus"
openssl genrsa -out Backend/monitoring/Prometheus/certs/prometheus.key 2048
openssl req -new \
  -key Backend/monitoring/Prometheus/certs/prometheus.key \
  -out Backend/monitoring/Prometheus/certs/prometheus.csr \
  -subj "/CN=prometheus"

cat > Backend/monitoring/Prometheus/certs/san-ext-prometheus.cnf <<EOF
subjectAltName = DNS:prometheus, DNS:localhost, IP:127.0.0.1, IP:::1
EOF

openssl x509 -req \
  -in Backend/monitoring/Prometheus/certs/prometheus.csr \
  -CA certs/ca/ca.crt \
  -CAkey certs/ca/ca.key \
  -CAcreateserial \
  -out Backend/monitoring/Prometheus/certs/prometheus.crt \
  -days 365 \
  -sha256 \
  -extfile Backend/monitoring/Prometheus/certs/san-ext-prometheus.cnf

# 5. Certificat pour Grafana
echo "4️⃣ Certificat serveur pour Grafana"
openssl genrsa -out Backend/monitoring/Grafana/certs/grafana.key 2048
openssl req -new \
  -key Backend/monitoring/Grafana/certs/grafana.key \
  -out Backend/monitoring/Grafana/certs/grafana.csr \
  -subj "/CN=grafana"

cat > Backend/monitoring/Grafana/certs/san-ext-grafana.cnf <<EOF
subjectAltName = DNS:grafana, DNS:localhost, IP:127.0.0.1, IP:::1
EOF

openssl x509 -req \
  -in Backend/monitoring/Grafana/certs/grafana.csr \
  -CA certs/ca/ca.crt \
  -CAkey certs/ca/ca.key \
  -CAcreateserial \
  -out Backend/monitoring/Grafana/certs/grafana.crt \
  -days 365 \
  -sha256 \
  -extfile Backend/monitoring/Grafana/certs/san-ext-grafana.cnf

echo "✅ Tous les certificats ont été générés sous Backend/monitoring/*/certs et la CA dans certs/ca/"