import boto3
import json
import os
import asyncio

# Retrieve Queue URL from env or use a default/placeholder
# In production, this should be set in environment variables
QUEUE_URL = os.environ.get("VIDEO_RENDER_QUEUE_URL")

def get_sqs_client():
    return boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "eu-west-2"))

def send_render_job(course_id: str, user_id: str, payload: dict):
    """
    Sends a render job to the SQS queue.
    """
    sqs = get_sqs_client()
    
    # Construct message body
    message_body = {
        "course_id": course_id,
        "user_id": user_id,
        "payload": payload
    }
    
    response = sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(message_body)
    )
    
    return response.get("MessageId")

async def send_render_job_async(course_id: str, user_id: str, payload: dict):
    """
    Async wrapper for sending render job to SQS.
    """
    return await asyncio.to_thread(send_render_job, course_id, user_id, payload)
