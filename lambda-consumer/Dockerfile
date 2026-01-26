FROM public.ecr.aws/lambda/python:3.11

# Install Node.js 16 via Amazon Linux 2 repos (compatible with glibc 2.26)
# Node 16 is the last version compatible with Amazon Linux 2
RUN curl -sL https://rpm.nodesource.com/setup_16.x | bash - && \
    yum install -y nodejs && \
    yum clean all

# Install Remotion CLI globally
# Note: We need to check if Remotion CLI supports Node 16
RUN npm install -g @remotion/cli @remotion/lambda

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Lambda code
COPY handler.py .

CMD ["handler.lambda_handler"]
