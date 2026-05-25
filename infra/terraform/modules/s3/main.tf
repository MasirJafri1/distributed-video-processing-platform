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