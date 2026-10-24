# ClimateCoins Kannada Farmer Voice Assistant

A small React + Express MVP for a farmer-facing Kannada voice assistant powered by OmniDimension's browser voice SDK.

## What this demo does

- Provides a mobile-friendly farmer support page in Kannada.
- Lets a farmer optionally enter their name and farmer reference.
- Creates a short-lived OmniDimension voice session on the backend.
- Uses OmniDimension's browser SDK for microphone audio, agent audio, and live transcript events.
- Shows connection states, transcript, mute and hang-up controls.
- Keeps the reusable OmniDimension API key on the server.

## Important limitations

- This is a voice interface MVP, not a complete ClimateCoins production integration.
- It does not save transcripts or callback cases to a database yet.
- It does not automatically call a farmer's telephone number; the farmer speaks through the website.
- The agent's knowledge, Kannada voice, published version, and account credits must be configured in OmniDimension.
- Do not enter real farmer personal information into a public demo without appropriate consent and access controls.
- Confirm the exact API/SDK requirements in the official docs if OmniDimension changes its interface.

## Requirements

- Node.js 20 or newer recommended.
- An OmniDimension account.
- A published OmniDimension agent with a numeric agent ID.
- A server-side OmniDimension API key.
- Internet access and a browser with microphone support.

Official docs:
- Web SDK: https://docs.omnidim.io/docs/sdks/web
- Create session: https://docs.omnidim.io/docs/api-reference/sessions/createSession
- Web widget alternative: https://docs.omnidim.io/docs/sdks/web-widget

## Setup on Windows 11 / PowerShell

### 1. Extract and enter the project folder

Extract the ZIP, then open the extracted `climatecoins-kannada-voice-assistant` folder in VS Code.

### 2. Create the server environment file

In the VS Code terminal (PowerShell):

```powershell
Copy-Item .\server\.env.example .\server\.env
```

Open `server/.env` and set:

```dotenv
OMNIDIM_API_KEY=your_real_server_side_api_key
OMNIDIM_AGENT_ID=your_numeric_agent_id
PORT=8787
CLIENT_ORIGIN=http://localhost:5173
```

Get the API key from OmniDimension's API management area. Get the agent ID from your agent/dashboard. The agent must be configured and published. Never put the server API key in any file under `client/`.

### 3. Install dependencies

From the project root:

```powershell
npm install
npm --prefix server install
npm --prefix client install
```

### 4. Start both frontend and backend

From the project root:

```powershell
npm run dev
```

Open:

http://localhost:5173

The backend health endpoint is:

http://localhost:8787/api/health

### 5. Test the voice call

1. Open the website in Chrome or Edge.
2. Optionally enter a demo farmer name/reference.
3. Click **ClimateCoins AI ಜೊತೆ ಮಾತನಾಡಿ**.
4. Allow microphone access.
5. Speak to the agent and check that the transcript and agent audio work.
6. Click **ಕರೆ ಮುಗಿಸಿ** to end the session.

Use headphones if audio feedback occurs. Microphone access works on localhost and on deployed HTTPS websites.

## Troubleshooting

### `Voice calling is not configured yet`
Check that `server/.env` exists and both `OMNIDIM_API_KEY` and `OMNIDIM_AGENT_ID` are filled in. Restart `npm run dev` after changing environment variables.

### API key rejected
Check that you used the server-side API key from OmniDimension, not the public widget key. Ensure there are no extra spaces or quotes.

### Agent not found / session cannot be created
Verify the numeric agent ID and that the agent is published/available in the dashboard.

### Insufficient balance or quota
Check the OmniDimension account balance, plan, and concurrency limits.

### Microphone not working
Use Chrome or Edge, allow microphone access, and ensure another application is not exclusively using the microphone. For deployed sites, use HTTPS.

### The assistant speaks the wrong language
Configure Kannada in the OmniDimension agent's language/voice settings and ensure its instructions tell it to start and respond in Kannada. The website itself cannot force an agent's configured language.

### Widget versus custom voice UI
This project uses the OmniDimension **Web SDK** to create a custom in-page voice UI. If you prefer OmniDimension's floating no-code widget, use Deploy → Web Bot Widget in the OmniDimension dashboard and paste its generated public embed snippet into `client/index.html` inside `<body>`. Do not invent the widget key or copy a server API key into the page.

## Build for production

```powershell
npm run build
```

The built frontend is in `client/dist`. Deploy the frontend and backend to HTTPS-capable hosting separately or configure your hosting platform to serve the build and proxy `/api` to the Express server. Set `CLIENT_ORIGIN` to the deployed frontend origin and configure environment variables securely.

## Before integrating into the full ClimateCoins product

- Add authentication and organisation-level access checks.
- Save post-call summaries through a verified OmniDimension webhook.
- Add a database-backed callback queue and FPO assignment workflow.
- Add privacy notice, consent and retention controls.
- Add server-side validation, request logging without secrets, monitoring and deployment secrets.
