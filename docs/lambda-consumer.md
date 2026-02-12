Lambda Consumer (SQS → Remotion Lambda)

Purpose
- Consumes SQS messages and renders via Remotion Lambda, updating Supabase with `video_url`.

Deploy
- Package and deploy to AWS Lambda with appropriate IAM permissions for Lambda/S3/SQS/Supabase network egress.
- Configure environment variables:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `AWS_REGION`
  - `REMOTION_SERVE_URL`, `REMOTION_COMPOSITION_ID`, `REMOTION_FUNCTION_NAME`

Flow
- On SQS message: parse `{course_id, user_id, payload}`
- Start render via Remotion Lambda SDK
- Poll progress; on completion, write `video_url` to `courses` and mark complete.

Troubleshooting
- Use CloudWatch Logs for the consumer and the Remotion Lambda function.
- Ensure timeouts/memory are sufficient (e.g., 3008MB, 900s based on repo defaults).
