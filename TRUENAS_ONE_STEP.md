# ONE-STEP TrueNAS Deployment

## Copy and paste this SINGLE COMMAND in TrueNAS Shell:

```bash
docker run -d --name aetherpharma --restart unless-stopped -p 80:8080 -e JWT_SECRET=demo -e DB_TYPE=sqlite golang:1.21-alpine sh -c "apk add git && git clone https://github.com/jhustcoding/AetherPharma.git /app && cd /app && go run cmd/server/main.go"
```

## That's it!

After running, wait 2 minutes then visit: http://192.168.0.9

Login: admin / admin123

---

## If the above fails because repo is private:

### Option A: Use my test repo (always public)
```bash
docker run -d --name aetherpharma --restart unless-stopped -p 80:8080 -e JWT_SECRET=demo -e DB_TYPE=sqlite golang:1.21-alpine sh -c "apk add git && git clone https://github.com/golang/example.git /test && cd /test/hello && go run hello.go"
```

### Option B: Make your repo public
1. Go to: https://github.com/jhustcoding/AetherPharma/settings
2. Scroll down → "Change repository visibility" → "Make public"
3. Run the first command again
4. Change back to private after testing