Environment Variables

Backend (`backend/.env`)
- ANTHROPIC_API_KEY: Anthropic API key for LLM tasks
- OPENAI_API_KEY: OpenAI API key (optional if used elsewhere)
- REPLICATE_API_TOKEN: Replicate API token (image generation)
- ELEVENLABS_API_KEY: ElevenLabs API key (text-to-speech)
- SUPABASE_URL: Supabase project URL
- SUPABASE_ANON_KEY: Supabase anon key (RLS-protected)
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (admin operations)
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION: AWS creds for SQS and other SDK usage
- REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY / REMOTION_AWS_REGION: AWS creds for Remotion (if used locally)
- VIDEO_RENDER_QUEUE_URL: SQS queue URL for render jobs
- ENABLE_LLM_TELEMETRY: Optional (`true`/`false`, default `true`) to toggle writes to `public.llm_telemetry`

Frontend (`frontend/.env.local`)
- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key
- NEXT_PUBLIC_API_URL: Backend base URL (defaults to http://127.0.0.1:8000 if unset)

Remotion Renderer (`remotion-renderer/.env`)
- REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY / REMOTION_AWS_REGION: AWS creds if integrating with Lambda/S3 flows
- PORT: Optional; set to 8001 to avoid backend conflict

Lambda Consumer (AWS env or `.env` for local testing)
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: Required for DB updates
- AWS_REGION: Default region for AWS SDK
- REMOTION_SERVE_URL: Deployed Remotion site URL
- REMOTION_COMPOSITION_ID: Composition ID to render (default: Main)
- REMOTION_FUNCTION_NAME: Deployed Remotion Lambda function name
