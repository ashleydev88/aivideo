Remotion Renderer (Local Service)

Purpose
- Local HTTP interface for rendering via Remotion using `@remotion/renderer`.

Run
- `cd remotion-renderer && npm ci`
- `PORT=8001 npm start` (default is 8000; set 8001 to avoid backend conflict)

Endpoint
- `POST /render` with JSON: `{ course_id, slide_data, accent_color }`
- Renders MP4 to `remotion-renderer/out/` and returns `{ status, path }`.

Production
- Production rendering happens via Remotion Lambda from the SQS consumer. See `docs/lambda-consumer.md`.
