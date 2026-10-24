import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT || 8787);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ClimateCoins Kannada Voice Assistant API',
    configured: Boolean(process.env.OMNIDIM_API_KEY && process.env.OMNIDIM_AGENT_ID)
  });
});

const sessionSchema = z.object({
  farmerName: z.string().trim().max(80).optional().default(''),
  farmerId: z.string().trim().max(80).optional().default('')
});

app.post('/api/voice/session', async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check the farmer details and try again.' });
  }

  const apiKey = process.env.OMNIDIM_API_KEY;
  const agentIdRaw = process.env.OMNIDIM_AGENT_ID;
  const agentId = Number(agentIdRaw);

  if (!apiKey || !agentIdRaw || !Number.isInteger(agentId) || agentId <= 0) {
    return res.status(503).json({
      error: 'Voice calling is not configured yet. Add OMNIDIM_API_KEY and OMNIDIM_AGENT_ID to server/.env.'
    });
  }

  const { farmerName, farmerId } = parsed.data;

  try {
    const upstream = await fetch('https://omnidim.io/api/v1/sessions/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        type: 'voice',
        custom_variables: {
          farmer_name: farmerName || 'ರೈತರು',
          farmer_id: farmerId || 'not_provided',
          language: 'Kannada',
          assistant_context: 'ClimateCoins farmer support. Speak Kannada by default. Do not invent eligibility, credit issuance, payment, or project status.'
        },
        metadata: {
          source: 'climatecoins_farmer_portal',
          farmer_reference: farmerId || 'not_provided'
        }
      }),
      signal: AbortSignal.timeout(15000)
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('OmniDimension session creation failed:', upstream.status, payload?.detail || payload?.message || 'No provider detail');
      const status = upstream.status === 401 ? 502 : upstream.status === 402 ? 402 : upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: upstream.status === 402
          ? 'The OmniDimension account may need credits or billing setup.'
          : upstream.status === 401
            ? 'OmniDimension rejected the server API key. Check your key in server/.env.'
            : upstream.status === 429
              ? 'The voice service is busy. Please wait a moment and try again.'
              : 'Could not start the voice session. Check the agent ID and OmniDimension dashboard.'
      });
    }

    if (!payload.ws_url) {
      console.error('OmniDimension response did not contain ws_url.');
      return res.status(502).json({ error: 'The voice provider did not return a session URL. Please try again.' });
    }

    // Only the single-session URL is returned. The reusable API key never leaves the server.
    return res.json({ wsUrl: payload.ws_url, sessionId: payload.session_id ?? null });
  } catch (error) {
    console.error('Voice session request failed:', error?.name || 'Error');
    return res.status(502).json({
      error: error?.name === 'TimeoutError'
        ? 'The voice service took too long to respond. Please try again.'
        : 'Could not reach the voice service. Check your internet connection and try again.'
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err?.message || 'Unknown error');
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => {
  console.log(`ClimateCoins voice API running at http://localhost:${port}`);
});
