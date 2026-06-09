output "certificate_arn" {
  value       = aws_acm_certificate.cdn_cert.arn
  description = "ARN of the ACM certificate for CloudFront"
}

output "domain_validation_options" {
  value       = aws_acm_certificate.cdn_cert.domain_validation_options
  description = "DNS validation records — add these as CNAME in Namecheap"
}
