# Build Docker Image
docker build -t stock-price-backend ./ --platform=amd64

# Run Docker Image
docker run -p 4001:4000 --cpus="1" -m 1g --rm  -it  stock-price-backend 