# ---------- Stage 1: Build ----------
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# ---------- Stage 2: Serve ----------
FROM nginx:alpine

# Copy built frontend to nginx public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 5173 (for consistency with your dev environment)
EXPOSE 5173

# Replace default nginx config to serve app on port 5173
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

