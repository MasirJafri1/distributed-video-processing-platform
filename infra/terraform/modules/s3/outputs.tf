output "raw_bucket_name" {
  value = aws_s3_bucket.raw_videos.bucket
}

output "processed_bucket_name" {
  value = aws_s3_bucket.processed_videos.bucket
}

output "processed_bucket_domain_name" {
  value = aws_s3_bucket.processed_videos.bucket_regional_domain_name
}