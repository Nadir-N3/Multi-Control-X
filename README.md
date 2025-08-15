# 🤖 Multi‑Control‑X

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-21.x-40B5A4?logo=puppeteer&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Linux%20%7C%20Windows%20%7C%20macOS-0ea5e9)
![License](https://img.shields.io/badge/License-MIT-22c55e)

> **Multi‑Control‑X** is a multi‑account automation bot for **X (Twitter)** using **Node.js + Puppeteer**.
> This README follows **your repo’s actual structure** exactly as in the ZIP:
> entry script is **`main.js`**, config file **`konfiguration.json`** at repo root, cookies folder **`X/`**,
> and **targets** files at repo root (`like.txt`, `retweet.txt`, `follow.txt`, `unfollow.txt`, `tweets.txt`, `replies.txt`).

---

## 📁 Repository Layout
```
Twet/
├─ main.js                 # ← entry point
├─ konfiguration.json      # ← main config (booleans for each action, delays, etc.)
├─ X/                      # ← put cookies JSON files here (one per account)  [create if missing]
├─ like.txt                # list of tweet URLs to Like
├─ retweet.txt             # list of tweet URLs to Retweet
├─ follow.txt              # list of @usernames (or profile URLs) to Follow
├─ unfollow.txt            # list of @usernames (or profile URLs) to Unfollow
├─ tweets.txt              # each line = a new Tweet
├─ replies.txt             # each line: <tweetURL>|<your reply text>
├─ .env.example            # optional env vars (proxy etc.)
├─ package.json            # deps: puppeteer ^21.6.1, chalk ^5.3.0
├─ config/
│  ├─ konfiguration.example.json
│  └─ targets.sample.json
├─ scripts/                # helper scripts (seed, run, healthcheck, etc.)
└─ systemd/                # service template
```

---

## ✨ Features
- 🔁 **Multi‑account** via cookies (no password needed)
- ❤️ **Like**, 🔁 **Retweet**, ➕ **Follow**, ➖ **Unfollow**, 🗣 **Reply**, 📝 **Tweet**
- 🎯 **Per‑account limit** (`perAccount`) and cool‑down between accounts
- ⏱ **Random delays** (`delayMin`–`delayMax`) to mimic human behavior
- 📱 **Emulate mobile** UI option & custom `userAgent`
- 🧰 **Auto‑create** missing target files (if enabled)
- 🛡 **Retry** on failures (`maxRetries`)

---

## 📦 Requirements
- **Node.js 18+** (20+ recommended)
- Storage space for Puppeteer’s Chromium download (or point to system Chrome manually)
- Cookies JSON per account

Install deps:
```bash
npm i
# (uses package.json with puppeteer ^21.6.1 / chalk ^5.3.0)
```

> On **Termux**:
> ```bash
> pkg update -y && pkg upgrade -y
> pkg install nodejs-lts git -y
> ```

---

## ⚙️ Configuration — `konfiguration.json` (root)
Minimal example (taken from your repo & extended with comments):
```jsonc
{
  "like": false,               // enable Like action
  "retweet": false,            // enable Retweet action
  "follow": false,             // enable Follow action
  "unfollow": false,           // enable Unfollow action
  "tweet": true,               // enable Tweet (post) action
  "reply": false,              // enable Reply action

  "delayMin": 8,               // seconds (min delay between actions)
  "delayMax": 18,              // seconds (max delay between actions)
  "cooldownBetweenAccounts": 15, // seconds, wait before switching account
  "perAccount": 5,             // how many targets per account per run

  "emulateMobile": true,       // use mobile layout
  "userAgent": "",             // optional custom UA (leave empty to auto)

  "autoCreateTargetFiles": true, // create missing target files automatically
  "maxRetries": 3              // retry count per action
}
```

> Sample configs also exist: `config/konfiguration.example.json` and `config/targets.sample.json`.

---

## 🍪 Cookies — folder `X/`
Export cookies for each X account (domain `x.com`), then save as one JSON file per account inside `X/` folder, e.g.:
```
X/
 ├─ account1.cookies.json
 ├─ account2.cookies.json
 └─ ...
```
Example cookie entry (simplified):
```json
[
  { "domain": ".x.com", "name": "auth_token", "value": "AAAA", "path": "/", "httpOnly": true, "secure": true },
  { "domain": ".x.com", "name": "ct0",        "value": "BBBB", "path": "/", "httpOnly": true, "secure": true }
]
```
> Use a browser extension like **Cookie‑Editor** to export cookies while logged in to X.

---

## 🎯 Targets Files (root)
Put targets at repo root (already present in your ZIP):

- **`like.txt`** — list of Tweet URLs to like  
- **`retweet.txt`** — list of Tweet URLs to retweet  
- **`follow.txt`** — lines of `@username` **or** profile URLs  
- **`unfollow.txt`** — lines of `@username` **or** profile URLs  
- **`tweets.txt`** — each line becomes a new tweet  
- **`replies.txt`** — format: `https://x.com/user/status/1234567890|Your reply text here`

Examples:
```
like.txt
https://x.com/someuser/status/1234567890123456789
https://x.com/another/status/9876543210987654321
```
```
follow.txt
someuser
@another_user
https://x.com/thirdUser
```
```
replies.txt
https://x.com/some/status/123|Nice post! 🔥
```

---

## ▶️ Run

### Normal run
```bash
node bot.js
```
- The bot will read `konfiguration.json`
- Load all accounts from `X/*.cookies.json`
- Consume the corresponding *targets file* for each enabled action
- Apply random delays and `perAccount` limit

### Tips
- To **test safely**, set all actions to `false` first, then enable one by one.
- Keep `perAccount` small on new accounts; increase gradually.
- Increase `delayMin`/`delayMax` if you hit rate‑limits.

---

## 🧯 Troubleshooting
- **Chromium download too large**: set `PUPPETEER_SKIP_DOWNLOAD=1` and configure `executablePath` inside `bot.js` to a system Chrome/Chromium.
- **Login failed / cookies invalid**: re‑export cookies while logged in to `x.com`; ensure `auth_token` & `ct0` exist.
- **Selectors broke after X UI update**: update the CSS/XPath selectors in `bot.js` where actions are performed.
- **File not found**: if `autoCreateTargetFiles` is `false`, create empty `*.txt` files at repo root.

---

## 🛡️ ToS & Ethics
Automating actions on X can violate terms. Use responsibly, at your own risk. The author is not responsible for bans or restrictions.

---

## 📝 License
MIT
```
Hello world from Multi-Control-X 🚀
Another awesome day to build!
```

---

## ▶️ Run

### Termux (Android)
```bash
pkg update -y && pkg upgrade -y
pkg install nodejs-lts git -y

# (Optional) install chromium for puppeteer (some devices need libc extras)
# Puppeteer can download its own Chromium, but storage may be large.
# If storage is limited, set PUPPETEER_SKIP_DOWNLOAD=1 and use headful Chrome via termux-x11 (advanced).

# in repo:
npm i
node bot.js
```

### Linux / macOS / Windows (PowerShell)
```bash
npm i
node bot.js
```

**Pick action at runtime (if your script prompts), or set `action` in `konfiguration.json`.**

You can also run with a different config:
```bash
node bot.js --config config/konfiguration.like.json
```

---

## 🧠 How it works (high level)
- Loads **all cookie files** in `config/cookies/*.json` → each represents 1 account
- Launches Chrome/Chromium with Puppeteer (`headless` per config)
- Injects cookies → refresh → checks login state
- For each target item → navigates to page → performs action → waits random delay (`min`‑`max`)
- Logs success/fail per account and target

---

## 🛡️ Tips & Anti‑ban Hygiene
- **Randomize delays** (`min`/`max`) and keep `concurrency` low (1‑2)  
- Avoid looping the same action on hundreds of targets in one run  
- Mix actions (like, retweet, follow) and pause between runs  
- Prefer **headful** (headless=false) occasionally for realism  
- Rotate accounts/devices if necessary

---

## ❗ Legal & ToS
This tool **automates** interactions on X. Use responsibly and at your own risk.  
Ensure compliance with X’s **Terms of Service**. The authors are **not responsible** for account actions or bans.

---

## 🧯 Troubleshooting
- **Puppeteer can’t find Chromium / download too big** → set env `PUPPETEER_SKIP_DOWNLOAD=1` then install system Chrome/Chromium and set `executablePath` in your `bot.js`.
- **Login fails** → refresh cookies; ensure domain is `.x.com` and `auth_token` + `ct0` exist.
- **Selectors changed** → X UI updates often; update the CSS/XPath selectors in `bot.js`.
- **Rate limited** → increase delays, reduce concurrency, and try again later.

---

## 📜 License
MIT — feel free to fork, modify, and share with attribution.

---

## 🤝 Credits
Built by **Nadir‑N3**. Reach me on  
[![X](https://img.shields.io/badge/X-@Naadiir__08-black?logo=x)](https://x.com/Naadiir_08)
[![Instagram](https://img.shields.io/badge/Instagram-__naadiir.fx-E4405F?logo=instagram&logoColor=white)](https://instagram.com/__naadiir.fx)
