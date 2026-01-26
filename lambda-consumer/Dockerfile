FROM public.ecr.aws/lambda/python:3.11

# Install Node.js (required for Remotion Lambda SDK internals if it invokes CLI)
RUN yum install -y tar gzip \
    && curl -fsSL https://rpm.nodesource.com/setup_16.x | bash - \
    && yum install -y nodejs \
    && npm install -g remotion @remotion/lambda

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Lambda code
COPY handler.py .

CMD ["handler.lambda_handler"]
