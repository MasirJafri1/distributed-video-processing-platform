output "distribution_domain_name" {
  value = aws_cloudfront_distribution.video_cdn.domain_name
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.video_cdn.arn
}
