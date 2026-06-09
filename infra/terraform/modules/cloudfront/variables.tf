variable "processed_bucket_domain_name" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cloudfront_public_key_pem" {
  type = string
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 for the custom CDN domain"
  type        = string
}

variable "cdn_domain_name" {
  description = "Custom domain for CloudFront (e.g., video-processing-cdn.masir-projects.me)"
  type        = string
  default     = ""
}
