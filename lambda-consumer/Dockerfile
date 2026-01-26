FROM public.ecr.aws/lambda/python:3.12

# Set HOME for npm cache (Lambda filesystem is read-only except /tmp)
ENV HOME=/tmp

# Install Node.js 20 LTS (required for Remotion 4.x which needs glibc 2.31+)
RUN dnf install -y tar gzip \
    && curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - \
    && dnf install -y nodejs \
    && npm install -g remotion@4.0.405 @remotion/cli@4.0.405 @remotion/lambda@4.0.405

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Lambda code
COPY handler.py .

CMD ["handler.lambda_handler"]
