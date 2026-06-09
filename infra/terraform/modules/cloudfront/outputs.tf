output "distribution_domain_name" {
  value = aws_cloudfront_distribution.video_cdn.domain_name
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.video_cdn.arn
}

output "cloudfront_key_pair_id" {
  value       = aws_cloudfront_public_key.key.id
  description = "CloudFront Key Pair ID for signing cookies (use as CLOUDFRONT_KEY_PAIR_ID env var)"
}
