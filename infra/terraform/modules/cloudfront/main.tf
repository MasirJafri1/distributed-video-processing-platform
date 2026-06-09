resource "aws_cloudfront_origin_access_control" "processed_bucket_oac" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for processed videos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "video_cdn" {
  enabled = true

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

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  price_class = "PriceClass_100"

  tags = {
    Name = "${var.project_name}-${var.environment}-cdn"
  }
}
