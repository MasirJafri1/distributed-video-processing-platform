resource "aws_acm_certificate" "cdn_cert" {
  domain_name       = var.cdn_domain_name
  validation_method = "DNS"

  tags = {
    Name = "${var.project_name}-${var.environment}-cdn-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}
