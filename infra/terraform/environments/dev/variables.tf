variable "project_name" {
  default = "video-platform"
  type    = string
}

variable "environment" {
  default = "dev"
  type    = string
}

variable "cdn_domain_name" {
  description = "Custom domain for CloudFront CDN"
  type        = string
}