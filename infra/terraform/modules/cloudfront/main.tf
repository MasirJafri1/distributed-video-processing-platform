resource "aws_cloudfront_public_key" "key" {
  comment     = "CloudFront key pair for private streaming"
  encoded_key = var.cloudfront_public_key_pem
  name_prefix = "${var.project_name}-${var.environment}-public-key-"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_cloudfront_key_group" "key_group" {
  comment = "Key group for private streaming"
  items   = [aws_cloudfront_public_key.key.id]
  name    = "${var.project_name}-${var.environment}-key-group"
}

resource "aws_cloudfront_origin_access_control" "processed_bucket_oac" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for processed videos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "video_cdn" {
  enabled = true
  aliases = var.cdn_domain_name != "" ? [var.cdn_domain_name] : []

  origin {
    domain_name              = var.processed_bucket_domain_name
    origin_id                = "processed-videos-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.processed_bucket_oac.id
  }

  default_cache_behavior {
    allowed_methods = [
      "GET",
      "HEAD"
    ]
    cached_methods = [
      "GET",
      "HEAD"
    ]
    target_origin_id       = "processed-videos-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    trusted_key_groups     = [aws_cloudfront_key_group.key_group.id]

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward           = "whitelist"
        whitelisted_names = ["CloudFront-Policy", "CloudFront-Signature", "CloudFront-Key-Pair-Id"]
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  price_class = "PriceClass_100"

  tags = {
    Name = "${var.project_name}-${var.environment}-cdn"
  }
}
