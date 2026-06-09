variable "cdn_domain_name" {
  description = "Custom domain for CloudFront CDN (e.g., video-processing-cdn.masir-projects.me)"
  type        = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}
