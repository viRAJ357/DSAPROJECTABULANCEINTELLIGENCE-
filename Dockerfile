# Multi-stage Dockerfile: Builds React frontend & serves via Flask backend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY smartroute-frontend/package*.json ./
RUN npm install
COPY smartroute-frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

COPY smartroute-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY smartroute-backend/ ./smartroute-backend/
COPY --from=frontend-builder /app/frontend/dist ./smartroute-frontend/dist

EXPOSE 8000

WORKDIR /app/smartroute-backend
CMD ["python", "main.py"]
