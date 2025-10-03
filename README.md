# Vorlesen

Text-to-speech tool for authors to proofread their work by listening back. Powered by Google Cloud Text-to-Speech.

## Features

- 🎯 Paste unlimited text (automatically chunked into 4000 char segments)
- 🎙️ 3 high-quality voices (WaveNet & Neural2)
- 🎵 Adjustable playback speed (0.5x - 2x)
- 💾 Browser localStorage persistence
- ⚡ Progress tracking with retry logic
- 📥 Download as MP3

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Cloud TTS

You need Google Cloud Text-to-Speech API credentials. Choose **ONE** option:

#### Option A: API Key (Simplest)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Text-to-Speech API
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → API Key**
5. Restrict to Text-to-Speech API only
6. Create `.env.local`:
   ```bash
   GOOGLE_CLOUD_TTS_API_KEY=your_api_key_here
   ```

#### Option B: Service Account (Local Development)
1. Download service account JSON from Google Cloud Console
2. Create `.env.local`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

#### Option C: Service Account (Vercel Deployment)
1. Copy entire contents of `service-account.json`
2. In Vercel: **Project Settings → Environment Variables**
3. Add variable:
   ```
   Name: GOOGLE_CLOUD_SERVICE_ACCOUNT
   Value: {"type":"service_account","project_id":"...",...}
   ```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/telliott22/Vorlesen)

1. Click "Deploy" button above
2. Add environment variable: `GOOGLE_CLOUD_SERVICE_ACCOUNT` with your service account JSON
3. Deploy!

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: ShadCN UI + Tailwind CSS
- **TTS**: Google Cloud Text-to-Speech API
- **Audio**: Web Audio API + lamejs for MP3 encoding
- **Storage**: Browser localStorage (5MB with LRU eviction)

## Architecture

- **Text Chunking**: Splits text at sentence boundaries (4000 char max)
- **Parallel Processing**: Converts chunks concurrently with progress tracking
- **Audio Stitching**: Decodes MP3 → concatenates PCM → re-encodes MP3
- **Error Handling**: Exponential backoff for rate limits, retry failed chunks
- **Cost**: $0.004 per 1K characters (75x cheaper than ElevenLabs)

## Development

```bash
# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

## License

MIT
