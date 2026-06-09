resource "aws_s3_bucket" "raw_videos" {
  bucket = "${var.project_name}-${var.environment}-masir-raw-videos"
}

resource "aws_s3_bucket" "processed_videos" {
  bucket = "${var.project_name}-${var.environment}-masir-processed-videos"
}

resource "aws_s3_bucket" "thumbnails" {
  bucket = "${var.project_name}-${var.environment}-masir-thumbnails"
}

resource "aws_s3_bucket_versioning" "raw_versioning" {
  bucket = aws_s3_bucket.raw_videos.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "processed_versioning" {
  bucket = aws_s3_bucket.processed_videos.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_lifecycle" {
  bucket = aws_s3_bucket.raw_videos.id

  rule {
    id     = "delete-old-videos"
    status = "Enabled"

    filter {}

    expiration {
      days = 7
    }
  }
}

resource "aws_s3_bucket_notification" "raw_upload_events" {

  bucket = aws_s3_bucket.raw_videos.id

  queue {

    queue_arn = var.video_queue_arn

    events = [
      "s3:ObjectCreated:*"
    ]

    filter_prefix = "raw/"
  }
}

resource "aws_s3_bucket_public_access_block" "processed_public_access" {
  bucket = aws_s3_bucket.processed_videos.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "processed_public_policy" {
  bucket = aws_s3_bucket.processed_videos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.processed_videos.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.processed_public_access]
}

resource "aws_s3_bucket_cors_configuration" "processed_cors" {
  bucket = aws_s3_bucket.processed_videos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}